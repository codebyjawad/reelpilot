import Parser from 'rss-parser';
import { getRssFeedModel } from '../models/RssFeed.model.js';
import { getReelModel } from '../models/Reel.model.js';
import { logger } from '../utils/logger.js';
import type { TargetPlatform } from '../../shared/types.js';

const parser = new Parser({
    customFields: {
        item: [
            ['media:group', 'mediaGroup'],
            ['yt:videoId', 'ytVideoId'],
        ],
    },
});

/**
 * Convert any YouTube channel URL into an RSS Feed XML URL
 */
export const normalizeRssUrl = (url: string): string => {
    try {
        const parsed = new URL(url);
        // YouTube channel ID feed: https://www.youtube.com/feeds/videos.xml?channel_id=UC...
        if (parsed.hostname.includes('youtube.com') && parsed.pathname.includes('/feeds/videos.xml')) {
            return url;
        }
        // Handle channel URL like https://www.youtube.com/channel/UC...
        const channelMatch = parsed.pathname.match(/\/channel\/([A-Za-z0-9_-]{15,40})/);
        if (channelMatch) {
            return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelMatch[1]}`;
        }
        return url;
    } catch {
        return url;
    }
};

/**
 * Poll a specific RSS Feed and auto-queue new videos
 */
export const pollRssFeed = async (feedId: number): Promise<{ importedCount: number }> => {
    const RssFeedModel = getRssFeedModel();
    const ReelModel = getReelModel();

    const feed = await RssFeedModel.findByPk(feedId);
    if (!feed || !feed.isActive) return { importedCount: 0 };

    const feedXmlUrl = normalizeRssUrl(feed.feedUrl);
    logger.info(`[RSS] Polling RSS feed "${feed.name}" id=${feed.id} url=${feedXmlUrl}`);

    try {
        const parsedFeed = await parser.parseURL(feedXmlUrl);
        const items = parsedFeed.items ?? [];
        let newCount = 0;

        const intervalMs = (feed.intervalHours || 3) * 60 * 60 * 1000;
        let nextScheduleTime = Date.now() + 5 * 60 * 1000; // Start first reel in 5 mins

        for (const item of items) {
            const videoUrl = item.link || (item.ytVideoId ? `https://www.youtube.com/watch?v=${item.ytVideoId}` : null);
            if (!videoUrl) continue;

            const title = (item.title || feed.name).slice(0, 200);

            // Check if Reel with this videoUrl already exists for this page
            const existing = await ReelModel.findOne({
                where: {
                    pageId: feed.pageId,
                    videoUrl,
                },
            });

            if (!existing) {
                await ReelModel.create({
                    userId: feed.userId,
                    pageId: feed.pageId,
                    title,
                    caption: item.contentSnippet?.slice(0, 500) || `Auto-imported from ${feed.name}`,
                    hashtags: ['viral', 'shorts', 'reels', 'autopilot'],
                    videoSource: 'url',
                    videoUrl,
                    targetPlatforms: feed.targetPlatforms as TargetPlatform[],
                    status: 'scheduled',
                    scheduledAt: new Date(nextScheduleTime),
                    retryCount: 0,
                    thumbnailUrl: null,
                    videoFilePath: null,
                    publishedAt: null,
                    facebookPostId: null,
                    platformPostIds: null,
                    errorMessage: null,
                });

                newCount++;
                nextScheduleTime += intervalMs;
                logger.info(`[RSS] Auto-queued Reel title="${title}" scheduledAt=${new Date(nextScheduleTime - intervalMs).toISOString()}`);
            }
        }

        feed.lastPolledAt = new Date();
        feed.importedCount = (feed.importedCount || 0) + newCount;
        await feed.save();

        logger.info(`[RSS] Sync complete for "${feed.name}". ${newCount} new reels queued.`);
        return { importedCount: newCount };
    } catch (err: any) {
        logger.error(`[RSS] Error polling RSS feed ${feed.id}: ${err?.message}`);
        throw err;
    }
};

/**
 * Poll all active RSS Feeds due for synchronization
 */
export const pollAllActiveRssFeeds = async (): Promise<void> => {
    const RssFeedModel = getRssFeedModel();
    const activeFeeds = await RssFeedModel.findAll({ where: { isActive: true } });

    for (const feed of activeFeeds) {
        try {
            await pollRssFeed(feed.id);
        } catch (_err) {
            // Continue processing remaining feeds
        }
    }
};
