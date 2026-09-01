import { Op } from 'sequelize';
import { getReelModel } from '../models/Reel.model.js';
import { getFacebookPageModel } from '../models/FacebookPage.model.js';
import * as aiSvc from './ai.service.js';
import * as peakTimeSvc from './peakTime.service.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { ReelStatus, VideoSource, TargetPlatform } from '../../shared/types.js';

export interface RecyclableReel {
    id: number;
    title: string;
    caption: string | null;
    hashtags: string[];
    videoSource: VideoSource;
    videoUrl: string | null;
    videoFilePath: string | null;
    publishedAt: Date | null;
    pageName: string;
    pageId: number;
    daysAgo: number;
}

export interface RecycleOptions {
    customTitle?: string;
    scheduledAt?: Date | string;
    targetPlatforms?: TargetPlatform[];
    spinCaptionWithAi?: boolean;
}

/**
 * Scan user's published reels to find evergreen content candidates ready for recycling
 */
export const findRecyclableReels = async (userId: number): Promise<RecyclableReel[]> => {
    const ReelModel = getReelModel();
    const PageModel = getFacebookPageModel();

    // Fetch published reels older than 7 days
    const minAgeDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const publishedReels = await ReelModel.findAll({
        where: {
            userId,
            status: 'published',
            publishedAt: {
                [Op.lte]: minAgeDate,
            },
        },
        include: [
            {
                model: PageModel,
                as: 'page',
                attributes: ['id', 'name'],
            },
        ],
        order: [['publishedAt', 'ASC']],
        limit: 20,
    });

    return publishedReels.map((reel: any) => {
        const publishedDate = reel.publishedAt ? new Date(reel.publishedAt) : new Date();
        const daysAgo = Math.floor((Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
            id: reel.id,
            title: reel.title,
            caption: reel.caption,
            hashtags: Array.isArray(reel.hashtags) ? reel.hashtags : [],
            videoSource: reel.videoSource,
            videoUrl: reel.videoUrl,
            videoFilePath: reel.videoFilePath,
            publishedAt: reel.publishedAt,
            pageName: reel.page?.name || 'Connected Page',
            pageId: reel.pageId,
            daysAgo,
        };
    });
};

/**
 * Recycle a published reel: creates a scheduled clone with AI caption spin and optimal peak slotting
 */
export const recycleReel = async (
    userId: number,
    reelId: number,
    options: RecycleOptions = {}
) => {
    const ReelModel = getReelModel();

    const originalReel = await ReelModel.findOne({
        where: { id: reelId, userId },
    });

    if (!originalReel) {
        throw new NotFoundError('Reel not found for recycling');
    }

    const origData = originalReel as any;

    let spunTitle = options.customTitle || origData.title;
    let spunCaption = origData.caption || '';
    let spunHashtags: string[] = Array.isArray(origData.hashtags) ? origData.hashtags : ['viral', 'reels', 'trending'];

    // 1. If AI spin is enabled, generate fresh viral hook & caption
    if (options.spinCaptionWithAi !== false) {
        try {
            const aiContent = await aiSvc.generateReelContent(origData.title || 'Viral Reel');
            spunTitle = aiContent.title || origData.title;
            spunCaption = `${aiContent.caption}\n\n♻️ Recycled Evergreen Favorite`;
            spunHashtags = Array.from(new Set([...aiContent.hashtags, ...spunHashtags]));
        } catch (err: any) {
            logger.warn(`[Recycling] AI caption spin failed, keeping original: ${err?.message}`);
        }
    }

    // 2. Determine scheduled date/time (use peak time slot if none provided)
    let scheduleDate: Date;
    if (options.scheduledAt) {
        scheduleDate = new Date(options.scheduledAt);
    } else {
        const peakSlots = await peakTimeSvc.calculatePeakTimeSlots();
        const bestSlotStr = peakSlots.bestNextSlot.datetime;
        scheduleDate = new Date(bestSlotStr);
    }

    const status: ReelStatus = 'scheduled';

    const newReel = await ReelModel.create({
        userId,
        pageId: origData.pageId,
        title: spunTitle,
        caption: spunCaption,
        hashtags: spunHashtags,
        videoSource: origData.videoSource,
        videoUrl: origData.videoUrl,
        videoFilePath: origData.videoFilePath,
        targetPlatforms: options.targetPlatforms || origData.targetPlatforms || ['facebook', 'instagram'],
        status,
        scheduledAt: scheduleDate,
        retryCount: 0,
    } as any);

    logger.info(`[Recycling] Successfully recycled Reel #${reelId} into new Reel #${(newReel as any).id} scheduled at ${scheduleDate.toISOString()}`);

    return newReel.toJSON();
};

export default {
    findRecyclableReels,
    recycleReel,
};
