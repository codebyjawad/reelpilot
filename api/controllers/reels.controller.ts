import { Request, Response } from 'express';
import * as reelsService from '../services/reels.service.js';
import type { CreateReelRequest, UpdateReelRequest, ReelQueryParams } from '../../shared/types.js';

const parseJsonBody = (value: any): any => {
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        } catch (_e) {
            return value;
        }
    }
    return value;
};

export const create = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    let data: CreateReelRequest;

    const contentType = req.headers['content-type'] ?? '';
    if (contentType.startsWith('multipart/form-data')) {
        const raw = req.body?.data ?? req.body;
        const parsed = parseJsonBody(raw);
        if (parsed && typeof parsed === 'object') {
            if (parsed.pageId !== undefined && typeof parsed.pageId === 'string') {
                parsed.pageId = Number(parsed.pageId);
            }
            if (parsed.hashtags && typeof parsed.hashtags === 'string') {
                try { parsed.hashtags = JSON.parse(parsed.hashtags); } catch (_) { }
            }
        }
        data = parsed as CreateReelRequest;
    } else {
        data = req.body as CreateReelRequest;
    }

    const videoFile = req.file;
    const reel = await reelsService.create(userId, data, videoFile);

    res.status(201).json({
        success: true,
        data: reel,
    });
};

export const list = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const params = req.query as unknown as ReelQueryParams;

    const result = await reelsService.findByQuery(userId, params);

    res.status(200).json({
        success: true,
        data: result,
    });
};

export const get = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);

    const reel = await reelsService.getById(userId, id);

    res.status(200).json({
        success: true,
        data: reel,
    });
};

export const update = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);

    let data: UpdateReelRequest;
    const contentType = req.headers['content-type'] ?? '';
    if (contentType.startsWith('multipart/form-data')) {
        const raw = req.body?.data ?? req.body;
        const parsed = parseJsonBody(raw);
        if (parsed && typeof parsed === 'object') {
            if (parsed.pageId !== undefined && typeof parsed.pageId === 'string') {
                parsed.pageId = Number(parsed.pageId);
            }
            if (parsed.hashtags && typeof parsed.hashtags === 'string') {
                try { parsed.hashtags = JSON.parse(parsed.hashtags); } catch (_) { }
            }
        }
        data = parsed as UpdateReelRequest;
    } else {
        data = req.body as UpdateReelRequest;
    }

    const videoFile = req.file;
    const reel = await reelsService.update(userId, id, data, videoFile);

    res.status(200).json({
        success: true,
        data: reel,
    });
};

export const remove = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);

    await reelsService.remove(userId, id);

    res.status(204).end();
};

export const publishNow = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);

    const reel = await reelsService.publishNow(userId, id);

    res.status(200).json({
        success: true,
        data: reel,
    });
};

export const retry = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const id = Number(req.params.id);

    const reel = await reelsService.retry(userId, id);

    res.status(200).json({
        success: true,
        data: reel,
    });
};

import * as aiSvc from '../services/ai.service.js';
import * as peakTimeSvc from '../services/peakTime.service.js';
import * as recyclingSvc from '../services/recycling.service.js';

export const generateAiContent = async (req: Request, res: Response): Promise<void> => {
    const { topic, geminiApiKey, openAiKey } = req.body;
    if (!topic || typeof topic !== 'string') {
        res.status(400).json({ success: false, error: 'topic string is required' });
        return;
    }

    const content = await aiSvc.generateReelContent(topic, geminiApiKey, openAiKey);

    res.status(200).json({
        success: true,
        data: content,
    });
};

export const getPeakTimes = async (req: Request, res: Response): Promise<void> => {
    const targetDate = req.query.date as string | undefined;
    const peakTimes = await peakTimeSvc.calculatePeakTimeSlots(targetDate);

    res.status(200).json({
        success: true,
        data: peakTimes,
    });
};

export const getPeakHeatmap = async (_req: Request, res: Response): Promise<void> => {
    const heatmap = await peakTimeSvc.calculate7DayHeatmapMatrix();

    res.status(200).json({
        success: true,
        data: heatmap,
    });
};

export const getRecyclingCandidates = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const candidates = await recyclingSvc.findRecyclableReels(userId);

    res.status(200).json({
        success: true,
        data: candidates,
    });
};

export const recycleReel = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const reelId = Number(req.params.id);
    const { customTitle, scheduledAt, targetPlatforms, spinCaptionWithAi } = req.body;

    const recycledReel = await recyclingSvc.recycleReel(userId, reelId, {
        customTitle,
        scheduledAt,
        targetPlatforms,
        spinCaptionWithAi,
    });

    res.status(201).json({
        success: true,
        data: recycledReel,
    });
};

export const generateAiSubtitles = async (req: Request, res: Response): Promise<void> => {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
        res.status(400).json({ success: false, error: 'text string is required for subtitle generation' });
        return;
    }

    const subtitles = await aiSvc.generateAutoSubtitles(text);

    res.status(200).json({
        success: true,
        data: subtitles,
    });
};

export const generateAiThumbnail = async (req: Request, res: Response): Promise<void> => {
    const { title, caption } = req.body;
    if (!title || typeof title !== 'string') {
        res.status(400).json({ success: false, error: 'title string is required for thumbnail generation' });
        return;
    }

    const thumbnail = await aiSvc.generateThumbnailConcept(title, caption);

    res.status(200).json({
        success: true,
        data: thumbnail,
    });
};

export default {
    create,
    list,
    get,
    update,
    remove,
    publishNow,
    retry,
    generateAiContent,
    generateAiSubtitles,
    generateAiThumbnail,
    getPeakTimes,
    getPeakHeatmap,
    getRecyclingCandidates,
    recycleReel,
};
