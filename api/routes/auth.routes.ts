import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import {
    authenticateJWT,
    requireAuth,
} from '../middleware/auth.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { RegisterSchema, LoginSchema } from '../validations/auth.validation.js';
import { wrapAsync } from '../utils/asyncHandler.js';

const router = Router();

router.post(
    '/register',
    authLimiter,
    validateBody(RegisterSchema),
    wrapAsync(authController.register)
);

router.post(
    '/login',
    authLimiter,
    validateBody(LoginSchema),
    wrapAsync(authController.login)
);

router.post('/refresh', wrapAsync(authController.refresh));

router.post('/logout', wrapAsync(authController.logout));

router.get(
    '/me',
    authenticateJWT,
    requireAuth,
    wrapAsync(authController.me)
);

export default router;
