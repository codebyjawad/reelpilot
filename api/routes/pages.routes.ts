import { Router, Request, Response, NextFunction } from 'express';
import * as pagesController from '../controllers/pages.controller.js';
import {
    authenticateJWT,
    requireAuth,
} from '../middleware/auth.middleware.js';
import { wrapAsync } from '../utils/asyncHandler.js';

const router = Router();

router.get(
    '/facebook/callback',
    authenticateJWT,
    wrapAsync(pagesController.handleFacebookCallback)
);

router.use(authenticateJWT, requireAuth);

router.get('/', wrapAsync(pagesController.listPages));
router.get('/:id/reels', wrapAsync(pagesController.fetchPageReels));
router.post('/:id/import-reel', wrapAsync(pagesController.importPageReel));
router.delete('/:id', wrapAsync(pagesController.disconnectPage));
router.post('/bulk-disconnect', wrapAsync(pagesController.bulkDisconnect));
router.get('/facebook/auth-url', wrapAsync(pagesController.getFacebookAuthUrl));
router.get('/facebook/pending', wrapAsync(pagesController.getPendingPages));
router.post('/facebook/connect-selected', wrapAsync(pagesController.connectSelectedPages));
router.post('/manual', wrapAsync(pagesController.connectManual));

export default router;

