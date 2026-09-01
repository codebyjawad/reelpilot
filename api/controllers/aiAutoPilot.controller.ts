import { Request, Response } from 'express';
import * as aiAutoPilotService from '../services/aiAutoPilot.service.js';
import { generateAiImagePost } from '../services/ai.service.js';

export const listAutoPilots = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const pilots = await aiAutoPilotService.listAutoPilots(userId);
    res.status(200).json({ success: true, data: { pilots } });
};

export const createAutoPilot = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const {
        pageId,
        topic,
        intervalMinutes,
        targetPlatforms,
        geminiApiKey,
        stylePreset,
        brandName,
        brandRole,
        brandHandle,
        directorPrompt,
        targetGroupIds,
    } = req.body;

    if (!pageId || !topic) {
        res.status(400).json({ success: false, error: 'pageId and topic are required' });
        return;
    }

    const pilot = await aiAutoPilotService.createAutoPilot(userId, {
        pageId: Number(pageId),
        topic: String(topic).trim(),
        intervalMinutes: Number(intervalMinutes) || 60,
        targetPlatforms: Array.isArray(targetPlatforms) ? targetPlatforms : ['facebook'],
        geminiApiKey: geminiApiKey || undefined,
        stylePreset: stylePreset || undefined,
        brandName: brandName || undefined,
        brandRole: brandRole || undefined,
        brandHandle: brandHandle || undefined,
        directorPrompt: directorPrompt || undefined,
        targetGroupIds: Array.isArray(targetGroupIds) ? targetGroupIds.map(Number) : [],
    });

    res.status(201).json({ success: true, data: { pilot } });
};

export const updateAutoPilot = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const {
        pageId,
        topic,
        intervalMinutes,
        targetPlatforms,
        geminiApiKey,
        isActive,
        stylePreset,
        brandName,
        brandRole,
        brandHandle,
        directorPrompt,
        targetGroupIds,
    } = req.body;

    const pilot = await aiAutoPilotService.updateAutoPilot(userId, id, {
        pageId: pageId !== undefined ? Number(pageId) : undefined,
        topic: topic !== undefined ? String(topic).trim() : undefined,
        intervalMinutes: intervalMinutes !== undefined ? Number(intervalMinutes) : undefined,
        targetPlatforms: Array.isArray(targetPlatforms) ? targetPlatforms : undefined,
        geminiApiKey: geminiApiKey !== undefined ? (geminiApiKey || null) : undefined,
        isActive: typeof isActive === 'boolean' ? isActive : undefined,
        stylePreset: stylePreset !== undefined ? stylePreset : undefined,
        brandName: brandName !== undefined ? brandName : undefined,
        brandRole: brandRole !== undefined ? brandRole : undefined,
        brandHandle: brandHandle !== undefined ? brandHandle : undefined,
        directorPrompt: directorPrompt !== undefined ? directorPrompt : undefined,
        targetGroupIds: Array.isArray(targetGroupIds) ? targetGroupIds.map(Number) : undefined,
    });

    res.status(200).json({ success: true, data: { pilot } });
};


export const toggleAutoPilot = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
        res.status(400).json({ success: false, error: 'isActive (boolean) is required' });
        return;
    }

    const pilot = await aiAutoPilotService.toggleAutoPilot(userId, id, isActive);
    res.status(200).json({ success: true, data: { pilot } });
};

export const deleteAutoPilot = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);
    await aiAutoPilotService.deleteAutoPilot(userId, id);
    res.status(200).json({ success: true });
};

export const getPostLogs = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const autopilotId = req.params.id ? Number(req.params.id) : undefined;
    const limit = Number(req.query.limit) || 50;
    const logs = await aiAutoPilotService.getPostLogs(userId, autopilotId, limit);
    res.status(200).json({ success: true, data: { logs } });
};

export const runNow = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);

    // Verify ownership
    const pilots = await aiAutoPilotService.listAutoPilots(userId);
    const owned = pilots.find((p: any) => p.id === id);
    if (!owned) {
        res.status(404).json({ success: false, error: 'Auto-Pilot not found' });
        return;
    }

    // Fire and forget — respond immediately, job runs in background
    res.status(202).json({ success: true, message: 'Job triggered. Check logs shortly.' });
    aiAutoPilotService.runAutoPilotJob(id).catch(() => {});
};

export const suggestTopics = async (req: Request, res: Response): Promise<void> => {
    const { pageName, geminiApiKey } = req.body;
    const { suggestTopicsForPage } = await import('../services/ai.service.js');
    const topics = await suggestTopicsForPage(pageName || 'Viral Page', geminiApiKey);
    res.status(200).json({ success: true, data: { topics } });
};

export const previewGenerate = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            topic,
            stylePreset,
            brandName,
            brandRole,
            brandHandle,
            directorPrompt,
            geminiApiKey,
            count = 1,
        } = req.body;

        const numVariations = Math.min(Math.max(1, Number(count) || 1), 5);
        const tasks = Array.from({ length: numVariations }).map(async (_, idx) => {
            return generateAiImagePost({
                topic: String(topic || '').trim(),
                brandName: brandName || undefined,
                brandRole: brandRole || undefined,
                brandHandle: brandHandle || undefined,
                directorPrompt: directorPrompt || undefined,
                geminiKey: geminiApiKey || undefined,
                variationIndex: idx + 1,
                totalVariations: numVariations,
            });
        });

        const variations = await Promise.all(tasks);


        res.status(200).json({
            success: true,
            data: {
                ...variations[0],
                variations,
                count: variations.length,
            },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to generate preview posts' });
    }
};

export const publishPreviewPost = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.id;
        const { pageId, targetGroupIds, imagePath, imageUrl, title, caption } = req.body;

        const FacebookPage = (await import('../models/FacebookPage.model.js')).getFacebookPageModel();
        const { postPhotoToPage } = await import('../services/facebook.service.js');
        const { publishImageToGroup } = await import('../services/groups.service.js');
        const { decryptAes } = await import('../utils/encryption.js');
        const config = (await import('../config/index.js')).config;

        const fbPage = await FacebookPage.findOne({ where: { id: pageId } });
        if (!fbPage || !fbPage.accessTokenEnc) {
            res.status(400).json({ success: false, error: 'Facebook Page not found or missing access token' });
            return;
        }

        const accessToken = decryptAes(fbPage.accessTokenEnc, config.ENCRYPTION_KEY);
        const baseUrl = process.env.PUBLIC_URL || `http://localhost:${config.PORT}`;
        const targetImg = imagePath || (imageUrl ? `${baseUrl}${imageUrl}` : null);

        if (!targetImg) {
            res.status(400).json({ success: false, error: 'No image path provided' });
            return;
        }

        const pagePost = await postPhotoToPage(fbPage.fbPageId, accessToken, targetImg, caption || title);

        const groupResults: any[] = [];
        if (Array.isArray(targetGroupIds) && targetGroupIds.length > 0) {
            for (const gId of targetGroupIds) {
                try {
                    const gRes = await publishImageToGroup(userId, Number(gId), targetImg, caption || title);
                    groupResults.push({ groupId: gId, ...gRes });
                } catch (ge: any) {
                    groupResults.push({ groupId: gId, success: false, error: ge.message });
                }
            }
        }

        res.status(200).json({
            success: true,
            data: {
                pagePostId: pagePost.postId,
                groupResults,
            },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message || 'Failed to publish preview post' });
    }
};




