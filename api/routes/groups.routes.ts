import { Router } from 'express';
import * as groupsController from '../controllers/groups.controller.js';
import { authenticateJWT, requireAuth } from '../middleware/auth.middleware.js';
import { wrapAsync } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticateJWT, requireAuth);

router.get('/', wrapAsync(groupsController.list));
router.get('/activity', wrapAsync(groupsController.getActivity));
router.post('/connect', wrapAsync(groupsController.connect));
router.post('/sync', wrapAsync(groupsController.sync));
router.put('/:id', wrapAsync(groupsController.update));
router.delete('/:id', wrapAsync(groupsController.remove));
router.post('/:id/publish', wrapAsync(groupsController.publishToGroup));

export default router;
