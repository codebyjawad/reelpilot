import type { Request, Response } from 'express';
import {
    getUserBrandingPresets,
    createBrandingPreset,
    updateBrandingPreset,
    deleteBrandingPreset,
    applyWatermarkToVideoUrl,
} from '../services/branding.service.js';

export async function getPresetsHandler(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const presets = await getUserBrandingPresets(userId);
        return res.json({ success: true, data: presets });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
}

export async function createPresetHandler(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const preset = await createBrandingPreset(userId, req.body);
        return res.status(201).json({ success: true, data: preset });
    } catch (err: any) {
        return res.status(400).json({ success: false, error: err.message });
    }
}

export async function updatePresetHandler(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const presetId = Number(req.params.id);
        const preset = await updateBrandingPreset(userId, presetId, req.body);
        return res.json({ success: true, data: preset });
    } catch (err: any) {
        return res.status(400).json({ success: false, error: err.message });
    }
}

export async function deletePresetHandler(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const presetId = Number(req.params.id);
        await deleteBrandingPreset(userId, presetId);
        return res.json({ success: true, message: 'Branding preset deleted' });
    } catch (err: any) {
        return res.status(400).json({ success: false, error: err.message });
    }
}

export async function applyWatermarkHandler(req: Request, res: Response) {
    try {
        const userId = req.user!.id;
        const { videoUrl, presetId } = req.body;
        if (!videoUrl || !presetId) {
            return res.status(400).json({ success: false, error: 'videoUrl and presetId are required' });
        }
        const result = await applyWatermarkToVideoUrl(videoUrl, Number(presetId), userId);
        return res.json({ success: true, data: result });
    } catch (err: any) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
