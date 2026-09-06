import cron from 'node-cron';
import { logger } from '../utils/logger.js';
import * as reelsService from './reels.service.js';
import * as rssService from './rss.service.js';
import * as backgroundWorkerSvc from './backgroundWorker.service.js';
import * as aiAutoPilotService from './aiAutoPilot.service.js';
import * as viralShortsService from './viralShorts.service.js';

let runningTask: cron.ScheduledTask | null = null;
let tickCount = 0;

export const start = (): void => {
    if (runningTask) {
        return;
    }

    runningTask = cron.schedule('* * * * *', async () => {
        const start = Date.now();
        tickCount++;
        logger.info('Scheduler tick: checking due reels');
        let processedCount = 0;
        let syncedRssCount = 0;
        let retriedCount = 0;
        let syncedViralCount = 0;

        try {
            await reelsService.processDueReels();
            processedCount++;

            // Check and run due AI Auto-Pilot jobs every minute
            await aiAutoPilotService.processDueAiAutoPilots();

            // Run RSS feed auto-pilot every 15 minutes
            if (tickCount % 15 === 1) {
                logger.info('Scheduler: running RSS feed auto-pilot sync');
                await rssService.pollAllActiveRssFeeds();
                syncedRssCount++;
            }

            // Run Viral Shorts auto-pilot every 15 minutes (heatmap-scheduled + AI captions)
            if (tickCount % 15 === 1) {
                logger.info('Scheduler: running Viral Shorts auto-pilot sync');
                syncedViralCount = await viralShortsService.pollAllActiveViralSources();
            }

            // Run background auto-retry for failed reels every 30 minutes
            if (tickCount % 30 === 15) {
                retriedCount = await backgroundWorkerSvc.autoRetryFailedReels();
            }
        } catch (e: any) {

            logger.error(
                `Scheduler tick error: ${e?.message ?? e}`
            );
        } finally {
            backgroundWorkerSvc.recordTick(processedCount, syncedRssCount, retriedCount, syncedViralCount);
            logger.info(`Scheduler tick done in ${Date.now() - start}ms`);
        }
    });

    runningTask.start();
    logger.info('Scheduler started (every minute)');

    // Restore active AI auto-pilots from database on startup
    aiAutoPilotService.loadAndScheduleAllActive().catch((e) =>
        logger.warn(`Failed to restore AI auto-pilots: ${e?.message}`)
    );
};

export const stop = (): void => {
    if (runningTask) {
        try {
            runningTask.stop();
        } catch (_) { }
        runningTask = null;
        logger.info('Scheduler stopped');
    }
};

export default {
    start,
    stop,
};
