import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import {
    authenticateJWT,
    requireAuth,
} from '../middleware/auth.middleware.js';
import { wrapAsync } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticateJWT, requireAuth);

router.get('/stats', wrapAsync(dashboardController.getStats));
router.get('/analytics', wrapAsync(dashboardController.getAnalytics));

export default router;
