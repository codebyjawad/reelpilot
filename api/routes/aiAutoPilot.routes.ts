import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import * as aiAutoPilotController from '../controllers/aiAutoPilot.controller.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', aiAutoPilotController.listAutoPilots);
router.post('/', aiAutoPilotController.createAutoPilot);
router.post('/suggest-topics', aiAutoPilotController.suggestTopics);
router.post('/preview-generate', aiAutoPilotController.previewGenerate);
router.post('/publish-preview', aiAutoPilotController.publishPreviewPost);
router.put('/:id', aiAutoPilotController.updateAutoPilot);


router.patch('/:id', aiAutoPilotController.toggleAutoPilot);
router.delete('/:id', aiAutoPilotController.deleteAutoPilot);
router.get('/:id/logs', aiAutoPilotController.getPostLogs);
router.get('/logs', aiAutoPilotController.getPostLogs);
router.post('/:id/run', aiAutoPilotController.runNow);

export default router;
