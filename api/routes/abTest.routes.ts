import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import {
    getAbTestsHandler,
    createAbTestHandler,
    evaluateWinnerHandler,
} from '../controllers/abTest.controller.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', getAbTestsHandler);
router.post('/', createAbTestHandler);
router.post('/:id/evaluate', evaluateWinnerHandler);

export default router;
