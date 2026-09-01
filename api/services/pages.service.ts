import axios from 'axios';
import { getFacebookPageModel } from '../models/FacebookPage.model.js';
import { getReelModel } from '../models/Reel.model.js';
import { getPublishLogModel } from '../models/PublishLog.model.js';
import { sequelize } from '../config/database.js';
import { config } from '../config/index.js';
import { encryptAes, decryptAes } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';
import { NotFoundError } from '../utils/errors.js';
import type { FacebookPage } from '../../shared/types.js';

const stripEncrypted = (page: any): Omit<FacebookPage, 'accessTokenEnc'> => {
    const json = page.toJSON ? page.toJSON() : { ...page };
    delete json.accessTokenEnc;
    delete json.access_token_enc;
    return json;
};

const decryptPage = (page: any): FacebookPage => {
    const json = stripEncrypted(page);
    const raw = page.toJSON ? page.toJSON() : { ...page };
    const enc = raw.accessTokenEnc || raw.access_token_enc;
    if (enc) {
        try {
            (json as any).accessToken = decryptAes(enc, config.ENCRYPTION_KEY);
        } catch (_err) {
            (json as any).accessToken = null;
        }
    }
    return json as FacebookPage;
};

const publicPageFromPage = (page: FacebookPage): FacebookPage => {
    const json: any = { ...(page as any) };
    delete json.accessToken;
    delete json.access_token;
    return json as FacebookPage;
};

export const listPages = async (userId: number): Promise<FacebookPage[]> => {
    const pages = await getFacebookPageModel().findAll({
        where: { userId },
        order: [['connectedAt', 'DESC'], ['createdAt', 'DESC']],
    });

    return pages.map((p) => publicPageFromPage(decryptPage(p)));
};

export const disconnectPage = async (userId: number, pageId: number): Promise<void> => {
    const page = await getFacebookPageModel().findOne({ where: { id: pageId, userId } });
    if (!page) {
        throw new NotFoundError('Page not found');
    }

    // SQLite enforces FK constraints per-connection and does not honour
    // Sequelize's CASCADE hooks reliably. Use raw SQL with FK checks
    // temporarily disabled so we can delete child rows in order, then
    // delete the parent page — all atomically.
    await sequelize.query('PRAGMA foreign_keys = OFF');
    try {
        await sequelize.transaction(async (tx) => {
            // 1. Delete publish_logs for all reels on this page
            await sequelize.query(
                `DELETE FROM publish_logs WHERE reel_id IN (SELECT id FROM reels WHERE page_id = ?)`,
                { replacements: [pageId], transaction: tx }
            );
            // 2. Delete reels on this page
            await sequelize.query(
                `DELETE FROM reels WHERE page_id = ?`,
                { replacements: [pageId], transaction: tx }
            );
            // 3. Delete the page itself
            await sequelize.query(
                `DELETE FROM facebook_pages WHERE id = ? AND user_id = ?`,
                { replacements: [pageId, userId], transaction: tx }
            );
        });
    } finally {
        await sequelize.query('PRAGMA foreign_keys = ON');
    }
};

export const bulkDisconnectPages = async (userId: number, pageIds: number[]): Promise<number> => {
    if (!pageIds || pageIds.length === 0) return 0;

    await sequelize.query('PRAGMA foreign_keys = OFF');
    try {
        await sequelize.transaction(async (tx) => {
            const placeholders = pageIds.map(() => '?').join(',');
            // 1. Delete publish_logs for all reels on these pages
            await sequelize.query(
                `DELETE FROM publish_logs WHERE reel_id IN (SELECT id FROM reels WHERE page_id IN (${placeholders}))`,
                { replacements: pageIds, transaction: tx }
            );
            // 2. Delete reels on these pages
            await sequelize.query(
                `DELETE FROM reels WHERE page_id IN (${placeholders})`,
                { replacements: pageIds, transaction: tx }
            );
            // 3. Delete the pages themselves
            await sequelize.query(
                `DELETE FROM facebook_pages WHERE id IN (${placeholders}) AND user_id = ?`,
                { replacements: [...pageIds, userId], transaction: tx }
            );
        });
        return pageIds.length;
    } finally {
        await sequelize.query('PRAGMA foreign_keys = ON');
    }
};

export const getPageForUser = async (
    userId: number,
    pageId: number
): Promise<FacebookPage> => {
    const page = await getFacebookPageModel().findOne({
        where: { id: pageId, userId },
    });

    if (!page) {
        throw new NotFoundError('Page not found');
    }

    return decryptPage(page);
};

export interface UpsertPageInput {
    fbPageId: string;
    name: string;
    avatarUrl?: string;
    accessToken: string;
    permissions: string[];
    tokenExpiresAt?: Date;
}

export const upsertFacebookPagesForUser = async (
    userId: number,
    pages: UpsertPageInput[]
): Promise<FacebookPage[]> => {
    const FacebookPageModel = getFacebookPageModel();
    const result: FacebookPage[] = [];

    for (const page of pages) {
        const enc = encryptAes(page.accessToken, config.ENCRYPTION_KEY);
        const [savedInstance] = await FacebookPageModel.sequelize!.transaction(async (tx) => {
            const existing = await FacebookPageModel.findOne({
                where: { fbPageId: page.fbPageId },
                transaction: tx,
                lock: tx.LOCK?.UPDATE,
            });

            if (existing && (existing as any).userId !== userId) {
                await existing.destroy({ transaction: tx });
            }

            const [inst] = await FacebookPageModel.findOrCreate({
                where: { fbPageId: page.fbPageId, userId },
                defaults: {
                    userId,
                    fbPageId: page.fbPageId,
                    name: page.name,
                    avatarUrl: page.avatarUrl,
                    accessTokenEnc: enc,
                    permissions: page.permissions,
                    tokenExpiresAt: page.tokenExpiresAt,
                    connectedAt: new Date(),
                },
                transaction: tx,
            });

            (inst as any).userId = userId;
            (inst as any).name = page.name;
            (inst as any).avatarUrl = page.avatarUrl ?? (inst as any).avatarUrl;
            (inst as any).accessTokenEnc = enc;
            (inst as any).permissions = page.permissions;
            if (page.tokenExpiresAt) {
                (inst as any).tokenExpiresAt = page.tokenExpiresAt;
            }
            (inst as any).connectedAt = new Date();
            const saved = await inst.save({ transaction: tx });
            return [saved];
        });

        result.push(decryptPage(savedInstance));
    }

    return result;
};

import * as facebookService from './facebook.service.js';
import type { FacebookFetchedReel } from './facebook.service.js';

export const connectManualPage = async (
    userId: number,
    fbPageId: string,
    accessToken: string,
    customName?: string
): Promise<FacebookPage> => {
    let pageName = customName || 'Facebook Page';
    let avatarUrl: string | undefined = undefined;

    // Verify token & fetch real name/avatar from Graph API
    try {
        const res = await axios.get(`https://graph.facebook.com/v19.0/${fbPageId.trim()}`, {
            params: {
                fields: 'id,name,picture{url}',
                access_token: accessToken.trim(),
            },
            timeout: 15000,
        });
        if (res.data?.name) {
            pageName = res.data.name;
        }
        avatarUrl = res.data?.picture?.data?.url;
    } catch (err: any) {
        const fbMsg = err?.response?.data?.error?.message ?? err?.message;
        logger.warn(`[Pages] Could not verify page token from Graph API (${fbMsg}) — saving with provided details`);
    }

    const [page] = await upsertFacebookPagesForUser(userId, [
        {
            fbPageId: fbPageId.trim(),
            name: pageName,
            avatarUrl,
            accessToken: accessToken.trim(),
            permissions: ['CREATE_CONTENT', 'MANAGE', 'MESSAGING', 'MODERATE', 'PAGES_MANAGE_POSTS'],
        },
    ]);

    return page;
};

/**
 * Fetch N reels / videos from a user's connected Facebook Page.
 */
export const fetchPageReels = async (
    userId: number,
    pageId: number,
    limit: number = 10
): Promise<{ page: FacebookPage; reels: FacebookFetchedReel[] }> => {
    const pageModel = await getFacebookPageModel().findOne({ where: { id: pageId, userId } });
    if (!pageModel) {
        throw new NotFoundError('Page not found');
    }

    const raw: any = pageModel.toJSON ? pageModel.toJSON() : pageModel;
    const enc = raw.accessTokenEnc || raw.access_token_enc;
    if (!enc) {
        throw new Error('Access token not found for this page. Please reconnect the page.');
    }

    const pageAccessToken = decryptAes(enc, config.ENCRYPTION_KEY);
    const reels = await facebookService.fetchPageReels(pageModel.fbPageId, pageAccessToken, limit);

    return {
        page: publicPageFromPage(decryptPage(pageModel)),
        reels,
    };
};

/**
 * Import a fetched Facebook Reel/Video as a draft Reel inside ReelPilot.
 */
export const importPageReel = async (
    userId: number,
    pageId: number,
    data: {
        title: string;
        description?: string;
        videoUrl?: string;
        thumbnailUrl?: string;
        facebookPostId?: string;
        permalinkUrl?: string;
    }
) => {
    const pageModel = await getFacebookPageModel().findOne({ where: { id: pageId, userId } });
    if (!pageModel) {
        throw new NotFoundError('Page not found');
    }

    const Reel = getReelModel();
    const reel = await Reel.create({
        userId,
        pageId,
        title: data.title || 'Imported Facebook Reel',
        caption: data.description || null,
        videoSource: data.videoUrl ? 'url' : 'url',
        videoUrl: data.videoUrl || null,
        thumbnailUrl: data.thumbnailUrl || null,
        facebookPostId: data.facebookPostId || null,
        status: 'draft',
        hashtags: [],
    });

    return reel;
};


export default {
    listPages,
    disconnectPage,
    getPageForUser,
    upsertFacebookPagesForUser,
    connectManualPage,
    fetchPageReels,
    importPageReel,
};


