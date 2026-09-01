import { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import {
    attachRefreshCookie,
    clearRefreshCookie,
    refreshAccessTokenHandler,
} from '../middleware/auth.middleware.js';

export const register = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.register(req.body);

    attachRefreshCookie(res, result.refreshToken);

    res.status(201).json({
        success: true,
        data: {
            accessToken: result.accessToken,
            user: result.user,
        },
    });
};

export const login = async (req: Request, res: Response): Promise<void> => {
    const result = await authService.login(req.body);

    attachRefreshCookie(res, result.refreshToken);

    res.status(200).json({
        success: true,
        data: {
            accessToken: result.accessToken,
            user: result.user,
        },
    });
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
    await refreshAccessTokenHandler(req, res);
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
    clearRefreshCookie(res);
    res.status(200).json({
        success: true,
    });
};

export const me = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const user = await authService.getProfile(userId);

    res.status(200).json({
        success: true,
        data: {
            user,
        },
    });
};

export default {
    register,
    login,
    refresh,
    logout,
    me,
};
