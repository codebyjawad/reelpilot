import type { Request, Response } from 'express';
import { publishReelToYouTubeShorts } from '../services/youtube.service.js';
import { logger } from '../utils/logger.js';

export async function publishShortHandler(req: Request, res: Response) {
    try {
        const { title, caption, hashtags, videoUrl, videoFilePath } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required for YouTube Short' });
        }

        const result = await publishReelToYouTubeShorts({
            title,
            caption,
            hashtags,
            videoUrl,
            videoFilePath,
        });

        return res.json({
            success: true,
            data: result,
        });
    } catch (err: any) {
        logger.error(`[YouTube Controller Error]: ${err.message}`);
        return res.status(500).json({ success: false, error: err.message });
    }
}

export async function getYouTubeChannelInfoHandler(_req: Request, res: Response) {
    return res.json({
        success: true,
        data: {
            connected: true,
            channelName: 'ReelPilot Studio (Demo)',
            subscriberCount: '14,280',
            totalShorts: 142,
            privacyDefault: 'public',
        },
    });
}
