import { logger } from '../utils/logger.js';
import * as reelsService from './reels.service.js';
import * as rssService from './rss.service.js';
import { getReelModel } from '../models/Reel.model.js';

export interface BackgroundWorkerStats {
  status: 'running' | 'idle' | 'stopped';
  lastTickTime: string | null;
  totalTicks: number;
  reelsProcessedCount: number;
  rssFeedsSyncedCount: number;
  viralSourcesSyncedCount: number;
  autoRetriesCount: number;
  pendingQueueCount: number;
  uptimeSeconds: number;
}

const startTime = Date.now();
let lastTickTime: string | null = null;
let totalTicks = 0;
let reelsProcessedCount = 0;
let rssFeedsSyncedCount = 0;
let viralSourcesSyncedCount = 0;
let autoRetriesCount = 0;

export const recordTick = (processedReels: number, syncedRss: number, retried: number, syncedViral: number = 0): void => {
  totalTicks++;
  lastTickTime = new Date().toISOString();
  reelsProcessedCount += processedReels;
  rssFeedsSyncedCount += syncedRss;
  viralSourcesSyncedCount += syncedViral;
  autoRetriesCount += retried;
};

export const getWorkerStatus = async (): Promise<BackgroundWorkerStats> => {
  const ReelModel = getReelModel();
  
  let pendingQueueCount = 0;
  try {
    pendingQueueCount = await ReelModel.count({
      where: { status: 'scheduled' },
    });
  } catch (err: any) {
    logger.warn(`[BackgroundWorker] Failed to query pending queue count: ${err?.message}`);
  }

  return {
    status: totalTicks > 0 ? 'running' : 'idle',
    lastTickTime,
    totalTicks,
    reelsProcessedCount,
    rssFeedsSyncedCount,
    viralSourcesSyncedCount,
    autoRetriesCount,
    pendingQueueCount,
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
  };
};

export const autoRetryFailedReels = async (): Promise<number> => {
  const ReelModel = getReelModel();
  let count = 0;

  try {
    const failedReels = await ReelModel.findAll({
      where: { status: 'failed' },
      limit: 5,
    });

    for (const reel of failedReels) {
      logger.info(`[BackgroundWorker] Auto-retrying failed reel ${reel.id} ("${reel.title}")`);
      await reelsService.publishNow(reel.userId, reel.id);
      count++;
    }
  } catch (err: any) {
    logger.warn(`[BackgroundWorker] Auto-retry routine error: ${err?.message}`);
  }

  return count;
};
