import { getAbTestModel } from '../models/AbTest.model.js';
import { getReelModel } from '../models/Reel.model.js';
import { logger } from '../utils/logger.js';

export async function getUserAbTests(userId: number) {
    const AbTest = getAbTestModel();
    return AbTest.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
    });
}

export async function createAbTestCampaign(userId: number, data: any) {
    const AbTest = getAbTestModel();
    const Reel = getReelModel();

    logger.info(`[A/B Test Service] Creating A/B Campaign "${data.title}" for user ${userId}`);

    // Create or retrieve Variant A and Variant B Reels
    let variantAReelId = data.variantAReelId;
    let variantBReelId = data.variantBReelId;

    if (!variantAReelId && data.variantA) {
        const reelA = await Reel.create({
            userId,
            pageId: data.pageId || 1,
            title: `${data.title} (Variant A)`,
            caption: data.variantA.caption || data.caption,
            hashtags: data.variantA.hashtags || data.hashtags || [],
            videoSource: data.variantA.videoSource || 'url',
            videoUrl: data.variantA.videoUrl || data.videoUrl,
            status: 'draft',
            targetPlatforms: data.targetPlatforms || ['facebook', 'youtube'],
            retryCount: 0,
        });
        variantAReelId = reelA.id;
    }

    if (!variantBReelId && data.variantB) {
        const reelB = await Reel.create({
            userId,
            pageId: data.pageId || 1,
            title: `${data.title} (Variant B)`,
            caption: data.variantB.caption || data.caption,
            hashtags: data.variantB.hashtags || data.hashtags || [],
            videoSource: data.variantB.videoSource || 'url',
            videoUrl: data.variantB.videoUrl || data.videoUrl,
            status: 'draft',
            targetPlatforms: data.targetPlatforms || ['facebook', 'youtube'],
            retryCount: 0,
        });
        variantBReelId = reelB.id;
    }

    // Default sample metrics
    const initialAMetrics = { views: Math.floor(Math.random() * 400) + 100, likes: Math.floor(Math.random() * 80) + 10, comments: Math.floor(Math.random() * 15), shares: Math.floor(Math.random() * 5) };
    const initialBMetrics = { views: Math.floor(Math.random() * 400) + 100, likes: Math.floor(Math.random() * 80) + 10, comments: Math.floor(Math.random() * 15), shares: Math.floor(Math.random() * 5) };

    const abTest = await AbTest.create({
        userId,
        title: data.title || 'Untitled A/B Experiment',
        testType: data.testType || 'caption',
        variantAReelId,
        variantBReelId,
        variantAMetrics: initialAMetrics,
        variantBMetrics: initialBMetrics,
        winnerVariant: null,
        status: 'running',
        durationHours: data.durationHours || 48,
        minViewsThreshold: data.minViewsThreshold || 1000,
        autoSelectWinner: data.autoSelectWinner ?? true,
        startedAt: new Date(),
    });

    return abTest;
}

export async function evaluateAbTestWinner(userId: number, testId: number) {
    const AbTest = getAbTestModel();
    const test = await AbTest.findOne({ where: { id: testId, userId } });
    if (!test) throw new Error('A/B Test not found');

    const metricsA = test.variantAMetrics || { views: 0, likes: 0, comments: 0, shares: 0 };
    const metricsB = test.variantBMetrics || { views: 0, likes: 0, comments: 0, shares: 0 };

    // Calculate score: Views + (Likes * 2) + (Comments * 5) + (Shares * 10)
    const scoreA = metricsA.views + (metricsA.likes * 2) + (metricsA.comments * 5) + (metricsA.shares * 10);
    const scoreB = metricsB.views + (metricsB.likes * 2) + (metricsB.comments * 5) + (metricsB.shares * 10);

    let winner: 'A' | 'B' | 'tie' = 'tie';
    if (scoreA > scoreB) winner = 'A';
    else if (scoreB > scoreA) winner = 'B';

    await test.update({
        winnerVariant: winner,
        status: 'completed',
        completedAt: new Date(),
    });

    return {
        test,
        scoreA,
        scoreB,
        winner,
    };
}
