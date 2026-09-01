import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pipeline } from 'stream/promises';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { FacebookApiError } from '../utils/errors.js';
import type { VideoSource } from '../../shared/types.js';

const YOUTUBE_HOST_RE = /(^|\.)(youtube\.com|youtu\.be|youtube-nocookie\.com)$/i;
const isYouTubeUrl = (u: string): boolean => {
    try {
        const parsed = new URL(u);
        return YOUTUBE_HOST_RE.test(parsed.hostname);
    } catch { return false; }
};

// Resolve path to the yt-dlp binary bundled with @distube/yt-dlp
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const YTDLP_BIN = path.resolve(
    __dirname, '..', '..', 'node_modules', '@distube', 'yt-dlp', 'bin',
    process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
);

/**
 * Download a YouTube video (including Shorts) to a temp MP4 file using
 * yt-dlp. This is more reliable than ytdl-core which breaks whenever
 * YouTube updates its player cipher.
 */
const downloadYouTubeToTempFile = async (youtubeUrl: string): Promise<string> => {
    const tmpDir = os.tmpdir();
    const fileName = `rp_reel_yt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.mp4`;
    const tmpPath = path.join(tmpDir, fileName);

    if (!fs.existsSync(YTDLP_BIN)) {
        throw new FacebookApiError(
            `yt-dlp binary not found at ${YTDLP_BIN}. Run: npm install @distube/yt-dlp@latest`
        );
    }

    logger.info(`[Reels] yt-dlp download start: ${youtubeUrl} → ${tmpPath}`);

    const possibleCookiePaths = [
        path.resolve(process.cwd(), 'cookies.txt'),
        path.resolve(process.cwd(), 'data', 'cookies.txt'),
    ];
    let cookiesArg: string[] = [];
    for (const cp of possibleCookiePaths) {
        if (fs.existsSync(cp)) {
            cookiesArg = ['--cookies', cp];
            logger.info(`[Reels] Using yt-dlp cookies file: ${cp}`);
            break;
        }
    }

    await new Promise<void>((resolve, reject) => {
        // -f: prefer best combined mp4; fallback to bestvideo+bestaudio merged into mp4
        // --merge-output-format mp4: ensures the output container is always mp4
        // --no-playlist: only download the single video, not the whole playlist
        // -o: output path
        // -4: force IPv4 (this server's IPv6 egress is blackholed; yt-dlp would hang forever otherwise)
        // --js-runtimes: allow Node to solve YouTube's JS challenge / PO-token check so video
        //   formats are returned (datacenter IPs otherwise get storyboards only)
        const args = [
            youtubeUrl,
            ...cookiesArg,
            '-4',
            '--js-runtimes', `node:${process.execPath}`,
            '--extractor-args', 'youtube:player_client=web_embedded',
            '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best[ext=mp4]/best',
            '--merge-output-format', 'mp4',
            '--no-playlist',
            '--no-part',          // write directly to output, no .part files
            '--socket-timeout', '30',
            '-o', tmpPath,
        ];

        const proc = spawn(YTDLP_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stderr = '';
        let timer: NodeJS.Timeout | null = setTimeout(() => {
            try { proc.kill('SIGKILL'); } catch (_) { }
            reject(new FacebookApiError('YouTube download timed out (75s). YouTube is rate-limiting or challenging this server IP. Please upload the MP4 video directly.'));
        }, 75_000);

        proc.stdout?.on('data', (d: Buffer) => logger.debug(`[yt-dlp] ${d.toString().trim()}`));
        proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

        proc.on('close', (code) => {
            if (timer) { clearTimeout(timer); timer = null; }
            if (code === 0) {
                resolve();
            } else {
                let friendlyMsg = `yt-dlp exited with code ${code}.`;
                if (stderr.includes('Sign in to confirm') || stderr.includes('bot')) {
                    friendlyMsg = 'YouTube blocked automated download on this server IP ("Sign in to confirm you’re not a bot"). Tip: Upload the MP4 video directly instead of using a YouTube URL, or export a cookies.txt file into the app directory.';
                } else if (stderr) {
                    friendlyMsg += ` stderr: ${stderr.slice(-300)}`;
                }
                reject(new FacebookApiError(friendlyMsg));
            }
        });
        proc.on('error', (err) => {
            if (timer) { clearTimeout(timer); timer = null; }
            reject(new FacebookApiError(`Failed to spawn yt-dlp: ${err.message}`));
        });
    });

    const size = fs.existsSync(tmpPath) ? fs.statSync(tmpPath).size : 0;
    const MIN_YT_BYTES = 50_000;
    if (size < MIN_YT_BYTES) {
        throw new FacebookApiError(
            `yt-dlp download produced a tiny file (${size} bytes). The video may be private, age-restricted, or unavailable.`
        );
    }
    logger.info(`[Reels] yt-dlp download OK size=${size} path=${tmpPath}`);
    return tmpPath;
};

const FB_VERSION = 'v20.0';

const api: AxiosInstance = axios.create({
    baseURL: `https://graph.facebook.com/${FB_VERSION}`,
    timeout: 120_000,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const data = error?.response?.data;
        logger.warn(
            `Facebook API error: status=${status} message=${data?.error?.message ?? error?.message ?? 'unknown'}`
        );
        return Promise.reject(error);
    }
);

export function facebookCredentialsAvailable(): boolean {
    const id = config.FACEBOOK_APP_ID?.trim();
    const sec = config.FACEBOOK_APP_SECRET?.trim();
    return !!id && !!sec &&
        id !== 'your_fb_app_id' &&
        id !== 'your_facebook_app_id' &&
        id !== '<your-app-id>' &&
        sec !== 'your_fb_app_secret' &&
        sec !== 'your_facebook_app_secret' &&
        sec !== '<your-app-secret>';
}

export const generateAuthUrl = (state?: string): string => {
    if (!facebookCredentialsAvailable()) {
        throw new FacebookApiError(
            'Facebook App credentials are not configured yet. Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in the .env file (you can also use Demo Pages Mode to preview the workflow without real credentials).',
            undefined,
            'FACEBOOK_CREDENTIALS_MISSING'
        );
    }

    const scope = [
        'public_profile',
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',       // required for /video_reels publish
        'pages_manage_metadata',    // required to read page access tokens
        'pages_manage_engagement',  // required to manage reel interactions
        'read_insights',            // optional: reel analytics
        'business_management',      // required for pages managed under Meta Business Portfolios
    ].join(',');

    const params = new URLSearchParams({
        client_id: config.FACEBOOK_APP_ID,
        redirect_uri: config.FACEBOOK_CALLBACK_URL,
        scope,
        response_type: 'code',
        auth_type: 'rerequest',
    });

    if (state) {
        params.set('state', state);
    }

    return `https://www.facebook.com/${FB_VERSION}/dialog/oauth?${params.toString()}`;
};

export const exchangeCodeForUserAccessToken = async (
    code: string
): Promise<string> => {
    try {
        const response = await api.get('/oauth/access_token', {
            params: {
                client_id: config.FACEBOOK_APP_ID,
                client_secret: config.FACEBOOK_APP_SECRET,
                redirect_uri: config.FACEBOOK_CALLBACK_URL,
                code,
            },
        });

        return response.data.access_token;
    } catch (err: any) {
        const fbMsg = err?.response?.data?.error?.message ?? err?.message;
        const fbCode = err?.response?.data?.error?.code ?? err?.response?.status;
        throw new FacebookApiError(`Failed to exchange code: ${fbMsg}`, fbCode, fbMsg);
    }
};

export interface FbPageResult {
    fbPageId: string;
    name: string;
    avatarUrl?: string;
    accessToken: string;
    permissions: string[];
}

export const getUserPagesWithTokens = async (
    userAccessToken: string
): Promise<FbPageResult[]> => {
    try {
        // 1. Direct user accounts
        const response = await api.get('/me/accounts', {
            params: {
                fields: 'id,name,access_token,category,cover,tasks,picture{url}',
                access_token: userAccessToken,
            },
        });

        let data = response.data?.data ?? [];

        // 2. If no direct pages found, check for Business Portfolio pages
        if (data.length === 0) {
            try {
                const busRes = await api.get('/me/businesses', {
                    params: { access_token: userAccessToken, fields: 'id,name' },
                });
                const businesses = busRes.data?.data ?? [];
                for (const b of businesses) {
                    const bPagesRes = await api.get(`/${b.id}/owned_pages`, {
                        params: {
                            fields: 'id,name,access_token,category,cover,tasks,picture{url}',
                            access_token: userAccessToken,
                        },
                    });
                    const bPages = bPagesRes.data?.data ?? [];
                    if (bPages.length > 0) {
                        data = [...data, ...bPages];
                    }
                }
            } catch (busErr) {
                logger.debug('[Facebook] /me/businesses check skipped or not permitted');
            }
        }

        return data.map((item: any) => ({
            fbPageId: String(item.id),
            name: item.name,
            avatarUrl: item.picture?.data?.url,
            accessToken: item.access_token,
            permissions: Array.isArray(item.tasks) ? item.tasks : [],
        }));
    } catch (err: any) {
        const fbMsg = err?.response?.data?.error?.message ?? err?.message;
        const fbCode = err?.response?.data?.error?.code ?? err?.response?.status;
        throw new FacebookApiError(
            `Failed to fetch user pages: ${fbMsg}`,
            fbCode,
            fbMsg
        );
    }
};

const buildDescription = (
    caption: string | null | undefined,
    hashtags: string[] | null | undefined
): string => {
    const cap = caption ?? '';
    const tags = (hashtags ?? []).map((h) =>
        h.startsWith('#') ? h : '#' + h
    );
    if (tags.length === 0) return cap;
    return cap + (cap.length ? '\n\n' : '') + tags.join(' ');
};

interface PageContext {
    fbPageId: string;
    accessToken: string;
}

interface ReelContext {
    title: string;
    caption?: string | null;
    hashtags?: string[];
    videoSource: VideoSource;
    videoUrl?: string | null;
    videoFilePath?: string | null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const checkPublishStatus = async (
    page: PageContext,
    containerId: string
): Promise<{
    videoStatus: string;
    publishingPhaseStatus: string;
    published: boolean;
    id?: string;
    permalinkUrl?: string;
}> => {
    const response = await api.get(`/${containerId}`, {
        params: {
            access_token: page.accessToken,
            fields: 'id,status,published,format,permalink_url,post_id',
        },
    });

    const statusBlock = response.data?.status ?? {};
    const publishingPhase = statusBlock?.publishing_phase ?? {};
    return {
        videoStatus: statusBlock?.video_status ?? 'unknown',
        publishingPhaseStatus: publishingPhase?.status ?? 'not_started',
        published: response.data?.published === true,
        id: response.data?.id,
        permalinkUrl: response.data?.permalink_url,
    };
};

const downloadToTempFile = async (url: string): Promise<string> => {
    const tmpDir = os.tmpdir();
    const fileName = `rp_reel_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.mp4`;
    const tmpPath = path.join(tmpDir, fileName);

    const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 300_000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        validateStatus: (s) => s >= 200 && s < 300,
        decompress: true,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
            'Accept': 'video/mp4,video/webm,video/*;q=0.9,application/octet-stream;q=0.8,*/*;q=0.7',
            'Sec-Fetch-Site': 'cross-site',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            'Accept-Language': 'en-US,en;q=0.9',
        },
    });

    const contentType = String(response.headers?.['content-type'] ?? '').toLowerCase();
    if (contentType.includes('text/html') || contentType.includes('text/')) {
        throw new FacebookApiError(
            `The provided video URL did not return a video file (Content-Type="${contentType}"). ` +
            `This usually happens with watch pages (e.g. YouTube Shorts). Please upload an MP4 file directly, or ` +
            `use a direct CDN link to the raw .mp4 video file.`
        );
    }
    if (contentType && !contentType.includes('video/') && !contentType.includes('application/octet-stream') && !contentType.includes('binary/octet-stream')) {
        logger.warn(`[Reels] Suspicious non-video Content-Type on download: ${contentType} (continuing, but file may be corrupt)`);
    }

    const writeStream = fs.createWriteStream(tmpPath);
    await pipeline(response.data, writeStream);
    return tmpPath;
};

interface ReelStartResult {
    videoId: string;
    uploadUrl: string;
}

const startReelUpload = async (page: PageContext): Promise<ReelStartResult> => {
    const startResponse = await api.post(`/${page.fbPageId}/video_reels`, null, {
        params: {
            access_token: page.accessToken,
            upload_phase: 'start',
        },
    });

    const videoId: string = String(startResponse.data?.video_id ?? '').trim();
    const uploadUrl: string = String(startResponse.data?.upload_url ?? '').trim();

    if (!videoId || !uploadUrl) {
        throw new FacebookApiError(
            `Facebook did not return video_id/upload_url for start phase (got video_id="${videoId}", upload_url="${uploadUrl}")`
        );
    }

    return { videoId, uploadUrl };
};

const transferReelBytes = async (
    page: PageContext,
    uploadUrl: string,
    filePath: string,
    fileSize: number
): Promise<void> => {
    const readStream = fs.createReadStream(filePath);
    try {
        const sizeStr = String(fileSize);
        await axios.post(uploadUrl, readStream, {
            headers: {
                Authorization: `OAuth ${page.accessToken}`,
                Offset: '0',
                file_size: sizeStr,
                'Content-Length': sizeStr,
                'X-Entity-Length': sizeStr,
                'X-Entity-Name': 'file',
                'Content-Type': 'application/octet-stream',
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 600_000,
            validateStatus: (s) => s >= 200 && s < 300,
        });
    } catch (err: any) {
        const rawMsg =
            err?.response?.data?.error?.message ??
            err?.response?.data?.debug_info?.message ??
            err?.message ??
            'Unknown transfer error';
        throw new FacebookApiError(`Reel upload transfer failed: ${rawMsg}`, undefined, rawMsg);
    } finally {
        try { readStream.destroy(); } catch { /* ignore */ }
    }
};

const finishReelUpload = async (
    page: PageContext,
    videoId: string,
    title: string,
    description: string
): Promise<{ containerId: string }> => {
    const params: Record<string, any> = {
        access_token: page.accessToken,
        upload_phase: 'finish',
        video_id: videoId,
        video_state: 'PUBLISHED',
        title,
        published: true,
    };
    if (description && description.trim().length > 0) {
        params.description = description;
    }

    const finishResponse = await api.post(`/${page.fbPageId}/video_reels`, null, { params });

    const containerId: string = String(
        finishResponse.data?.id ?? finishResponse.data?.video_id ?? videoId
    ).trim();

    if (!containerId) {
        throw new FacebookApiError('Facebook did not return a container id after finish phase');
    }

    return { containerId };
};

export const publishReelToFacebook = async (
    page: PageContext,
    reel: ReelContext
): Promise<{ success: boolean; postId: string }> => {
    const description = buildDescription(reel.caption, reel.hashtags);
    let tempFilePath: string | null = null;

    try {
        let localFilePath: string;
        if (reel.videoSource === 'url') {
            if (!reel.videoUrl) {
                throw new FacebookApiError('videoUrl is required for url videoSource');
            }
            const isYouTube = isYouTubeUrl(reel.videoUrl);
            if (isYouTube) {
                logger.info(`[Reels] YouTube URL detected → extracting + downloading actual video bytes: ${reel.videoUrl}`);
                tempFilePath = await downloadYouTubeToTempFile(reel.videoUrl);
                localFilePath = tempFilePath;
            } else {
                logger.info(`[Reels] Downloading remote video to temp file: ${reel.videoUrl}`);
                tempFilePath = await downloadToTempFile(reel.videoUrl);
                localFilePath = tempFilePath;
            }
        } else if (reel.videoSource === 'upload') {
            if (!reel.videoFilePath || !fs.existsSync(reel.videoFilePath)) {
                throw new FacebookApiError('Video file not found on server');
            }
            localFilePath = reel.videoFilePath;
        } else {
            throw new FacebookApiError(`Unsupported videoSource: ${reel.videoSource}`);
        }

        const fileSize = fs.statSync(localFilePath).size;
        const MIN_VIDEO_BYTES = 20_000;
        if (!fileSize || fileSize < MIN_VIDEO_BYTES) {
            throw new FacebookApiError(`Video file is too small (${fileSize} bytes; minimum ${MIN_VIDEO_BYTES}). Likely a placeholder or corrupted download.`);
        }
        logger.info(`[Reels] Video file ready size=${fileSize} source=${reel.videoSource}`);

        const { videoId, uploadUrl } = await startReelUpload(page);
        logger.info(
            `[Reels] Start OK page=${page.fbPageId} videoId=${videoId} uploadUrlHost=${new URL(uploadUrl).host}`
        );

        await transferReelBytes(page, uploadUrl, localFilePath, fileSize);
        logger.info(`[Reels] Transfer complete videoId=${videoId} size=${fileSize}`);

        const { containerId } = await finishReelUpload(page, videoId, reel.title, description);
        logger.info(`[Reels] Finish OK containerId=${containerId} (published=true requested)`);

        let postId = containerId;
        const maxWaitMs = 180_000;
        const pollIntervalMs = 5_000;
        const startedAt = Date.now();
        let lastVideoStatus = '';
        let lastPublishingPhase = '';
        let lastPublished = false;

        while (Date.now() - startedAt < maxWaitMs) {
            try {
                const statusCheckContainer = postId && postId !== containerId ? postId : containerId;
                const { videoStatus, publishingPhaseStatus, published, id } = await checkPublishStatus(page, statusCheckContainer);
                lastVideoStatus = videoStatus;
                lastPublishingPhase = publishingPhaseStatus;
                lastPublished = published;
                if (id) postId = id;

                if (videoStatus === 'error') {
                    throw new FacebookApiError(
                        `Facebook rejected the video with video_status=error. Reason may be: invalid format, codec not supported, resolution/bitrate out of bounds, or copyright. Check page content studio for details. (videoId=${postId})`
                    );
                }

                // Succeed as soon as Facebook confirms the video is ready OR the container is published.
                // Using OR (not AND) because Facebook does not reliably return all three fields
                // simultaneously, causing unnecessary timeouts when all-AND was used.
                if (
                    videoStatus === 'ready' ||
                    videoStatus === 'published' ||
                    published === true ||
                    publishingPhaseStatus === 'complete'
                ) {
                    logger.info(
                        `[Reels] Reel fully published postId=${postId} videoStatus=${videoStatus} ` +
                        `publishingPhase=${publishingPhaseStatus} published=${published}`
                    );
                    return { success: true, postId };
                }
            } catch (err: any) {
                if (err instanceof FacebookApiError) throw err;
                logger.warn(`[Reels] Poll error (will retry): ${err?.message ?? err}`);
            }
            await sleep(pollIntervalMs);
        }

        if (lastVideoStatus === 'error') {
            throw new FacebookApiError(
                `Facebook rejected the video with video_status=error after ${Math.round(maxWaitMs / 1000)}s polling (postId=${postId}). Reel was NOT published to the page.`
            );
        }

        if (lastPublished === true && lastVideoStatus === 'ready') {
            logger.info(
                `[Reels] Poll timeout but confirmed published=true videoStatus=ready — postId=${postId}`
            );
            return { success: true, postId };
        }

        logger.warn(
            `[Reels] Publish poll timed out after ${Math.round(maxWaitMs / 1000)}s — ` +
            `videoStatus=${lastVideoStatus} publishingPhase=${lastPublishingPhase} published=${lastPublished}. ` +
            `Accepting postId=${postId} anyway — please confirm on Facebook.`
        );
        return { success: true, postId };
    } catch (err: any) {
        if (err instanceof FacebookApiError) {
            throw err;
        }
        const fbMsg =
            err?.response?.data?.error?.message ?? err?.message ?? 'Unknown Facebook error';
        const fbCode = err?.response?.data?.error?.code ?? err?.response?.status;
        throw new FacebookApiError(fbMsg, fbCode, fbMsg);
    } finally {
        if (tempFilePath && fs.existsSync(tempFilePath)) {
            try { fs.unlinkSync(tempFilePath); } catch (_e) { /* ignore */ }
        }
    }
};

/**
 * Post a photo to a Facebook Page using the Graph API.
 * Supports direct binary upload from local disk or URL.
 * Returns the Facebook post ID.
 */
export const postPhotoToPage = async (
    pageId: string,
    pageAccessToken: string,
    imagePathOrUrl: string,
    caption: string
): Promise<{ postId: string }> => {
    logger.info(`[AI Photo] Posting photo to Facebook page ${pageId}`);
    try {
        // 1. Direct binary file upload if path exists on disk
        if (fs.existsSync(imagePathOrUrl)) {
            const fileBuffer = fs.readFileSync(imagePathOrUrl);
            const isPng = imagePathOrUrl.toLowerCase().endsWith('.png');
            const mimeType = isPng ? 'image/png' : 'image/jpeg';
            const fileName = isPng ? 'photo.png' : 'photo.jpg';

            const formData = new globalThis.FormData();
            formData.append('source', new Blob([fileBuffer], { type: mimeType }), fileName);
            formData.append('message', caption);
            formData.append('caption', caption);
            formData.append('access_token', pageAccessToken);

            // Use native fetch to guarantee perfect multipart/form-data boundary headers
            const fbRes = await fetch(`https://graph.facebook.com/v19.0/${pageId}/photos`, {
                method: 'POST',
                body: formData,
            });

            const data: any = await fbRes.json();
            if (!fbRes.ok || data.error) {
                const errMsg = data.error?.message || `HTTP ${fbRes.status}`;
                const errCode = data.error?.code || fbRes.status;
                throw new FacebookApiError(errMsg, errCode, errMsg);
            }

            const postId: string = data.post_id ?? data.id ?? '';
            logger.info(`[AI Photo] Photo posted successfully (binary upload). postId=${postId}`);
            return { postId };
        }

        // 2. Fallback: URL upload
        const fbRes = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}/photos?url=${encodeURIComponent(imagePathOrUrl)}&caption=${encodeURIComponent(caption)}&message=${encodeURIComponent(caption)}&access_token=${encodeURIComponent(pageAccessToken)}`,
            { method: 'POST' }
        );
        const data: any = await fbRes.json();
        if (!fbRes.ok || data.error) {
            const errMsg = data.error?.message || `HTTP ${fbRes.status}`;
            const errCode = data.error?.code || fbRes.status;
            throw new FacebookApiError(errMsg, errCode, errMsg);
        }
        const postId: string = data.post_id ?? data.id ?? '';
        logger.info(`[AI Photo] Photo posted successfully (URL upload). postId=${postId}`);
        return { postId };
    } catch (err: any) {

        if (err instanceof FacebookApiError) {
            logger.error(`[AI Photo] postPhotoToPage failed: ${err.message} (code=${err.fbResponseCode ?? err.statusCode})`);
            throw err;
        }
        const fbMsg = err?.response?.data?.error?.message ?? err?.message ?? 'Unknown Facebook error';
        const fbCode = err?.response?.data?.error?.code ?? err?.response?.status;
        logger.error(`[AI Photo] postPhotoToPage failed: ${fbMsg} (code=${fbCode})`);
        throw new FacebookApiError(fbMsg, fbCode, fbMsg);
    }
};

export interface FacebookFetchedReel {

    id: string;
    title: string;
    description: string;
    videoUrl?: string | null;
    thumbnailUrl?: string | null;
    permalinkUrl?: string | null;
    createdTime: string;
    length?: number | null;
    views?: number | null;
    postType: 'reel' | 'video';
}

/**
 * Fetch N number of reels / videos from a connected Facebook Page.
 */
export const fetchPageReels = async (
    fbPageId: string,
    pageAccessToken: string,
    limit: number = 10
): Promise<FacebookFetchedReel[]> => {
    const safeLimit = Math.max(1, Math.min(limit, 100));
    logger.info(`[Facebook Reels] Fetching ${safeLimit} reels for page ${fbPageId}`);

    const results: FacebookFetchedReel[] = [];
    const seenIds = new Set<string>();

    // 1. Try /video_reels endpoint first
    try {
        const reelsRes = await api.get(`/${fbPageId}/video_reels`, {
            params: {
                fields: 'id,description,created_time,video{id,source,picture,title,description,length,permalink_url,views}',
                limit: safeLimit,
                access_token: pageAccessToken,
            },
        });

        const data = reelsRes.data?.data || [];
        for (const item of data) {
            const vid = item.video || {};
            const id = item.id || vid.id;
            if (!id || seenIds.has(id)) continue;
            seenIds.add(id);

            results.push({
                id,
                title: vid.title || item.description?.slice(0, 60) || 'Facebook Reel',
                description: item.description || vid.description || '',
                videoUrl: vid.source || null,
                thumbnailUrl: vid.picture || null,
                permalinkUrl: vid.permalink_url || `https://www.facebook.com/watch/?v=${id}`,
                createdTime: item.created_time || new Date().toISOString(),
                length: vid.length || null,
                views: vid.views || null,
                postType: 'reel',
            });
        }
    } catch (err: any) {
        logger.warn(`[Facebook Reels] /video_reels returned notice: ${err?.response?.data?.error?.message || err?.message}. Trying /videos...`);
    }

    // 2. If video_reels returned fewer than safeLimit, query /videos
    if (results.length < safeLimit) {
        try {
            const remaining = safeLimit - results.length;
            const videosRes = await api.get(`/${fbPageId}/videos`, {
                params: {
                    fields: 'id,title,description,source,picture,thumbnails{uri,is_preferred},created_time,length,permalink_url,views',
                    limit: remaining,
                    access_token: pageAccessToken,
                },
            });

            const data = videosRes.data?.data || [];
            for (const item of data) {
                if (seenIds.has(item.id)) continue;
                seenIds.add(item.id);

                const thumb = item.thumbnails?.data?.find((t: any) => t.is_preferred)?.uri || item.picture || null;

                results.push({
                    id: item.id,
                    title: item.title || item.description?.slice(0, 60) || 'Facebook Video',
                    description: item.description || '',
                    videoUrl: item.source || null,
                    thumbnailUrl: thumb,
                    permalinkUrl: item.permalink_url || `https://www.facebook.com/watch/?v=${item.id}`,
                    createdTime: item.created_time || new Date().toISOString(),
                    length: item.length || null,
                    views: item.views || null,
                    postType: item.length && item.length <= 90 ? 'reel' : 'video',
                });
            }
        } catch (err: any) {
            logger.warn(`[Facebook Reels] /videos query error: ${err?.response?.data?.error?.message || err?.message}`);
        }
    }

    // 3. Fallback: if both returned 0 (e.g. feed posts with video attachments), query /published_posts
    if (results.length === 0) {
        try {
            const postsRes = await api.get(`/${fbPageId}/published_posts`, {
                params: {
                    fields: 'id,message,created_time,permalink_url,full_picture,attachments{media_type,url,media,title,unshimmed_url}',
                    limit: safeLimit,
                    access_token: pageAccessToken,
                },
            });

            const posts = postsRes.data?.data || [];
            for (const post of posts) {
                if (seenIds.has(post.id)) continue;
                seenIds.add(post.id);

                const attach = post.attachments?.data?.[0];
                const isVideo = attach?.media_type === 'video' || attach?.media_type === 'animated_gif_video';

                results.push({
                    id: post.id,
                    title: attach?.title || post.message?.slice(0, 60) || 'Facebook Post',
                    description: post.message || '',
                    videoUrl: attach?.media?.source || attach?.unshimmed_url || null,
                    thumbnailUrl: post.full_picture || attach?.media?.image?.src || null,
                    permalinkUrl: post.permalink_url || `https://facebook.com/${post.id}`,
                    createdTime: post.created_time || new Date().toISOString(),
                    length: null,
                    views: null,
                    postType: isVideo ? 'reel' : 'video',
                });
            }
        } catch (err: any) {
            logger.warn(`[Facebook Reels] /published_posts fallback query error: ${err?.response?.data?.error?.message || err?.message}`);
        }
    }

    logger.info(`[Facebook Reels] Successfully retrieved ${results.length} reels/videos from page ${fbPageId}`);
    return results;
};

export default {
    generateAuthUrl,
    exchangeCodeForUserAccessToken,
    getUserPagesWithTokens,
    publishReelToFacebook,
    postPhotoToPage,
    fetchPageReels,
    facebookCredentialsAvailable,
};

