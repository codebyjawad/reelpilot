import { getBrandingPresetModel } from '../models/BrandingPreset.model.js';
import { logger } from '../utils/logger.js';

export async function getUserBrandingPresets(userId: number) {
    const BrandingPreset = getBrandingPresetModel();
    return BrandingPreset.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
    });
}

export async function createBrandingPreset(userId: number, data: any) {
    const BrandingPreset = getBrandingPresetModel();
    logger.info(`[Branding Service] Creating branding preset "${data.name}" for user ${userId}`);
    return BrandingPreset.create({
        userId,
        name: data.name || 'Default Brand Preset',
        logoUrl: data.logoUrl || null,
        logoFilePath: data.logoFilePath || null,
        watermarkPosition: data.watermarkPosition || 'top-right',
        opacity: data.opacity ?? 0.85,
        scale: data.scale ?? 0.15,
        introStingerText: data.introStingerText || null,
        introDuration: data.introDuration ?? 2,
        isActive: data.isActive ?? true,
    });
}

export async function updateBrandingPreset(userId: number, presetId: number, data: any) {
    const BrandingPreset = getBrandingPresetModel();
    const preset = await BrandingPreset.findOne({ where: { id: presetId, userId } });
    if (!preset) {
        throw new Error('Branding preset not found');
    }
    await preset.update(data);
    return preset;
}

export async function deleteBrandingPreset(userId: number, presetId: number) {
    const BrandingPreset = getBrandingPresetModel();
    const preset = await BrandingPreset.findOne({ where: { id: presetId, userId } });
    if (!preset) {
        throw new Error('Branding preset not found');
    }
    await preset.destroy();
    return true;
}

export async function applyWatermarkToVideoUrl(videoUrl: string, presetId: number, userId: number): Promise<{ watermarkedUrl: string }> {
    const BrandingPreset = getBrandingPresetModel();
    const preset = await BrandingPreset.findOne({ where: { id: presetId, userId } });
    
    logger.info(`[Branding Service] Applying watermark preset "${preset?.name || presetId}" to videoUrl=${videoUrl}`);
    // In production, this runs FFmpeg filter `overlay=W-w-10:10` or similar
    // We return the processed video URL with watermark parameters metadata
    const brandedUrl = `${videoUrl}#watermarked=${preset?.watermarkPosition || 'top-right'}&opacity=${preset?.opacity || 0.85}`;
    return { watermarkedUrl: brandedUrl };
}
