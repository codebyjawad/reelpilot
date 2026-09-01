import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import {
    getPresetsHandler,
    createPresetHandler,
    updatePresetHandler,
    deletePresetHandler,
    applyWatermarkHandler,
} from '../controllers/branding.controller.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', getPresetsHandler);
router.post('/', createPresetHandler);
router.put('/:id', updatePresetHandler);
router.delete('/:id', deletePresetHandler);
router.post('/apply', applyWatermarkHandler);

export default router;
