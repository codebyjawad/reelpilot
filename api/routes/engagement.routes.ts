import { Router } from 'express';
import { authenticateJWT } from '../middleware/auth.middleware.js';
import {
    getRulesHandler,
    createRuleHandler,
    updateRuleHandler,
    deleteRuleHandler,
    testCommentReplyHandler,
} from '../controllers/engagement.controller.js';

const router = Router();

router.use(authenticateJWT);

router.get('/', getRulesHandler);
router.post('/', createRuleHandler);
router.put('/:id', updateRuleHandler);
router.delete('/:id', deleteRuleHandler);
router.post('/evaluate', testCommentReplyHandler);

export default router;
