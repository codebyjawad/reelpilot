import { Request, Response } from 'express';
import * as bulkService from '../services/bulk.service.js';
import { BadRequestError } from '../utils/errors.js';

export const importBulkReels = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { pageId, targetPlatforms, startAt, intervalHours, items } = req.body;

    if (!pageId || !Array.isArray(items) || items.length === 0) {
        throw new BadRequestError('pageId and a non-empty items array are required');
    }

    const { createdCount } = await bulkService.bulkImportReels({
        userId,
        pageId: Number(pageId),
        targetPlatforms,
        startAt,
        intervalHours: Number(intervalHours) || 3,
        items,
    });

    res.status(201).json({
        success: true,
        data: { createdCount },
    });
};
