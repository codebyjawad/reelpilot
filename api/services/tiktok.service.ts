import { logger } from '../utils/logger.js';
import { FacebookApiError } from '../utils/errors.js';

interface TikTokReelParams {
    title: string;
    caption?: string | null;
    hashtags?: string[];
    videoUrl: string;
}

/**
 * Publish Reel / Video to TikTok via TikTok Content Posting API
 */
export const publishReelToTikTok = async (
    reel: TikTokReelParams,
    accessToken?: string
): Promise<{ success: boolean; tiktokPostId: string }> => {
    if (!accessToken && !process.env.TIKTOK_ACCESS_TOKEN) {
        logger.warn('[TikTok] TikTok API credentials not configured. Generating simulated publication container.');
        const mockId = `tiktok_post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        logger.info(`[TikTok] Simulated publication completed mockId=${mockId}`);
        return { success: true, tiktokPostId: mockId };
    }

    const token = accessToken || process.env.TIKTOK_ACCESS_TOKEN;
    const postTitle = [reel.title, reel.caption].filter(Boolean).join(' - ');

    try {
        logger.info(`[TikTok] Initiating direct post submission to TikTok API: ${reel.videoUrl}`);
        const response = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
                post_info: {
                    title: postTitle.slice(0, 150),
                    privacy_level: 'PUBLIC_TO_EVERYONE',
                    disable_duet: false,
                    disable_stitch: false,
                    disable_comment: false,
                },
                source_info: {
                    source: 'PULL_FROM_URL',
                    video_url: reel.videoUrl,
                },
            }),
        });

        const data: any = await response.json();
        if (data?.error?.code && data.error.code !== 'ok') {
            throw new FacebookApiError(`TikTok publishing failed: ${data.error.message || data.error.code}`);
        }

        const publishId = data?.data?.publish_id || `tt_${Date.now()}`;
        logger.info(`[TikTok] Reel successfully submitted to TikTok API publishId=${publishId}`);
        return { success: true, tiktokPostId: publishId };
    } catch (err: any) {
        if (err instanceof FacebookApiError) throw err;
        throw new FacebookApiError(`TikTok publish error: ${err?.message ?? err}`);
    }
};
