import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { getUserModel } from '../models/User.model.js';
import type { UserModel } from '../models/User.model.js';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
                email: string;
            };
        }
    }
}

export const authenticateJWT = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
    }

    const token = authHeader.slice(7);
    if (!token) {
        return next();
    }

    try {
        const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as jwt.JwtPayload;
        if (payload && typeof payload.sub === 'number' && typeof payload.email === 'string') {
            req.user = {
                id: payload.sub,
                email: payload.email,
            };
        }
    } catch (err: any) {
        logger.debug(`JWT verification failed: ${err?.message ?? 'unknown'}`);
    }

    return next();
};

export const requireAuth = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            error: 'Authentication required',
        });
        return;
    }
    next();
};

export const issueAccessToken = (user: { id: number; email: string }): string => {
    return jwt.sign(
        { sub: user.id, email: user.email },
        config.JWT_ACCESS_SECRET,
        { expiresIn: config.ACCESS_TTL as any }
    );
};

export const issueRefreshToken = (user: { id: number }): string => {
    return jwt.sign(
        { sub: user.id },
        config.JWT_REFRESH_SECRET,
        { expiresIn: config.REFRESH_TTL as any }
    );
};

export const attachRefreshCookie = (res: Response, token: string): void => {
    res.cookie('refresh_token', token, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 3600 * 1000,
        path: '/api/auth',
    });
};

export const clearRefreshCookie = (res: Response): void => {
    res.clearCookie('refresh_token', { path: '/api/auth' });
};

export const getUserById = async (id: number) => {
    return getUserModel().findByPk(id);
};

export const refreshAccessTokenHandler = async (
    req: Request,
    res: Response
): Promise<void> => {
    const token = req.cookies?.refresh_token;
    if (!token) {
        res.status(401).json({
            success: false,
            error: 'No refresh token provided',
        });
        return;
    }

    try {
        const payload = jwt.verify(token, config.JWT_REFRESH_SECRET) as jwt.JwtPayload;
        if (!payload || typeof payload.sub !== 'number') {
            clearRefreshCookie(res);
            res.status(401).json({
                success: false,
                error: 'Invalid refresh token',
            });
            return;
        }

        const user = await getUserById(payload.sub);
        if (!user) {
            clearRefreshCookie(res);
            res.status(401).json({
                success: false,
                error: 'User not found',
            });
            return;
        }

        const userData = user as any;
        const accessToken = issueAccessToken({
            id: userData.id,
            email: userData.email,
        });

        res.status(200).json({
            success: true,
            accessToken,
        });
    } catch (err: any) {
        logger.debug(`Refresh token verification failed: ${err?.message ?? 'unknown'}`);
        clearRefreshCookie(res);
        res.status(401).json({
            success: false,
            error: 'Invalid or expired refresh token',
        });
    }
};
