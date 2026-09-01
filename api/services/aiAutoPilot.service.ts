import { logger } from '../utils/logger.js';
import { getAiAutoPilotModel } from '../models/AiAutoPilot.model.js';
import { getAiPostLogModel } from '../models/AiPostLog.model.js';
import { getFacebookPageModel } from '../models/FacebookPage.model.js';
import { generateAiImagePost } from './ai.service.js';
import { postPhotoToPage } from './facebook.service.js';
import { publishImageToGroup } from './groups.service.js';
import { decryptAes } from '../utils/encryption.js';
import { config } from '../config/index.js';
import { NotFoundError } from '../utils/errors.js';

export interface CreateAutoPilotInput {
    pageId: number;
    topic: string;
    intervalMinutes: number;
    targetPlatforms: string[];
    geminiApiKey?: string;
    stylePreset?: string;
    brandName?: string;
    brandRole?: string;
    brandHandle?: string;
    directorPrompt?: string;
    targetGroupIds?: number[];
}

// In-memory registry of active cron-like intervals per autopilot id
const activeIntervals = new Map<number, ReturnType<typeof setInterval>>();

/**
 * Create a new AI Auto-Pilot config and start its timer.
 */
export const createAutoPilot = async (userId: number, input: CreateAutoPilotInput) => {
    const AiAutoPilot = getAiAutoPilotModel();
    const minutes = Math.max(15, input.intervalMinutes);

    const pilot = await AiAutoPilot.create({
        userId,
        pageId: input.pageId,
        topic: input.topic,
        stylePreset: input.stylePreset || 'master-creative-director',
        brandName: input.brandName?.trim() || null,
        brandRole: input.brandRole?.trim() || null,
        brandHandle: input.brandHandle?.trim() || null,
        directorPrompt: input.directorPrompt?.trim() || null,
        targetGroupIds: input.targetGroupIds || [],
        intervalMinutes: minutes,
        targetPlatforms: input.targetPlatforms,
        isActive: true,
        geminiApiKey: input.geminiApiKey || null,
    });

    scheduleAutoPilot(pilot.id, minutes);
    return pilot;
};


/**
 * List all auto-pilots for a user with their recent post count.
 */
export const listAutoPilots = async (userId: number) => {
    const AiAutoPilot = getAiAutoPilotModel();
    const AiPostLog = getAiPostLogModel();

    const pilots = await AiAutoPilot.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
    });

    // Attach recent log count
    const results = await Promise.all(pilots.map(async (p) => {
        const recentCount = await AiPostLog.count({ where: { autopilotId: p.id } });
        return { ...p.toJSON(), recentPostCount: recentCount };
    }));

    return results;
};

export interface UpdateAutoPilotInput {
    pageId?: number;
    topic?: string;
    stylePreset?: string;
    brandName?: string | null;
    brandRole?: string | null;
    brandHandle?: string | null;
    directorPrompt?: string | null;
    targetGroupIds?: number[];
    intervalMinutes?: number;
    targetPlatforms?: string[];
    geminiApiKey?: string | null;
    isActive?: boolean;
}

/**
 * Update configuration of an existing auto-pilot.
 */
export const updateAutoPilot = async (userId: number, id: number, input: UpdateAutoPilotInput) => {
    const AiAutoPilot = getAiAutoPilotModel();
    const pilot = await AiAutoPilot.findOne({ where: { id, userId } });
    if (!pilot) throw new NotFoundError('Auto-Pilot not found');

    const newInterval = input.intervalMinutes !== undefined ? Math.max(15, input.intervalMinutes) : pilot.intervalMinutes;
    const newActive = input.isActive !== undefined ? input.isActive : pilot.isActive;

    await pilot.update({
        pageId: input.pageId !== undefined ? input.pageId : pilot.pageId,
        topic: input.topic !== undefined ? input.topic.trim() : pilot.topic,
        stylePreset: input.stylePreset !== undefined ? input.stylePreset : pilot.stylePreset,
        brandName: input.brandName !== undefined ? (input.brandName?.trim() || null) : pilot.brandName,
        brandRole: input.brandRole !== undefined ? (input.brandRole?.trim() || null) : pilot.brandRole,
        brandHandle: input.brandHandle !== undefined ? (input.brandHandle?.trim() || null) : pilot.brandHandle,
        directorPrompt: input.directorPrompt !== undefined ? (input.directorPrompt?.trim() || null) : pilot.directorPrompt,
        targetGroupIds: input.targetGroupIds !== undefined ? input.targetGroupIds : pilot.targetGroupIds,
        intervalMinutes: newInterval,
        targetPlatforms: input.targetPlatforms !== undefined ? input.targetPlatforms : pilot.targetPlatforms,
        geminiApiKey: input.geminiApiKey !== undefined ? (input.geminiApiKey || null) : pilot.geminiApiKey,
        isActive: newActive,
    });

    if (newActive) {
        scheduleAutoPilot(pilot.id, newInterval);
    } else {
        clearAutoPilotInterval(pilot.id);
    }

    return pilot;
};


/**
 * Toggle active/paused state of an auto-pilot.
 */
export const toggleAutoPilot = async (userId: number, id: number, isActive: boolean) => {
    const AiAutoPilot = getAiAutoPilotModel();
    const pilot = await AiAutoPilot.findOne({ where: { id, userId } });
    if (!pilot) throw new NotFoundError('Auto-Pilot not found');

    await pilot.update({ isActive });

    if (isActive) {
        scheduleAutoPilot(pilot.id, pilot.intervalMinutes);
    } else {
        clearAutoPilotInterval(pilot.id);
    }

    return pilot;
};

/**
 * Delete an auto-pilot and stop its cron timer completely.
 */
export const deleteAutoPilot = async (userId: number, id: number) => {
    const AiAutoPilot = getAiAutoPilotModel();
    const AiPostLog = getAiPostLogModel();
    const pilot = await AiAutoPilot.findOne({ where: { id, userId } });
    if (!pilot) throw new NotFoundError('Auto-Pilot not found');

    // 1. Terminate and clear any active in-memory interval timer
    clearAutoPilotInterval(pilot.id);

    // 2. Remove from currently running lock set
    currentlyRunningPilots.delete(pilot.id);

    // 3. Delete associated logs and the AutoPilot record from DB (stops master cron ticks)
    await AiPostLog.destroy({ where: { autopilotId: id } });
    await pilot.destroy();

    logger.info(`[AI AutoPilot] Successfully deleted AutoPilot #${id} and cancelled all live background cron schedules.`);
    return { success: true };
};


/**
 * Get logs/history of generated posts for an auto-pilot.
 */
export const getAutoPilotLogs = async (userId: number, autopilotId: number, limit = 20) => {
    const AiPostLog = getAiPostLogModel();
    const logs = await AiPostLog.findAll({
        where: { autopilotId, userId },
        order: [['createdAt', 'DESC']],
        limit,
    });
    return logs;
};

/**
 * Get post logs for a user's auto-pilot, most recent first.
 */
export const getPostLogs = async (userId: number, autopilotId?: number, limit = 50) => {
    const AiPostLog = getAiPostLogModel();
    const where: Record<string, unknown> = { userId };
    if (autopilotId) where['autopilotId'] = autopilotId;

    return AiPostLog.findAll({
        where,
        order: [['createdAt', 'DESC']],
        limit,
    });
};

const currentlyRunningPilots = new Set<number>();

/**
 * Run one AI post job for a given auto-pilot id.
 * Called by the scheduler OR manually via "Run Now".
 */
export const runAutoPilotJob = async (autopilotId: number): Promise<void> => {
    if (currentlyRunningPilots.has(autopilotId)) {
        logger.warn(`[AI AutoPilot] Job for pilot ${autopilotId} already in progress. Skipping duplicate.`);
        return;
    }

    const AiAutoPilot = getAiAutoPilotModel();
    const AiPostLog = getAiPostLogModel();
    const FacebookPage = getFacebookPageModel();

    const pilot = await AiAutoPilot.findByPk(autopilotId);
    if (!pilot || !pilot.isActive) {
        logger.warn(`[AI AutoPilot] Job skipped — pilot ${autopilotId} not found or inactive`);
        return;
    }

    currentlyRunningPilots.add(autopilotId);
    logger.info(`[AI AutoPilot] Running job for pilot=${autopilotId} topic="${pilot.topic}" style="${pilot.stylePreset || 'personal-branding'}"`);

    // Create a pending log entry
    const log = await AiPostLog.create({
        autopilotId: pilot.id,
        userId: pilot.userId,
        pageId: pilot.pageId,
        status: 'pending',
        imagePath: null,
        imagePrompt: null,
        title: null,
        caption: null,
        hashtags: null,
        facebookPostId: null,
        errorMessage: null,
    });

    let postContent: any = null;

    try {
        // 1. Get page details
        const fbPage = await FacebookPage.findOne({ where: { id: pilot.pageId } });
        const pageName = fbPage?.name || 'Facebook Page';

        // 2. Generate AI content + image (tailored to page name, style preset and branding)
        const geminiKey = pilot.geminiApiKey || process.env.GEMINI_API_KEY;
        postContent = await generateAiImagePost({
            topic: pilot.topic,
            geminiKey,
            pageName,
            stylePreset: pilot.stylePreset || 'master-creative-director',
            brandName: pilot.brandName || undefined,
            brandRole: pilot.brandRole || undefined,
            brandHandle: pilot.brandHandle || undefined,
            directorPrompt: pilot.directorPrompt || undefined,
        });

        // Update log with generated image immediately so user can see what was generated
        await log.update({
            imagePath: postContent.imagePath,
            imagePrompt: postContent.imagePrompt,
            title: postContent.title,
            caption: postContent.caption,
            hashtags: postContent.hashtags,
        });

        if (!fbPage) throw new Error(`Facebook page ${pilot.pageId} not found`);

        // 3. Build the public image URL
        const baseUrl = process.env.PUBLIC_URL || `http://localhost:${config.PORT}`;
        const publicImageUrl = `${baseUrl}${postContent.imageUrl}`;

        // 4. Decrypt access token
        const accessToken = decryptAes(fbPage.accessTokenEnc, config.ENCRYPTION_KEY);

        // 5. Post photo to Facebook Page (uses direct local binary upload)
        const { postId } = await postPhotoToPage(
            fbPage.fbPageId,
            accessToken,
            postContent.imagePath || publicImageUrl,
            postContent.caption
        );

        // 6. Post photo to Target Facebook Groups if configured
        const targetGroupIds = pilot.targetGroupIds || [];
        if (Array.isArray(targetGroupIds) && targetGroupIds.length > 0) {
            for (const gId of targetGroupIds) {
                try {
                    await publishImageToGroup(
                        pilot.userId,
                        Number(gId),
                        postContent.imagePath || publicImageUrl,
                        postContent.caption
                    );
                    logger.info(`[AI AutoPilot] Published image to Target Group id=${gId}`);
                } catch (groupPostErr: any) {
                    logger.warn(`[AI AutoPilot] Group id=${gId} post note: ${groupPostErr?.message}`);
                }
            }
        }

        // 7. Update log as posted
        await log.update({
            facebookPostId: postId,
            status: 'posted',
            errorMessage: null,
        });

        // 8. Update pilot stats
        await pilot.update({
            lastRunAt: new Date(),
            totalPosts: pilot.totalPosts + 1,
        });

        logger.info(`[AI AutoPilot] Successfully posted for pilot=${autopilotId} fbPostId=${postId} groupsCount=${targetGroupIds.length}`);


    } catch (err: any) {
        const msg = err?.message ?? String(err);
        logger.error(`[AI AutoPilot] Job failed for pilot=${autopilotId}: ${msg}`);
        await log.update({
            status: 'failed',
            errorMessage: msg,
            imagePath: postContent?.imagePath || null,
            imagePrompt: postContent?.imagePrompt || null,
            title: postContent?.title || null,
            caption: postContent?.caption || null,
        });
    } finally {
        currentlyRunningPilots.delete(autopilotId);
    }
};

/**
 * Start the interval timer for an auto-pilot.
 */
export const scheduleAutoPilot = (id: number, intervalMinutes: number): void => {
    clearAutoPilotInterval(id);
    const ms = intervalMinutes * 60 * 1000;
    const intervalId = setInterval(() => {
        runAutoPilotJob(id).catch((e) =>
            logger.error(`[AI AutoPilot] Unhandled error in scheduled run for ${id}: ${e?.message}`)
        );
    }, ms);
    activeIntervals.set(id, intervalId);
    logger.info(`[AI AutoPilot] Scheduled pilot id=${id} every ${intervalMinutes} min`);
};

/**
 * Clear/stop an auto-pilot's interval timer.
 */
export const clearAutoPilotInterval = (id: number): void => {
    const existing = activeIntervals.get(id);
    if (existing) {
        clearInterval(existing);
        activeIntervals.delete(id);
        logger.info(`[AI AutoPilot] Cleared timer for pilot id=${id}`);
    }
};

/**
 * Check all active auto-pilots against DB timestamps and trigger any that are due.
 * Called every minute by the master background scheduler cron.
 */
export const processDueAiAutoPilots = async (): Promise<number> => {
    try {
        const AiAutoPilot = getAiAutoPilotModel();
        const activePilots = await AiAutoPilot.findAll({ where: { isActive: true } });
        const now = Date.now();
        let triggeredCount = 0;

        for (const pilot of activePilots) {
            if (currentlyRunningPilots.has(pilot.id)) continue;

            const intervalMs = (pilot.intervalMinutes || 60) * 60 * 1000;
            const lastRunTime = pilot.lastRunAt ? new Date(pilot.lastRunAt).getTime() : 0;
            const isDue = (now - lastRunTime) >= intervalMs;

            if (isDue) {
                logger.info(`[AI AutoPilot] Pilot id=${pilot.id} is due (last run: ${pilot.lastRunAt ? new Date(pilot.lastRunAt).toLocaleTimeString() : 'Never'}, interval: ${pilot.intervalMinutes}m). Triggering post job...`);
                runAutoPilotJob(pilot.id).catch((err) =>
                    logger.error(`[AI AutoPilot] Error in scheduled run for pilot ${pilot.id}: ${err?.message}`)
                );
                triggeredCount++;
            }
        }
        return triggeredCount;
    } catch (err: any) {
        logger.error(`[AI AutoPilot] Error processing due pilots: ${err?.message}`);
        return 0;
    }
};

/**
 * Load all active auto-pilots from DB and start their timers.
 * Called on server startup.
 */
export const loadAndScheduleAllActive = async (): Promise<void> => {
    try {
        const AiAutoPilot = getAiAutoPilotModel();
        const active = await AiAutoPilot.findAll({ where: { isActive: true } });
        logger.info(`[AI AutoPilot] Loading ${active.length} active auto-pilots from DB`);
        for (const pilot of active) {
            scheduleAutoPilot(pilot.id, pilot.intervalMinutes);
        }
        // Also check if any are already due
        await processDueAiAutoPilots();
    } catch (err: any) {
        logger.warn(`[AI AutoPilot] Failed to load active pilots on startup: ${err?.message}`);
    }
};

