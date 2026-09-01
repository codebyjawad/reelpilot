import { Router } from 'express';
import * as growthController from '../controllers/growth.controller.js';
import { authenticateJWT, requireAuth } from '../middleware/auth.middleware.js';
import { wrapAsync } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticateJWT, requireAuth);

router.post('/find-groups', wrapAsync(growthController.findViralGroups));
router.post('/viral-hook', wrapAsync(growthController.generateViralHook));

export default router;
