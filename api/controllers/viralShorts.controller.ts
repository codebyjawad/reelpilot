import { Request, Response } from 'express';
import { getViralSourceModel } from '../models/ViralSource.model.js';
import { getFacebookPageModel } from '../models/FacebookPage.model.js';
import * as viralShortsService from '../services/viralShorts.service.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

const parseStringArray = (value: any): string[] => {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed.map(String);
        } catch {
            // fall through to comma split
        }
        return value.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
};

export const listSources = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const sources = await getViralSourceModel().findAll({
        where: { userId },
        include: [{ model: getFacebookPageModel(), as: 'page', attributes: ['id', 'name', 'avatarUrl'] }],
        order: [['createdAt', 'DESC']],
    });

    res.status(200).json({ success: true, data: { sources } });
};

export const createSource = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { pageId, name, keywords, minViews, publishedWithinDays, resultCount, targetPlatforms, useAiCaptions, autoImport, intervalHours } = req.body;

    if (!pageId || !name || !keywords) {
        throw new BadRequestError('pageId, name, and keywords are required');
    }

    const source = await getViralSourceModel().create({
        userId,
        pageId: Number(pageId),
        name,
        keywords: parseStringArray(keywords),
        minViews: Number(minViews) || 10000,
        publishedWithinDays: Number(publishedWithinDays) || 7,
        resultCount: Math.max(1, Math.min(15, Number(resultCount) || 8)),
        targetPlatforms: Array.isArray(targetPlatforms) && targetPlatforms.length ? targetPlatforms : ['facebook', 'instagram'],
        useAiCaptions: useAiCaptions !== undefined ? Boolean(useAiCaptions) : true,
        autoImport: autoImport !== undefined ? Boolean(autoImport) : true,
        intervalHours: Number(intervalHours) || 6,
        isActive: true,
        discoveredCount: 0,
        importedCount: 0,
        lastPolledAt: null,
    });

    // Fire-and-forget initial discovery so the autopilot starts warm
    viralShortsService.autoDiscoverAndImport(source).catch(() => { });

    res.status(201).json({
        success: true,
        data: { source },
    });
};

export const discoverNow = async (req: Request, res: Response): Promise<void> => {
    const { keywords, minViews, publishedWithinDays, resultCount, youtubeApiKey, enrichResults } = req.body;

    const keywordList = parseStringArray(keywords);
    if (keywordList.length === 0) {
        throw new BadRequestError('keywords is required for discovery');
    }

    const candidates = await viralShortsService.discoverViralShorts({
        keywords: keywordList,
        minViews: Number(minViews) || 0,
        publishedWithinDays: Number(publishedWithinDays) || 7,
        resultCount: Number(resultCount) || 8,
        youtubeApiKey,
        enrichResults: Boolean(enrichResults),
    });

    res.status(200).json({
        success: true,
        data: { candidates },
    });
};

export const importCandidates = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { pageId, candidates, targetPlatforms, useAiCaptions } = req.body;

    if (!pageId || !Array.isArray(candidates) || candidates.length === 0) {
        throw new BadRequestError('pageId and a non-empty candidates array are required');
    }

    const result = await viralShortsService.importViralShorts({
        userId,
        pageId: Number(pageId),
        candidates,
        targetPlatforms: Array.isArray(targetPlatforms) ? targetPlatforms : undefined,
        useAiCaptions: useAiCaptions !== undefined ? Boolean(useAiCaptions) : true,
    });

    res.status(200).json({ success: true, data: result });
};

export const syncSource = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const sourceId = Number(req.params.id);

    const source = await getViralSourceModel().findOne({ where: { id: sourceId, userId } });
    if (!source) {
        throw new NotFoundError('Viral source not found');
    }

    const result = await viralShortsService.autoDiscoverAndImport(source);

    res.status(200).json({ success: true, data: result });
};

export const getPeakSlots = async (req: Request, res: Response): Promise<void> => {
    const count = Math.max(1, Math.min(15, Number(req.query.count) || 8));
    const horizonHours = req.query.horizon ? Number(req.query.horizon) : undefined;
    const pageId = req.query.pageId ? Number(req.query.pageId) : undefined;

    // Slot already reserved on this page are excluded so the preview shows only free slots
    const bookedSlots = pageId ? await viralShortsService.getBookedSlotsForPage(pageId) : [];

    const slots = await viralShortsService.getViralPeakSlotsPreview(count, {
        horizonHours,
        bookedSlots,
    });

    res.status(200).json({ success: true, data: { count, slots } });
};

export const updateSource = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const sourceId = Number(req.params.id);

    const source = await getViralSourceModel().findOne({ where: { id: sourceId, userId } });
    if (!source) {
        throw new NotFoundError('Viral source not found');
    }

    const { name, keywords, minViews, publishedWithinDays, resultCount, targetPlatforms, useAiCaptions, autoImport, intervalHours, isActive } = req.body;

    const patch: any = {};
    if (typeof name === 'string' && name.trim()) patch.name = name.trim();
    if (typeof keywords !== 'undefined') {
        const kw = parseStringArray(keywords);
        if (kw.length) patch.keywords = kw;
    }
    if (typeof minViews !== 'undefined') patch.minViews = Math.max(0, Number(minViews) || 0);
    if (typeof publishedWithinDays !== 'undefined') patch.publishedWithinDays = Math.max(0, Number(publishedWithinDays) || 0);
    if (typeof resultCount !== 'undefined') patch.resultCount = Math.max(1, Math.min(15, Number(resultCount) || 8));
    if (Array.isArray(targetPlatforms) && targetPlatforms.length) patch.targetPlatforms = targetPlatforms;
    if (typeof useAiCaptions === 'boolean') patch.useAiCaptions = useAiCaptions;
    if (typeof autoImport === 'boolean') patch.autoImport = autoImport;
    if (typeof intervalHours !== 'undefined') patch.intervalHours = Math.max(1, Math.min(72, Number(intervalHours) || 6));
    if (typeof isActive === 'boolean') patch.isActive = isActive;

    await source.update(patch);

    res.status(200).json({ success: true, data: { source } });
};

export const toggleSource = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const sourceId = Number(req.params.id);

    const source = await getViralSourceModel().findOne({ where: { id: sourceId, userId } });
    if (!source) {
        throw new NotFoundError('Viral source not found');
    }

    source.isActive = typeof req.body?.isActive === 'boolean' ? Boolean(req.body.isActive) : !source.isActive;
    await source.save();

    res.status(200).json({ success: true, data: { source } });
};

export const deleteSource = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const sourceId = Number(req.params.id);

    const source = await getViralSourceModel().findOne({ where: { id: sourceId, userId } });
    if (!source) {
        throw new NotFoundError('Viral source not found');
    }

    await source.destroy();

    res.status(200).json({ success: true });
};

export default {
    listSources,
    createSource,
    discoverNow,
    importCandidates,
    syncSource,
    getPeakSlots,
    updateSource,
    toggleSource,
    deleteSource,
};