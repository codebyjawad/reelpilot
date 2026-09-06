import { Router } from 'express';
import { authenticateJWT, requireAuth } from '../middleware/auth.middleware.js';
import * as rssController from '../controllers/rss.controller.js';

const router = Router();

router.use(authenticateJWT, requireAuth);

router.get('/', rssController.listRssFeeds);
router.post('/', rssController.createRssFeed);
router.post('/:id/sync', rssController.syncRssFeedNow);
router.delete('/:id', rssController.deleteRssFeed);

export default router;
