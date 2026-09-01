import { Op } from 'sequelize';
import { resolve } from 'path';
import { getReelModel } from '../models/Reel.model.js';
import { getFacebookPageModel } from '../models/FacebookPage.model.js';
import { getPublishLogModel } from '../models/PublishLog.model.js';
import * as pagesSvc from './pages.service.js';
import * as facebookSvc from './facebook.service.js';
import * as instagramSvc from './instagram.service.js';
import * as tiktokSvc from './tiktok.service.js';
import * as youtubeSvc from './youtube.service.js';
import * as uploadSvc from './upload.service.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type {
    CreateReelRequest,
    UpdateReelRequest,
    ReelQueryParams,
    ReelStatus,
} from '../../shared/types.js';
import { FacebookApiError } from '../utils/errors.js';
import { sequelize } from '../config/database.js';

const getPageInclude = () => [
    {
        model: getFacebookPageModel(),
        as: 'page',
        attributes: ['id', 'name', 'avatarUrl', 'avatar_url', 'fbPageId', 'fb_page_id'],
    },
];

export function buildFacebookPostUrl(pageFbId: string | undefined | null, postId: string | undefined | null): string | null {
    const cleanPageId = String(pageFbId ?? '').trim();
    const cleanPostId = String(postId ?? '').trim();
    if (!cleanPostId) return null;
    return `https://www.facebook.com/reel/${cleanPostId}`;
}

export function enrichReelWithUrls(reel: any): any {
    if (!reel) return reel;
    const obj = reel?.toJSON ? reel.toJSON() : { ...reel };
    const pageFbId = obj.page?.fbPageId ?? obj.page?.fb_page_id ?? obj.pageFbId ?? obj.fb_page_id;
    const postId = obj.facebookPostId ?? obj.facebook_post_id;
    obj.facebookPostUrl = buildFacebookPostUrl(pageFbId, postId);
    if (obj.page) {
        const p = obj.page.toJSON ? obj.page.toJSON() : { ...obj.page };
        const pageId = p.fbPageId ?? p.fb_page_id;
        if (pageId) {
            p.facebookPageUrl = `https://www.facebook.com/${pageId}`;
        }
        obj.page = p;
    }
    return obj;
}

export function enrichReelsList(payload: any): any {
    if (!payload || !Array.isArray(payload.reels)) return payload;
    return {
        ...payload,
        reels: payload.reels.map(enrichReelWithUrls),
    };
}

const canTransitionToUploading = (status: ReelStatus): boolean =>
    status === 'draft' ||
    status === 'scheduled' ||
    status === 'uploading' ||
    status === 'failed' ||
    status === 'published';

export const findByQuery = async (userId: number, params: ReelQueryParams) => {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    const where: Record<string, any> = { userId };

    if (params.status && params.status !== 'all') {
        where.status = params.status;
    }
    if (params.pageId) {
        where.pageId = params.pageId;
    }
    if (params.from || params.to) {
        const between: any = {};
        if (params.from) between[Op.gte] = new Date(params.from);
        if (params.to) between[Op.lte] = new Date(params.to);
        where.scheduledAt = between;
    }

    const { rows, count } = await getReelModel().findAndCountAll({
        where,
        include: getPageInclude() as any,
        offset,
        limit,
        order: [
            ['scheduledAt', 'DESC'],
            ['createdAt', 'DESC'],
        ],
    });

    return enrichReelsList({
        reels: rows,
        total: count,
        page,
        limit,
    });
};

export const getById = async (userId: number, id: number) => {
    const reel = await getReelModel().findOne({
        where: { id, userId },
        include: getPageInclude() as any,
    });

    if (!reel) {
        throw new NotFoundError('Reel not found');
    }

    return enrichReelWithUrls(reel);
};

export const create = async (
    userId: number,
    data: CreateReelRequest,
    videoFile?: Express.Multer.File
) => {
    const page = await pagesSvc.getPageForUser(userId, data.pageId);
    if (!page) {
        throw new NotFoundError('Page not found');
    }

    const status: ReelStatus = data.scheduledAt ? 'scheduled' : 'draft';

    if (data.videoSource === 'url') {
        if (!data.videoUrl || !data.videoUrl.startsWith('http')) {
            throw new BadRequestError('videoUrl must be a valid http(s) URL when videoSource is "url"');
        }
    } else if (data.videoSource === 'upload') {
        if (!videoFile) {
            throw new BadRequestError('video file is required when videoSource is "upload"');
        }
    }

    let videoFilePath: string | null = null;
    if (data.videoSource === 'upload' && videoFile) {
        videoFilePath = videoFile.path;
    }

    const createPayload: Record<string, any> = {
        userId,
        pageId: data.pageId,
        title: data.title,
        caption: data.caption ?? null,
        hashtags: data.hashtags ?? [],
        videoSource: data.videoSource,
        videoUrl: data.videoSource === 'url' ? data.videoUrl! : null,
        videoFilePath,
        targetPlatforms: data.targetPlatforms ?? ['facebook'],
        status,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        retryCount: 0,
    };

    const reel = await getReelModel().create(createPayload as any);

    const created = await getReelModel().findOne({
        where: { id: (reel as any).id, userId },
        include: getPageInclude() as any,
    });
    return enrichReelWithUrls(created);
};

export const update = async (
    userId: number,
    id: number,
    data: UpdateReelRequest,
    videoFile?: Express.Multer.File
) => {
    const reel = await getReelModel().findOne({ where: { id, userId } });
    if (!reel) {
        throw new NotFoundError('Reel not found');
    }

    const reelData = reel as any;
    if (reelData.status === 'published') {
        throw new BadRequestError('Cannot update a reel that is already published');
    }

    if (data.pageId !== undefined) {
        const page = await pagesSvc.getPageForUser(userId, data.pageId);
        if (!page) throw new NotFoundError('Page not found');
        reelData.pageId = data.pageId;
    }
    if (data.title !== undefined) reelData.title = data.title;
    if (data.caption !== undefined) reelData.caption = data.caption ?? null;
    if (data.hashtags !== undefined) reelData.hashtags = data.hashtags;
    if (data.videoSource !== undefined) {
        if (data.videoSource === 'url') {
            if (!data.videoUrl || !data.videoUrl.startsWith('http')) {
                throw new BadRequestError('videoUrl must be a valid http(s) URL');
            }
            if (reelData.videoFilePath) {
                await uploadSvc.deleteFileIfExists(reelData.videoFilePath);
                reelData.videoFilePath = null;
            }
            reelData.videoSource = data.videoSource;
            reelData.videoUrl = data.videoUrl;
        } else if (data.videoSource === 'upload') {
            if (!videoFile) {
                throw new BadRequestError('video file is required when switching to upload source');
            }
            if (reelData.videoFilePath) {
                await uploadSvc.deleteFileIfExists(reelData.videoFilePath);
            }
            reelData.videoSource = data.videoSource;
            reelData.videoUrl = null;
            reelData.videoFilePath = videoFile.path;
        }
    } else if (videoFile) {
        if (reelData.videoFilePath) {
            await uploadSvc.deleteFileIfExists(reelData.videoFilePath);
        }
        reelData.videoFilePath = videoFile.path;
        reelData.videoSource = 'upload';
        reelData.videoUrl = null;
    } else if (data.videoUrl !== undefined && reelData.videoSource === 'url') {
        reelData.videoUrl = data.videoUrl;
    }

    if (data.scheduledAt !== undefined) {
        if (data.scheduledAt) {
            reelData.scheduledAt = new Date(data.scheduledAt);
            if (reelData.status === 'draft' || reelData.status === 'failed') {
                reelData.status = 'scheduled';
            }
        } else {
            reelData.scheduledAt = null;
            if (reelData.status === 'scheduled') {
                reelData.status = 'draft';
            }
        }
    }

    if (data.status !== undefined) {
        reelData.status = data.status;
    }

    await reelData.save();

    const updated = await getReelModel().findOne({
        where: { id, userId },
        include: getPageInclude() as any,
    });
    return enrichReelWithUrls(updated);
};

export const remove = async (userId: number, id: number): Promise<void> => {
    const reel = await getReelModel().findOne({ where: { id, userId } });
    if (!reel) {
        throw new NotFoundError('Reel not found');
    }

    const reelData = reel as any;
    if (reelData.videoFilePath) {
        await uploadSvc.deleteFileIfExists(reelData.videoFilePath);
    }

    await reel.destroy();
};

export const publishNow = async (userId: number, id: number) => {
    const reel = await getReelModel().findOne({
        where: { id, userId },
    });

    if (!reel) {
        throw new NotFoundError('Reel not found');
    }

    const reelData = reel as any;

    if (!canTransitionToUploading(reelData.status)) {
        throw new BadRequestError(
            `Cannot publish reel with status "${reelData.status}". Only draft, scheduled, uploading, or failed reels can be published.`
        );
    }

    const previousAttempt = reelData.retryCount ?? 0;
    reelData.status = 'uploading';
    reelData.errorMessage = null;
    await reelData.save();

    const page = await pagesSvc.getPageForUser(userId, reelData.pageId);
    if (!page || !page.accessToken) {
        reelData.status = 'failed';
        reelData.errorMessage = 'Connected page or access token not found';
        await reelData.save();
        throw new BadRequestError('Connected page or access token not found');
    }

    let publishResult: { success: boolean; postId: string } | null = null;
    let publishError: Error | null = null;
    let responseCode: number | null = null;
    let errorMessage: string | null = null;
    const platformPostIds: Record<string, string> = {};

    const platforms: string[] = Array.isArray(reelData.targetPlatforms) && reelData.targetPlatforms.length > 0
        ? reelData.targetPlatforms
        : ['facebook'];

    try {
        if (platforms.includes('facebook')) {
            publishResult = await facebookSvc.publishReelToFacebook(
                { fbPageId: page.fbPageId, accessToken: page.accessToken },
                {
                    title: reelData.title,
                    caption: reelData.caption,
                    hashtags: reelData.hashtags,
                    videoSource: reelData.videoSource,
                    videoUrl: reelData.videoUrl,
                    videoFilePath: reelData.videoFilePath,
                }
            );
            if (publishResult?.postId) {
                platformPostIds.facebook = publishResult.postId;
            }
        }

        if (platforms.includes('instagram') && (reelData.videoUrl || reelData.facebookPostId)) {
            try {
                const igRes = await instagramSvc.publishReelToInstagram(
                    { fbPageId: page.fbPageId, accessToken: page.accessToken },
                    {
                        title: reelData.title,
                        caption: reelData.caption,
                        hashtags: reelData.hashtags,
                        videoUrl: reelData.videoUrl || '',
                    }
                );
                if (igRes?.igMediaId) {
                    platformPostIds.instagram = igRes.igMediaId;
                }
            } catch (igErr: any) {
                logger.warn(`[Reels] Instagram cross-post warning: ${igErr?.message}`);
            }
        }

        if (platforms.includes('tiktok') && reelData.videoUrl) {
            try {
                const ttRes = await tiktokSvc.publishReelToTikTok({
                    title: reelData.title,
                    caption: reelData.caption,
                    hashtags: reelData.hashtags,
                    videoUrl: reelData.videoUrl,
                });
                if (ttRes?.tiktokPostId) {
                    platformPostIds.tiktok = ttRes.tiktokPostId;
                }
            } catch (ttErr: any) {
                logger.warn(`[Reels] TikTok cross-post warning: ${ttErr?.message}`);
            }
        }

        if (platforms.includes('youtube')) {
            try {
                const ytRes = await youtubeSvc.publishReelToYouTubeShorts({
                    title: reelData.title,
                    caption: reelData.caption,
                    hashtags: reelData.hashtags,
                    videoUrl: reelData.videoUrl,
                    videoFilePath: reelData.videoFilePath,
                });
                if (ytRes?.youtubeVideoId) {
                    platformPostIds.youtube = ytRes.youtubeVideoId;
                }
            } catch (ytErr: any) {
                logger.warn(`[Reels] YouTube Shorts cross-post warning: ${ytErr?.message}`);
            }
        }
    } catch (err: any) {
        publishError = err;
        errorMessage = err?.message ?? 'Unknown publishing error';
        if (err instanceof FacebookApiError) {
            responseCode = err.fbResponseCode ?? null;
        } else if (err?.response?.status) {
            responseCode = err.response.status;
        }
    }

    const attempt = previousAttempt + 1;

    if (publishResult || Object.keys(platformPostIds).length > 0) {
        reelData.status = 'published';
        reelData.publishedAt = new Date();
        reelData.facebookPostId = publishResult?.postId || platformPostIds.facebook || null;
        reelData.platformPostIds = platformPostIds;
        reelData.errorMessage = null;
    } else {
        reelData.status = 'failed';
        reelData.errorMessage = errorMessage;
        reelData.retryCount = attempt;
    }
    await reelData.save();

    await getPublishLogModel().create(
        {
            reelId: id,
            attempt,
            status: (publishResult || Object.keys(platformPostIds).length > 0) ? 'published' : 'failed',
            responseCode,
            error: errorMessage,
        } as any
    );

    const after = await getReelModel().findOne({
        where: { id, userId },
        include: getPageInclude() as any,
    });
    return enrichReelWithUrls(after);
};

export const retry = async (userId: number, id: number) => {
    const reel = await getReelModel().findOne({
        where: { id, userId, status: 'failed' },
    });

    if (!reel) {
        throw new NotFoundError('Failed reel not found');
    }

    const reelData = reel as any;
    reelData.status = 'scheduled';
    reelData.scheduledAt = new Date();
    reelData.errorMessage = null;
    await reelData.save();

    const afterRetry = await getReelModel().findOne({
        where: { id, userId },
        include: getPageInclude() as any,
    });
    return enrichReelWithUrls(afterRetry);
};

export const processDueReels = async (): Promise<void> => {
    // Recover any reels stuck in 'uploading' for more than 4 minutes
    const staleThreshold = new Date(Date.now() - 4 * 60 * 1000);
    try {
        const staleReels = await getReelModel().findAll({
            where: {
                status: 'uploading',
                updatedAt: { [Op.lte]: staleThreshold },
            },
        });
        for (const stale of staleReels) {
            const sr = stale as any;
            sr.status = 'failed';
            sr.errorMessage = 'Publishing timed out or was interrupted. Please retry.';
            await sr.save();
            logger.warn(`Scheduler recovered stuck uploading reel id=${sr.id}`);
        }
    } catch (staleErr: any) {
        logger.warn(`Scheduler stale reel cleanup error: ${staleErr?.message}`);
    }

    const bufferMs = 5 * 60 * 1000;
    const threshold = new Date(Date.now() + bufferMs);

    const dueReels = await getReelModel().findAll({
        where: {
            status: 'scheduled',
            scheduledAt: { [Op.lte]: threshold },
        },
        limit: 20,
        order: [['scheduledAt', 'ASC']],
    });

    logger.info(`Scheduler found ${dueReels.length} due reels to process`);

    for (const reel of dueReels) {
        const reelData = reel as any;
        try {
            await publishNow(reelData.userId, reelData.id);
        } catch (err: any) {
            logger.error(
                `Scheduler: failed to publish reel id=${reelData.id} user=${reelData.userId}: ${err?.message ?? err}`
            );
        }
    }
};

export default {
    findByQuery,
    getById,
    create,
    update,
    remove,
    publishNow,
    retry,
    processDueReels,
};

