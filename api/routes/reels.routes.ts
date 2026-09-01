import { Router, Request, Response, NextFunction } from 'express';
import * as reelsController from '../controllers/reels.controller.js';
import {
    authenticateJWT,
    requireAuth,
} from '../middleware/auth.middleware.js';
import { uploadVideo } from '../middleware/upload.middleware.js';
import {
    validateBody,
    validateQuery,
} from '../middleware/validation.middleware.js';
import {
    CreateReelSchema,
    ReelQuerySchema,
    UpdateReelSchema,
} from '../validations/reels.validation.js';
import { wrapAsync } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticateJWT, requireAuth);

const conditionalUpload = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const contentType = req.headers['content-type'] ?? '';
    if (contentType.startsWith('multipart/form-data')) {
        uploadVideo(req, res, (err?: any) => {
            if (err) {
                return res.status(400).json({
                    success: false,
                    error: err?.message || 'Upload failed',
                });
            }
            next();
        });
    } else {
        next();
    }
};

router.post(
    '/',
    conditionalUpload,
    (req: Request, res: Response, next: NextFunction) => {
        const contentType = req.headers['content-type'] ?? '';
        if (contentType.startsWith('multipart/form-data')) {
            next();
        } else {
            validateBody(CreateReelSchema)(req, res, next);
        }
    },
    wrapAsync(reelsController.create)
);

router.get(
    '/',
    validateQuery(ReelQuerySchema),
    wrapAsync(reelsController.list)
);

// ── Static named routes MUST come before /:id ──────────────────────────────
// Otherwise Express matches e.g. "peak-heatmap" as { id: "peak-heatmap" }
// which causes getById to run with NaN and crash SQLite.

router.post('/ai-generate', wrapAsync(reelsController.generateAiContent));

router.post('/ai-subtitles', wrapAsync(reelsController.generateAiSubtitles));

router.post('/ai-thumbnail', wrapAsync(reelsController.generateAiThumbnail));

router.get('/peak-times', wrapAsync(reelsController.getPeakTimes));

router.get('/peak-heatmap', wrapAsync(reelsController.getPeakHeatmap));

router.get('/recycling/candidates', wrapAsync(reelsController.getRecyclingCandidates));

// ── Dynamic /:id routes ────────────────────────────────────────────────────

router.get('/:id', wrapAsync(reelsController.get));

router.put(
    '/:id',
    conditionalUpload,
    wrapAsync(reelsController.update)
);

router.delete('/:id', wrapAsync(reelsController.remove));

router.post('/:id/publish-now', wrapAsync(reelsController.publishNow));

router.post('/:id/retry', wrapAsync(reelsController.retry));

router.post('/:id/recycle', wrapAsync(reelsController.recycleReel));

export default router;
