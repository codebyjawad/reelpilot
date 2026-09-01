import axios from 'axios';
import { getReelModel } from '../models/Reel.model.js';
import { getFacebookPageModel } from '../models/FacebookPage.model.js';
import { decryptAes } from '../utils/encryption.js';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

export interface ReelInsights {
    reelId: number;
    title: string;
    views: number;
    reach: number;
    likes: number;
    shares: number;
    facebookPostUrl?: string | null;
    publishedAt?: Date | null;
}

export interface AnalyticsStats {
    totalViews: number;
    totalReach: number;
    totalLikes: number;
    totalShares: number;
    viralScore: number;
    publishedCount: number;
    platformBreakdown: {
        facebook: number;
        instagram: number;
        tiktok: number;
    };
    topReels: ReelInsights[];
}

/**
 * Fetch insights from Meta Graph API for a given Facebook Reel / Video ID
 */
export const fetchFacebookReelInsights = async (
    fbPostId: string,
    accessToken: string
): Promise<{ views: number; reach: number; likes: number }> => {
    let views = 0;
    let reach = 0;
    let likes = 0;

    // 1. Query Meta Graph API Video Object
    try {
        const res = await axios.get(`https://graph.facebook.com/v20.0/${fbPostId}`, {
            params: {
                fields: 'views,likes.summary(true).limit(0),comments.summary(true).limit(0)',
                access_token: accessToken,
            },
        });
        if (typeof res.data?.views === 'number') {
            views = res.data.views;
        }
        if (typeof res.data?.likes?.summary?.total_count === 'number') {
            likes = res.data.likes.summary.total_count;
        }
    } catch (err: any) {
        logger.warn(`[Analytics] Graph API video query for ${fbPostId}: ${err?.response?.data?.error?.message || err?.message}`);
    }

    // 2. Query Meta Graph API Video Insights Edge
    try {
        const insightsRes = await axios.get(`https://graph.facebook.com/v20.0/${fbPostId}/video_insights`, {
            params: {
                metric: 'blue_reels_play_count,fb_reels_total_plays,post_impressions_unique',
                access_token: accessToken,
            },
        });
        const items = insightsRes.data?.data;
        if (Array.isArray(items)) {
            for (const item of items) {
                const val = item?.values?.[0]?.value;
                if (typeof val === 'number') {
                    if (item.name === 'blue_reels_play_count' || item.name === 'fb_reels_total_plays') {
                        if (val > views) views = val;
                    }
                    if (item.name === 'post_impressions_unique' && val > reach) {
                        reach = val;
                    }
                }
            }
        }
    } catch (_err) {}

    reach = Math.max(reach, views);

    return { views, reach, likes };
};

/**
 * Generate full analytics stats for a given user
 */
export const getUserAnalytics = async (userId: number): Promise<AnalyticsStats> => {
    const ReelModel = getReelModel();
    const PageModel = getFacebookPageModel();

    const publishedReels = await ReelModel.findAll({
        where: { userId, status: 'published' },
        include: [{ model: PageModel, as: 'page' }],
        order: [['publishedAt', 'DESC']],
        limit: 50,
    });

    let totalViews = 0;
    let totalReach = 0;
    let totalLikes = 0;
    let totalShares = 0;

    const platformBreakdown = {
        facebook: 0,
        instagram: 0,
        tiktok: 0,
    };

    const topReels: ReelInsights[] = [];

    for (const reel of publishedReels) {
        const r = reel as any;
        const targetPlatforms: string[] = r.targetPlatforms || ['facebook'];

        if (targetPlatforms.includes('facebook')) platformBreakdown.facebook++;
        if (targetPlatforms.includes('instagram')) platformBreakdown.instagram++;
        if (targetPlatforms.includes('tiktok')) platformBreakdown.tiktok++;

        let reelViews = 0;
        let reach = 0;
        let likes = 0;
        let shares = 0;

        let cleanPostId = '';
        const postIds: any = r.platformPostIds;
        if (typeof postIds === 'string') {
            try {
                const parsed = JSON.parse(postIds);
                if (typeof parsed === 'string') {
                    cleanPostId = parsed;
                } else if (parsed && typeof parsed === 'object') {
                    cleanPostId = parsed.facebook || parsed.video_id || '';
                }
            } catch (_e) {
                cleanPostId = postIds;
            }
        } else if (postIds && typeof postIds === 'object') {
            cleanPostId = postIds.facebook || postIds.video_id || '';
        }

        const facebookPostUrl = cleanPostId ? `https://www.facebook.com/reel/${cleanPostId}` : null;

        // Resolve Page Access Token
        let pageToken: string | null = null;
        if (r.page && r.page.accessTokenEnc) {
            pageToken = decryptAes(r.page.accessTokenEnc, config.ENCRYPTION_KEY);
        } else {
            const defaultPage = await PageModel.findOne({ where: { userId } });
            if (defaultPage && defaultPage.accessTokenEnc) {
                pageToken = decryptAes(defaultPage.accessTokenEnc, config.ENCRYPTION_KEY);
            }
        }

        // Fetch live Meta Graph API insights if cleanPostId and token are available
        if (cleanPostId && pageToken) {
            try {
                const insights = await fetchFacebookReelInsights(cleanPostId, pageToken);
                reelViews = insights.views;
                reach = insights.reach;
                likes = insights.likes;
            } catch (err: any) {
                logger.warn(`[Analytics] Failed to fetch live insights for post ${cleanPostId}: ${err?.message}`);
            }
        }

        totalViews += reelViews;
        totalReach += reach;
        totalLikes += likes;
        totalShares += shares;

        topReels.push({
            reelId: r.id,
            title: r.title,
            views: reelViews,
            reach,
            likes,
            shares,
            facebookPostUrl,
            publishedAt: r.publishedAt,
        });
    }

    // Sort top reels by view count descending
    topReels.sort((a, b) => b.views - a.views);

    // Calculate viral score index (0 - 100)
    const viralScore = publishedReels.length > 0
        ? Math.min(100, Math.round((totalViews / (publishedReels.length * 100)) * 100))
        : 0;

    return {
        totalViews,
        totalReach,
        totalLikes,
        totalShares,
        viralScore,
        publishedCount: publishedReels.length,
        platformBreakdown,
        topReels: topReels.slice(0, 5),
    };
};
