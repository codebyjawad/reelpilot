import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import { publishShortHandler, getYouTubeChannelInfoHandler } from '../controllers/youtube.controller.js';

const router = Router();

router.use(authenticateJWT);

router.get('/channel', getYouTubeChannelInfoHandler);
router.post('/publish', publishShortHandler);

export default router;
