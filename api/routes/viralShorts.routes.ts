import { Router } from 'express';
import { authenticateJWT, requireAuth } from '../middleware/auth.middleware.js';
import * as viralShortsController from '../controllers/viralShorts.controller.js';
import { wrapAsync } from '../utils/asyncHandler.js';

const router = Router();

router.use(authenticateJWT, requireAuth);

router.get('/', wrapAsync(viralShortsController.listSources));
router.post('/', wrapAsync(viralShortsController.createSource));
router.post('/discover', wrapAsync(viralShortsController.discoverNow));
router.post('/import', wrapAsync(viralShortsController.importCandidates));
router.get('/peak-slots', wrapAsync(viralShortsController.getPeakSlots));
router.post('/:id/sync', wrapAsync(viralShortsController.syncSource));
router.put('/:id', wrapAsync(viralShortsController.updateSource));
router.patch('/:id/toggle', wrapAsync(viralShortsController.toggleSource));
router.delete('/:id', wrapAsync(viralShortsController.deleteSource));

export default router;