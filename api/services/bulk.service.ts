import { getReelModel } from '../models/Reel.model.js';
import { logger } from '../utils/logger.js';
import type { BulkImportItem, TargetPlatform } from '../../shared/types.js';

interface BulkImportOptions {
    userId: number;
    pageId: number;
    targetPlatforms?: TargetPlatform[];
    startAt?: Date | string;
    intervalHours?: number;
    items: BulkImportItem[];
}

/**
 * Bulk import and schedule multiple video links
 */
export const bulkImportReels = async (options: BulkImportOptions): Promise<{ createdCount: number }> => {
    const ReelModel = getReelModel();
    const intervalHours = options.intervalHours || 3;
    const intervalMs = intervalHours * 60 * 60 * 1000;
    let currentScheduleTime = options.startAt ? new Date(options.startAt).getTime() : Date.now() + 10 * 60 * 1000;
    let createdCount = 0;

    const platforms = options.targetPlatforms && options.targetPlatforms.length > 0
        ? options.targetPlatforms
        : ['facebook' as TargetPlatform];

    for (const item of options.items) {
        if (!item.videoUrl || !item.videoUrl.trim()) continue;

        const title = (item.title || 'Bulk Import Reel').trim();
        const videoUrl = item.videoUrl.trim();

        await ReelModel.create({
            userId: options.userId,
            pageId: options.pageId,
            title,
            caption: item.caption ?? null,
            hashtags: item.hashtags ?? ['viral', 'reels'],
            videoSource: 'url',
            videoUrl,
            targetPlatforms: platforms,
            status: 'scheduled',
            scheduledAt: new Date(currentScheduleTime),
            retryCount: 0,
            thumbnailUrl: null,
            videoFilePath: null,
            publishedAt: null,
            facebookPostId: null,
            platformPostIds: null,
            errorMessage: null,
        });

        createdCount++;
        currentScheduleTime += intervalMs;
    }

    logger.info(`[BulkImport] Created ${createdCount} scheduled Reels for pageId=${options.pageId}`);
    return { createdCount };
};
