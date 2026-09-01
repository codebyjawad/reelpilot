import { Router } from 'express';
import * as commentsController from '../controllers/comments.controller.js';
import { authenticateJWT, requireAuth } from '../middleware/auth.middleware.js';
import { wrapAsync } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticateJWT, requireAuth);

router.get('/reel/:reelId', wrapAsync(commentsController.getReelComments));
router.post('/generate-reply', wrapAsync(commentsController.generateAiReply));
router.post('/reply', wrapAsync(commentsController.postReply));
router.post('/auto-bot/:reelId', wrapAsync(commentsController.runAutoBot));

export default router;
