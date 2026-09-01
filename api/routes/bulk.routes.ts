import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import * as bulkController from '../controllers/bulk.controller.js';

const router = Router();

router.use(authenticateJWT);

router.post('/', bulkController.importBulkReels);

export default router;
