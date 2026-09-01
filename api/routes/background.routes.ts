import { Router } from 'express';
import * as backgroundController from '../controllers/background.controller.js';
import { authenticateJWT, requireAuth } from '../middleware/auth.middleware.js';
import { wrapAsync } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticateJWT, requireAuth);

router.get('/status', wrapAsync(backgroundController.getStatus));
router.post('/retry', wrapAsync(backgroundController.triggerAutoRetry));

export default router;
