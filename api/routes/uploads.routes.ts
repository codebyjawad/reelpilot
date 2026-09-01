import { Router, Request, Response } from 'express';
import { resolve } from 'path';
import fs from 'fs';
import { z } from 'zod';
import {
    authenticateJWT,
    requireAuth,
} from '../middleware/auth.middleware.js';
import { config } from '../config/index.js';
import { NotFoundError } from '../utils/errors.js';
import { wrapAsync } from '../utils/asyncHandler.js';

const router = Router();

const FilenameSchema = z.object({
    filename: z
        .string()
        .regex(
            /^[a-zA-Z0-9-]+\.(mp4|mov|webm|mkv|avi)$/i,
            'Invalid filename'
        ),
});

router.use(authenticateJWT, requireAuth);

router.get(
    '/video/:filename',
    wrapAsync(async (req: Request, res: Response) => {
        const parsed = FilenameSchema.safeParse(req.params);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: 'Invalid filename',
            });
            return;
        }

        const filename = parsed.data.filename;
        const filePath = resolve(config.UPLOAD_DIR, 'videos', filename);

        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
        } catch (_err) {
            throw new NotFoundError('Video file not found');
        }

        res.sendFile(filePath);
    })
);

export default router;
