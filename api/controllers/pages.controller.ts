import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { config } from '../config/index.js';
import * as pagesService from '../services/pages.service.js';
import * as facebookService from '../services/facebook.service.js';
import { ForbiddenError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

type StateEntry = { userId: number; expiresAt: number };
const FB_STATE_REGISTRY = new Map<string, StateEntry>();
const STATE_TTL_MS = 10 * 60 * 1000;

const pruneStateRegistry = (): void => {
    const now = Date.now();
    for (const [k, v] of FB_STATE_REGISTRY.entries()) {
        if (v.expiresAt < now) FB_STATE_REGISTRY.delete(k);
    }
};

const registerOAuthState = (state: string, userId: number): void => {
    pruneStateRegistry();
    FB_STATE_REGISTRY.set(state, { userId, expiresAt: Date.now() + STATE_TTL_MS });
};

const resolveOAuthState = (state: string): number | null => {
    pruneStateRegistry();
    const entry = FB_STATE_REGISTRY.get(state);
    if (!entry || entry.expiresAt < Date.now()) {
        FB_STATE_REGISTRY.delete(state);
        return null;
    }
    FB_STATE_REGISTRY.delete(state);
    return entry.userId;
};

export const listPages = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const pages = await pagesService.listPages(userId);

    res.status(200).json({
        success: true,
        data: { pages },
    });
};

export const disconnectPage = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const pageId = Number(req.params.id);

    await pagesService.disconnectPage(userId, pageId);

    res.status(200).json({
        success: true,
    });
};

export const bulkDisconnect = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { pageIds } = req.body;

    if (!Array.isArray(pageIds) || pageIds.length === 0) {
        res.status(400).json({ success: false, error: 'pageIds array is required' });
        return;
    }

    const count = await pagesService.bulkDisconnectPages(userId, pageIds.map(Number));
    res.status(200).json({
        success: true,
        data: { count },
    });
};

export const getFacebookAuthUrl = async (req: Request, res: Response): Promise<void> => {
    const state = randomUUID();

    if (req.user?.id && typeof req.user.id === 'number') {
        registerOAuthState(state, req.user.id);
    }

    res.cookie('fb_state', state, {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: STATE_TTL_MS,
    });

    const credsReady = facebookService.facebookCredentialsAvailable();
    const authUrl = credsReady ? facebookService.generateAuthUrl(state) : null;

    res.status(200).json({
        success: true,
        data: {
            authUrl,
            facebookConfigured: credsReady,
        },
    });
};

type PendingOAuthSession = {
    userId: number;
    pages: facebookService.FbPageResult[];
    expiresAt: number;
};
const PENDING_OAUTH_SESSIONS = new Map<string, PendingOAuthSession>();

const prunePendingSessions = (): void => {
    const now = Date.now();
    for (const [k, v] of PENDING_OAUTH_SESSIONS.entries()) {
        if (v.expiresAt < now) PENDING_OAUTH_SESSIONS.delete(k);
    }
};

export const handleFacebookCallback = async (req: Request, res: Response): Promise<void> => {
    const { code, state } = req.query;
    const cookieState = req.cookies?.fb_state;

    res.clearCookie('fb_state');

    if (!state || state !== cookieState) {
        logger.warn('Facebook callback: state mismatch or missing');
        res.redirect(`${config.FRONTEND_URL}/pages?connected=0&error=invalid_state`);
        return;
    }

    if (!code || typeof code !== 'string') {
        logger.warn('Facebook callback: code missing');
        res.redirect(`${config.FRONTEND_URL}/pages?connected=0&error=no_code`);
        return;
    }

    try {
        const userAccessToken = await facebookService.exchangeCodeForUserAccessToken(code);
        const fbPages = await facebookService.getUserPagesWithTokens(userAccessToken);

        const stateStr = typeof state === 'string' ? state : '';
        let userId: number | null = req.user?.id ?? null;
        if (!userId && stateStr) {
            userId = resolveOAuthState(stateStr);
        }

        if (!userId) {
            logger.warn('Facebook callback: no user id available to associate pages');
            res.redirect(`${config.FRONTEND_URL}/pages?connected=0&error=no_user`);
            return;
        }

        if (fbPages.length === 0) {
            logger.info(`Facebook callback: 0 pages found for user=${userId}`);
            res.redirect(`${config.FRONTEND_URL}/pages?connected=0&error=no_pages_found`);
            return;
        }

        // Store candidate pages in a temporary session so the user can choose which ones to connect
        prunePendingSessions();
        const sessionId = randomUUID();
        PENDING_OAUTH_SESSIONS.set(sessionId, {
            userId,
            pages: fbPages,
            expiresAt: Date.now() + 15 * 60 * 1000,
        });

        logger.info(`Facebook callback: stored ${fbPages.length} pending pages for session=${sessionId} user=${userId}`);
        res.redirect(`${config.FRONTEND_URL}/pages?oauth_session=${sessionId}`);
    } catch (err: any) {
        const errName = err?.name ?? '';
        const rawMsg = err?.message ?? 'unknown_error';
        let detail = rawMsg;
        if (errName === 'SequelizeValidationError' && Array.isArray(err.errors) && err.errors.length) {
            detail = err.errors.map((e: any) => `${e.path || 'field'}: ${e.message}`).join('; ');
        } else if (errName === 'SequelizeUniqueConstraintError' && Array.isArray(err.errors) && err.errors.length) {
            detail = err.errors.map((e: any) => `${e.path || 'field'}: ${e.message}`).join('; ');
        } else if (errName === 'ZodError' && Array.isArray(err.issues) && err.issues.length) {
            detail = err.issues.map((e: any) => `${(e.path || []).join('.') || 'field'}: ${e.message}`).join('; ');
        }
        logger.error(`Facebook callback error [${errName}]: ${detail}`, {
            stack: err?.stack,
            errors: err?.errors ? JSON.stringify(err.errors).slice(0, 800) : undefined,
            fbCode: err?.fbCode ?? err?.code ?? undefined,
        });
        const msg = encodeURIComponent(detail || rawMsg);
        res.redirect(`${config.FRONTEND_URL}/pages?connected=0&error=${msg}`);
    }
};

export const getPendingPages = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const sessionId = String(req.query.sessionId || '');

    prunePendingSessions();
    const session = PENDING_OAUTH_SESSIONS.get(sessionId);

    if (!session || session.userId !== userId) {
        res.status(404).json({ success: false, error: 'Session expired or not found' });
        return;
    }

    // Return safe list of pages for user selection
    const pages = session.pages.map((p) => ({
        fbPageId: p.fbPageId,
        name: p.name,
        avatarUrl: p.avatarUrl,
        permissions: p.permissions,
    }));

    res.status(200).json({ success: true, data: { pages } });
};

export const connectSelectedPages = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { sessionId, selectedFbPageIds } = req.body;

    if (!sessionId || !Array.isArray(selectedFbPageIds) || selectedFbPageIds.length === 0) {
        res.status(400).json({ success: false, error: 'sessionId and selectedFbPageIds array are required' });
        return;
    }

    prunePendingSessions();
    const session = PENDING_OAUTH_SESSIONS.get(sessionId);

    if (!session || session.userId !== userId) {
        res.status(404).json({ success: false, error: 'Session expired or not found' });
        return;
    }

    const pagesToSave = session.pages
        .filter((p) => selectedFbPageIds.includes(p.fbPageId))
        .map((p) => ({
            fbPageId: p.fbPageId,
            name: p.name,
            avatarUrl: p.avatarUrl,
            accessToken: p.accessToken,
            permissions: p.permissions,
        }));

    const saved = await pagesService.upsertFacebookPagesForUser(userId, pagesToSave);
    PENDING_OAUTH_SESSIONS.delete(sessionId);

    logger.info(`User ${userId} selected and connected ${saved.length} Facebook page(s)`);
    res.status(200).json({ success: true, data: { count: saved.length, pages: saved } });
};

export const connectManual = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const { fbPageId, accessToken, name } = req.body;

    if (!fbPageId || !accessToken) {
        res.status(400).json({ success: false, error: 'fbPageId and accessToken are required' });
        return;
    }

    const page = await pagesService.connectManualPage(userId, String(fbPageId), String(accessToken), name);
    res.status(200).json({ success: true, data: { page } });
};

export const fetchPageReels = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const pageId = Number(req.params.id);
    const limit = Number(req.query.limit || req.body?.limit || 10);

    const result = await pagesService.fetchPageReels(userId, pageId, limit);
    res.status(200).json({
        success: true,
        data: result,
    });
};

export const importPageReel = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user!.id;
    const pageId = Number(req.params.id);
    const { title, description, videoUrl, thumbnailUrl, facebookPostId, permalinkUrl } = req.body;

    const reel = await pagesService.importPageReel(userId, pageId, {
        title,
        description,
        videoUrl,
        thumbnailUrl,
        facebookPostId,
        permalinkUrl,
    });

    res.status(201).json({
        success: true,
        data: { reel },
    });
};

export default {
    listPages,
    disconnectPage,
    bulkDisconnect,
    getFacebookAuthUrl,
    handleFacebookCallback,
    getPendingPages,
    connectSelectedPages,
    connectManual,
    fetchPageReels,
    importPageReel,
};



