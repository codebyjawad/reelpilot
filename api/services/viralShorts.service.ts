import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { getViralSourceModel, ViralSourceInstance } from '../models/ViralSource.model.js';
import { getReelModel } from '../models/Reel.model.js';
import { generateReelContent } from './ai.service.js';
import { calculate7DayHeatmapMatrix } from './peakTime.service.js';
import { logger } from '../utils/logger.js';
import type { TargetPlatform } from '../../shared/types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const YTDLP_BIN = path.resolve(
    __dirname, '..', '..', 'node_modules', '@distube', 'yt-dlp', 'bin',
    process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
);

export interface ViralShortCandidate {
    candidateId: string;
    videoId: string;
    url: string;
    title: string;
    description?: string;
    channelName?: string;
    durationSec?: number;
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
    publishedAt?: string | null;
    thumbnailUrl?: string;
    keywords: string[];
    viralScore: number;
    viralLevel: 'trending' | 'hot' | 'viral' | 'superviral';
    demo: boolean;
}

export interface DiscoverViralShortsOptions {
    keywords: string[];
    minViews?: number;
    publishedWithinDays?: number;
    resultCount?: number;
    youtubeApiKey?: string;
    enrichResults?: boolean;
}

export interface ImportViralShortsOptions {
    userId: number;
    pageId: number;
    candidates: ViralShortCandidate[];
    targetPlatforms?: TargetPlatform[];
    useAiCaptions?: boolean;
}

export interface ImportViralShortsResult {
    scheduledCount: number;
    skippedExistingCount: number;
    reels: Array<{ id: number; title: string; scheduledAt: string | null; peakTimeLabel: string }>;
}

export interface ViralSourceSyncResult {
    candidateCount: number;
    scheduledCount: number;
    skippedExistingCount: number;
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

const formatCount = (n?: number): string => {
    if (!n || n <= 0) return '0';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
};

const computeViralScore = (v: {
    view_count?: number;
    like_count?: number;
    comment_count?: number;
    duration_sec?: number;
    upload_date?: string;
}): number => {
    const views = v.view_count ?? 0;
    const likes = v.like_count ?? 0;
    const comments = v.comment_count ?? 0;

    // Logarithmic view scale, worth up to 65 pts (1M+ views ≈ max)
    const viewsScore = views > 0 ? Math.min(65, (Math.log10(1 + views) / Math.log10(1 + 1_000_000)) * 65) : 15;
    // Engagement rate worth up to 25 pts
    const engagement = views > 0 ? (likes + comments) / views : 0;
    const engagementScore = Math.min(25, engagement * 60);
    // Duration near the 30s sweet spot worth up to 10 pts
    const dur = v.duration_sec ?? 30;
    const durationScore = Math.max(0, 10 - Math.abs(dur - 30) * 0.25);
    // Recency bonus worth up to 10 pts (fresh shorts are more likely to be pushed)
    let recencyScore = 5;
    if (v.upload_date && /^\d{8}$/.test(v.upload_date)) {
        const uploaded = new Date(
            Number(v.upload_date.slice(0, 4)),
            Number(v.upload_date.slice(4, 6)) - 1,
            Number(v.upload_date.slice(6, 8))
        ).getTime();
        const daysOld = (Date.now() - uploaded) / (24 * 60 * 60 * 1000);
        recencyScore = Math.max(0, 10 - daysOld * 0.8);
    }

    return Math.min(100, Math.round(viewsScore + engagementScore + durationScore + recencyScore));
};

const viralLevel = (score: number): ViralShortCandidate['viralLevel'] => {
    if (score >= 90) return 'superviral';
    if (score >= 75) return 'viral';
    if (score >= 60) return 'hot';
    return 'trending';
};

const toCandidate = (entry: any, keywords: string[]): ViralShortCandidate | null => {
    const videoId = entry.id || (entry.url?.match(/[?&]v=([A-Za-z0-9_-]{11})/)?.[1]) || '';
    if (!videoId) return null;

    const url = entry.url || `https://www.youtube.com/watch?v=${videoId}`;
    const durationSec = typeof entry.duration === 'number' ? Math.round(entry.duration) : undefined;
    // Only surface actual short-form (10s–60s) content
    if (durationSec && (durationSec < 10 || durationSec > 61)) return null;

    const score = computeViralScore(entry);

    let publishedAt: string | null = null;
    if (entry.upload_date && /^\d{8}$/.test(entry.upload_date)) {
        publishedAt = new Date(
            Number(entry.upload_date.slice(0, 4)),
            Number(entry.upload_date.slice(4, 6)) - 1,
            Number(entry.upload_date.slice(6, 8))
        ).toISOString();
    }

    return {
        candidateId: videoId,
        videoId,
        url,
        title: (entry.title || 'Viral Short').slice(0, 255),
        description: entry.description ? String(entry.description).slice(0, 500) : undefined,
        channelName: entry.channel || entry.uploader,
        durationSec,
        viewCount: entry.view_count ?? undefined,
        likeCount: entry.like_count ?? undefined,
        commentCount: entry.comment_count ?? undefined,
        publishedAt,
        thumbnailUrl: entry.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        keywords,
        viralScore: score,
        viralLevel: viralLevel(score),
        demo: false,
    };
};

// ─── YouTube discovery backends ───────────────────────────────────────────────

const runYtdlpJson = async (extraArgs: string[], timeoutMs: number): Promise<any> => {
    return new Promise((resolve, reject) => {
        const args = [
            ...extraArgs,
            '-4',
            '--js-runtimes', `node:${process.execPath}`,
            '--extractor-args', 'youtube:player_client=web_embedded',
            '--no-warnings',
            '--skip-download',
            '--no-call-home',
            '--socket-timeout', '30',
            '--dump-single-json',
        ];

        const proc = spawn(YTDLP_BIN, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';
        let timer: NodeJS.Timeout | null = setTimeout(() => {
            try { proc.kill('SIGKILL'); } catch (_) { }
            reject(new Error('yt-dlp search timed out. YouTube may be rate-limiting this server IP.'));
        }, timeoutMs);

        proc.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
        proc.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });
        proc.on('close', (code) => {
            if (timer) { clearTimeout(timer); timer = null; }
            if (code === 0 && stdout.trim()) {
                try { resolve(JSON.parse(stdout)); }
                catch (err: any) { reject(new Error(`Failed to parse yt-dlp output: ${err?.message}`)); }
            } else {
                reject(new Error(stderr?.slice(-300) || `yt-dlp exited with code ${code}`));
            }
        });
        proc.on('error', (err) => {
            if (timer) { clearTimeout(timer); timer = null; }
            reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
        });
    });
};

const searchViaYoutubeDataApi = async (opts: DiscoverViralShortsOptions): Promise<ViralShortCandidate[]> => {
    const apiKey = opts.youtubeApiKey || process.env.YOUTUBE_API_KEY;
    if (!apiKey) return [];

    const publishedAfter = new Date(Date.now() - (opts.publishedWithinDays ?? 7) * 24 * 60 * 60 * 1000).toISOString();
    const query = opts.keywords.join(' ');

    const searchRes = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
            part: 'snippet',
            type: 'video',
            videoDuration: 'short',
            order: 'viewCount',
            maxResults: Math.min(24, opts.resultCount ?? 8),
            q: query,
            publishedAfter,
            key: apiKey,
        },
        timeout: 25000,
    });

    const items: any[] = searchRes.data?.items || [];
    if (items.length === 0) return [];

    const videoIds = items.map((it) => it.id?.videoId).filter(Boolean).join(',');
    const statsRes = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
            part: 'snippet,statistics,contentDetails',
            id: videoIds,
            key: apiKey,
        },
        timeout: 25000,
    });

    const statsMap: Record<string, any> = {};
    for (const v of (statsRes.data?.items || []) as any[]) {
        statsMap[v.id] = v;
    }

    const candidates: ViralShortCandidate[] = [];
    for (const item of items) {
        const id = item.id?.videoId;
        const stat = statsMap[id]?.statistics || {};
        const durationSec = 30; // API search doesn't include duration; Shorts are assumed ≤60s
        const score = computeViralScore({
            view_count: Number(stat.viewCount) || 0,
            like_count: Number(stat.likeCount) || 0,
            comment_count: Number(stat.commentCount) || 0,
            duration_sec: durationSec,
        });

        if (opts.minViews && Number(stat.viewCount) && Number(stat.viewCount) < opts.minViews) continue;

        candidates.push({
            candidateId: id,
            videoId: id,
            url: `https://www.youtube.com/watch?v=${id}`,
            title: (item.snippet?.title || 'Viral Short').slice(0, 255),
            description: (item.snippet?.description || '').slice(0, 500),
            channelName: item.snippet?.channelTitle,
            durationSec,
            viewCount: Number(stat.viewCount) || undefined,
            likeCount: Number(stat.likeCount) || undefined,
            commentCount: Number(stat.commentCount) || undefined,
            publishedAt: item.snippet?.publishedAt,
            thumbnailUrl: item.snippet?.thumbnails?.high?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
            keywords: opts.keywords,
            viralScore: score,
            viralLevel: viralLevel(score),
            demo: false,
        });
    }

    return candidates.slice(0, opts.resultCount ?? 8);
};

const enrichVideoMetadata = async (url: string): Promise<{ like_count?: number; comment_count?: number } | null> => {
    try {
        const raw = await runYtdlpJson([url, '--no-playlist'], 25_000);
        return {
            like_count: typeof raw?.like_count === 'number' ? raw.like_count : undefined,
            comment_count: typeof raw?.comment_count === 'number' ? raw.comment_count : undefined,
        };
    } catch {
        return null;
    }
};

const searchViaYtdlp = async (opts: DiscoverViralShortsOptions, resultCount: number): Promise<ViralShortCandidate[]> => {
    const baseQuery = opts.keywords.join(' ');
    // Use YouTube's "Shorts" result filter so we actually get short-form content.
    // (Plain ytsearch mostly returns full-length videos even with "#shorts" appended.)
    const shortsFeedUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(baseQuery)}&sp=EgIYAQ%3D%3D`;

    let raw: any;
    try {
        raw = await runYtdlpJson([shortsFeedUrl, '--flat-playlist'], 75_000);
    } catch (err: any) {
        logger.warn(`[ViralShorts] Shorts-filter search failed, falling back to ytsearch: ${err?.message}`);
        const query = /\bshorts?\b/i.test(baseQuery) ? baseQuery : `${baseQuery} #shorts`;
        raw = await runYtdlpJson([`ytsearch${Math.max(resultCount, resultCount * 2)}:${query}`, '--flat-playlist'], 45_000).catch(() => null);
    }

    const entries: any[] = Array.isArray(raw?.entries) ? raw.entries : [];
    if (entries.length === 0) throw new Error('No YouTube Shorts found for these keywords');

    const candidates = entries
        .filter((e) => !String(e.title || '').startsWith('Mix -')) // skip auto-generated mixes
        .map((e) => toCandidate(e, opts.keywords))
        .filter((c): c is ViralShortCandidate => c !== null);

    const minViews = opts.minViews ?? 0;
    const filtered = candidates
        .filter((c) => !minViews || (typeof c.viewCount === 'number' && c.viewCount >= minViews))
        .slice(0, resultCount);

    if (filtered.length === 0 && candidates.length === 0) {
        throw new Error('No YouTube Shorts matching the filtering criteria');
    }

    // Best-effort enrichment of the top picks for like/comment engagement signals
    if (opts.enrichResults !== false) {
        const enrichTargets = filtered.slice(0, Math.min(3, filtered.length));
        await Promise.all(
            enrichTargets.map(async (c) => {
                const meta = await enrichVideoMetadata(c.url);
                if (meta) {
                    if (typeof meta.like_count === 'number') c.likeCount = meta.like_count;
                    if (typeof meta.comment_count === 'number') c.commentCount = meta.comment_count;
                    c.viralScore = computeViralScore({
                        view_count: c.viewCount,
                        like_count: c.likeCount,
                        comment_count: c.commentCount,
                        duration_sec: c.durationSec,
                    });
                    c.viralLevel = viralLevel(c.viralScore);
                }
            })
        );
    }

    return filtered;
};

const DEMO_TEMPLATES = [
    { titleSuffix: 'Hack', dur: 32 },
    { titleSuffix: 'Motivation', dur: 28 },
    { titleSuffix: 'Life Hack', dur: 45 },
    { titleSuffix: 'Trend', dur: 22 },
    { titleSuffix: 'Learning', dur: 38 },
    { titleSuffix: 'Transformation', dur: 55 },
    { titleSuffix: 'Challenge', dur: 41 },
    { titleSuffix: 'Reaction', dur: 30 },
];

const generateDemoCandidates = (opts: DiscoverViralShortsOptions, resultCount: number): ViralShortCandidate[] => {
    const now = Date.now();
    const out: ViralShortCandidate[] = [];
    for (let i = 0; i < resultCount; i++) {
        const tpl = DEMO_TEMPLATES[i % DEMO_TEMPLATES.length];
        const kw = opts.keywords[i % opts.keywords.length] || 'viral';
        const seed = `${kw}`.length + i * 7919;
        const views = 25_000 + ((seed * 48271) % 4_900_000);
        const likes = Math.round(views * (0.08 + ((seed % 5) / 100)));
        const comments = Math.round(likes * (0.04 + ((seed % 3) / 100)));
        const videoId = `demo_${kw.replace(/[^a-z0-9]/gi, '').slice(0, 12).toLowerCase()}_${i}`;
        const score = computeViralScore({
            view_count: views,
            like_count: likes,
            comment_count: comments,
            duration_sec: tpl.dur,
        });

        out.push({
            candidateId: videoId,
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            title: `${kw.toUpperCase()} ${tpl.titleSuffix} Viral Moment Everyone Is Talking About!!`,
            description: `A trending short about ${kw}. Ideal to cross-post for maximum engagement.`,
            channelName: 'ReelPilot Demo Channel',
            durationSec: tpl.dur,
            viewCount: views,
            likeCount: likes,
            commentCount: comments,
            publishedAt: new Date(now - (i + 1) * 6 * 60 * 60 * 1000).toISOString(),
            thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            keywords: opts.keywords,
            viralScore: score,
            viralLevel: viralLevel(score),
            demo: true,
        });
    }
    return out;
};

// ─── Peak time heatmap scheduling ─────────────────────────────────────────────

export interface ViralPeakSlot {
    datetimeISO: string;
    score: number;
}

/**
 * Returns the top-N best upcoming peak slots derived from the 7-day × 24-hour
 * engagement heatmap, sorted by heat score (highest first). Slots are picked
 * from an escalating "proximity horizon" so a scheduled short never lands days
 * away while a strong earlier peak exists.
 */
export const getNextPeakTimeSlots = async (count: number, opts?: ViralPeakSlotsOptions): Promise<string[]> => {
    try {
        const slots = await getViralPeakSlotsPreview(count, opts);
        return slots.map((s) => s.datetimeISO);
    } catch (err: any) {
        logger.warn(`[ViralShorts] Heatmap slot calculation failed: ${err?.message}`);
        // Fallback: space evenly across next days at 7:45 PM prime time
        const out: string[] = [];
        for (let i = 0; i < count; i++) {
            const d = new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000 + Math.floor(i / 4) * 60 * 60 * 1000);
            out.push(d.toISOString());
        }
        return out;
    }
};

/**
 * Compute the next best scheduled peak slots with each slot carrying its
 * datetime (absolute UTC ISO) and heat score so the UI can preview exactly
 * when each selected short will be queued. Slots already booked by existing
 * scheduled reels (bookedSlots) are skipped so nothing gets double-booked.
 */
export interface ViralPeakSlotsOptions {
    horizonHours?: number;
    bookedSlots?: Array<string | Date | number>;
}

const slotMinuteKey = (v: string | Date | number): number => Math.floor(new Date(v).getTime() / 60000);

export const getViralPeakSlotsPreview = async (count: number, opts?: ViralPeakSlotsOptions): Promise<ViralPeakSlot[]> => {
    let { matrix } = await calculate7DayHeatmapMatrix();
    const now = Date.now();

    const bookedMinutes = new Set<number>((opts?.bookedSlots || []).map((b) => slotMinuteKey(b)));

    const future = matrix
        .flat()
        .filter((c) => new Date(c.datetimeISO).getTime() > now + 10 * 60 * 1000)
        .filter((c) => !bookedMinutes.has(slotMinuteKey(c.datetimeISO)));
    future.sort((a, b) => b.score - a.score || new Date(a.datetimeISO).getTime() - new Date(b.datetimeISO).getTime());

    // Escalating proximity horizons: 24h → 48h → 72h → 5d → 14d
    const customHorizon = opts && typeof opts.horizonHours === 'number' ? opts.horizonHours : null;
    const horizons = customHorizon ? [customHorizon, Math.max(customHorizon, 24 * 14)] : [24, 48, 72, 120, 240];
    let pool: { datetimeISO: string; score: number; ts: number }[] = [];

    for (const h of horizons) {
        const cutoff = now + h * 60 * 60 * 1000;
        pool = future.filter((c) => new Date(c.datetimeISO).getTime() <= cutoff).map((c) => ({
            datetimeISO: c.datetimeISO,
            score: c.score,
            ts: new Date(c.datetimeISO).getTime(),
        }));
        if (pool.length >= count) break;
    }

    return pool.slice(0, count).map(({ datetimeISO, score }) => ({ datetimeISO, score }));
};

/** ISO instants already booked by scheduled reels on a page (future only). */
export const getBookedSlotsForPage = async (pageId: number): Promise<string[]> => {
    const { Op } = await import('sequelize');
    const ReelModel = getReelModel();
    const rows = await ReelModel.findAll({
        where: {
            pageId,
            scheduledAt: { [Op.gte]: new Date(Date.now() - 60 * 1000) },
        },
        attributes: ['scheduledAt'],
    });
    return rows
        .map((r: any) => r.scheduledAt)
        .filter((v: any): v is Date | string => v != null)
        .map((v: any) => new Date(v).toISOString());
};

// ─── Content import & autopilot ───────────────────────────────────────────────

const IMPORT_MAX_CANDIDATES = 15;

export const importViralShorts = async (opts: ImportViralShortsOptions): Promise<ImportViralShortsResult> => {
    const ReelModel = getReelModel();
    const targets = opts.targetPlatforms?.length ? opts.targetPlatforms : (['facebook', 'instagram'] as TargetPlatform[]);

    const candidates = opts.candidates.slice(0, IMPORT_MAX_CANDIDATES);

    // Slots already reserved on this page (future scheduledAt) — never double-book.
    const bookedSlots = await getBookedSlotsForPage(opts.pageId);
    const peakSlots = (await getNextPeakTimeSlots(candidates.length, { bookedSlots })).map((datetimeISO) => ({ datetimeISO }));
    const unavailableMinutes = new Set<number>(bookedSlots.map((b) => slotMinuteKey(b)));
    const freeSlots = peakSlots.filter((slot) => !unavailableMinutes.has(slotMinuteKey(slot.datetimeISO)));

    const seenVideoIds = new Set<string>();
    let scheduledCount = 0;
    let skippedExistingCount = 0;
    let slotCursor = 0;
    // Minutes consumed during this import pass (two reels never share a slot)
    const usedMinutes = new Set<number>();
    const reels: ImportViralShortsResult['reels'] = [];

    for (let i = 0; i < candidates.length; i++) {
        const candidate = candidates[i];
        if (!candidate?.videoId || seenVideoIds.has(candidate.videoId)) continue;
        seenVideoIds.add(candidate.videoId);

        const existing = await ReelModel.findOne({
            where: { pageId: opts.pageId, videoUrl: candidate.url },
        });
        if (existing) {
            skippedExistingCount++;
            continue;
        }

        // Next peak slot not yet booked on this page (and not consumed in this pass)
        let scheduledAt: Date | null = null;
        while (slotCursor < freeSlots.length) {
            const slot = freeSlots[slotCursor++];
            const minute = slotMinuteKey(slot.datetimeISO);
            if (usedMinutes.has(minute)) continue;
            usedMinutes.add(minute);
            scheduledAt = new Date(slot.datetimeISO);
            break;
        }
        // No free peak slot left → spread out per extra hour (rare, deal-breaker guard)
        if (!scheduledAt) {
            scheduledAt = new Date(Date.now() + (i + 1) * 60 * 60 * 1000);
        }

        let title = candidate.title?.slice(0, 255) || 'Viral Short';
        let caption = candidate.description || `🔥 Viral short discovered on YouTube about ${opts.candidates[0]?.keywords?.[0] ?? 'trending topics'}`;
        let hashtags = [...(candidate.keywords || []), 'viral', 'shorts', 'reels', 'fyp', 'trending'].slice(0, 12);

        // AI writes the title, caption and hashtags just like the "AI Content" button on New Reel
        if (opts.useAiCaptions) {
            try {
                const ai = await generateReelContent(candidate.title || candidate.keywords.join(' '));
                title = (ai.title || title).slice(0, 255);
                caption = ai.caption || caption;
                hashtags = ai.hashtags?.length ? ai.hashtags : hashtags;
            } catch (err: any) {
                logger.warn(`[ViralShorts] AI caption generation skipped: ${err?.message}`);
            }
        }

        const reel = await ReelModel.create({
            userId: opts.userId,
            pageId: opts.pageId,
            title,
            caption,
            hashtags,
            videoSource: 'url',
            videoUrl: candidate.url,
            targetPlatforms: targets,
            status: 'scheduled',
            scheduledAt,
            thumbnailUrl: candidate.thumbnailUrl || null,
            retryCount: 0,
            videoFilePath: null,
            publishedAt: null,
            facebookPostId: null,
            platformPostIds: null,
            errorMessage: null,
        });

        scheduledCount++;
        reels.push({
            id: reel.id,
            title: reel.title,
            scheduledAt: reel.scheduledAt ? reel.scheduledAt.toISOString() : null,
            peakTimeLabel: scheduledAt ? scheduledAt.toLocaleString() : '',
        });
        logger.info(`[ViralShorts] Queued reel #${reel.id} "${reel.title}" → ${reel.scheduledAt?.toISOString()}`);
    }

    return { scheduledCount, skippedExistingCount, reels };
};

/**
 * Discover viral shorts for a source then queue the top picks as scheduled Reels.
 * Used by the autopilot cron and "Sync Now".
 */
export const autoDiscoverAndImport = async (source: ViralSourceInstance): Promise<ViralSourceSyncResult> => {
    logger.info(`[ViralShorts] Auto-discover for source "${source.name}" id=${source.id}`);

    const candidates = await discoverViralShorts({
        keywords: source.keywords.length ? source.keywords : [source.name],
        minViews: source.minViews,
        publishedWithinDays: source.publishedWithinDays,
        resultCount: Math.max(1, Math.min(10, source.resultCount)),
        enrichResults: false,
    });

    const result = await importViralShorts({
        userId: source.userId,
        pageId: source.pageId,
        candidates,
        targetPlatforms: source.targetPlatforms as TargetPlatform[],
        useAiCaptions: source.useAiCaptions,
    });

    source.discoveredCount = (source.discoveredCount || 0) + candidates.length;
    source.importedCount = (source.importedCount || 0) + result.scheduledCount;
    source.lastPolledAt = new Date();
    await source.save();

    logger.info(`[ViralShorts] Source "${source.name}" sync done: ${result.scheduledCount} queued, ${result.skippedExistingCount} skipped`);
    return {
        candidateCount: candidates.length,
        scheduledCount: result.scheduledCount,
        skippedExistingCount: result.skippedExistingCount,
    };
};

/**
 * Poll all active viral sources that are due (lastPolledAt + intervalHours).
 */
export const pollAllActiveViralSources = async (): Promise<number> => {
    const ViralSourceModel = getViralSourceModel();
    const sources = await ViralSourceModel.findAll({ where: { isActive: true, autoImport: true } });
    let syncedCount = 0;

    for (const source of sources) {
        const lastPolled = source.lastPolledAt ? new Date(source.lastPolledAt).getTime() : 0;
        const due = Date.now() - lastPolled >= (source.intervalHours || 6) * 60 * 60 * 1000;
        if (!due) continue;

        try {
            await autoDiscoverAndImport(source);
            syncedCount++;
        } catch (err: any) {
            logger.warn(`[ViralShorts] Autopilot source "${source.name}" failed: ${err?.message}`);
            source.lastPolledAt = new Date();
            await source.save().catch(() => { });
        }
    }

    return syncedCount;
};

// ─── Public discovery entry point ─────────────────────────────────────────────

export const discoverViralShorts = async (opts: DiscoverViralShortsOptions): Promise<ViralShortCandidate[]> => {
    const resultCount = Math.max(1, Math.min(15, opts.resultCount ?? 8));
    const cleanKeywords = (opts.keywords || [])
        .map((k) => k.trim().replace(/#/g, ''))
        .filter(Boolean)
        .slice(0, 8);
    if (cleanKeywords.length === 0) throw new Error('At least one keyword is required for viral discovery');

    const effectiveOpts: DiscoverViralShortsOptions = { ...opts, keywords: cleanKeywords, resultCount };

    // 1. YouTube Data API (requires key) — best quality data
    if (effectiveOpts.youtubeApiKey || process.env.YOUTUBE_API_KEY) {
        try {
            const apiCandidates = await searchViaYoutubeDataApi(effectiveOpts);
            if (apiCandidates.length > 0) {
                apiCandidates.forEach((c) => logger.info(`[ViralShorts] ${c.viralScore} ${c.channelName} ${formatCount(c.viewCount)} views — ${c.title}`));
                return apiCandidates;
            }
        } catch (err: any) {
            logger.warn(`[ViralShorts] YouTube Data API failed, falling back to yt-dlp: ${err?.message}`);
        }
    }

    // 2. yt-dlp search (no key needed)
    try {
        const ytCandidates = await searchViaYtdlp(effectiveOpts, resultCount);
        if (ytCandidates.length === 0) return [];
        ytCandidates.forEach((c) => logger.info(`[ViralShorts] ${c.viralScore} ${c.channelName} ${formatCount(c.viewCount)} views — ${c.title}`));
        return ytCandidates;
    } catch (err: any) {
        logger.warn(`[ViralShorts] yt-dlp search unavailable: ${err?.message}`);
    }

    // 3. Deterministic demo candidates so the pipeline stays usable/testable offline
    logger.info('[ViralShorts] Using demo candidate generator (no live YouTube results available)');
    return generateDemoCandidates(effectiveOpts, resultCount);
};

export default {
    discoverViralShorts,
    importViralShorts,
    getNextPeakTimeSlots,
    getViralPeakSlotsPreview,
    getBookedSlotsForPage,
    autoDiscoverAndImport,
    pollAllActiveViralSources,
    formatCount,
};