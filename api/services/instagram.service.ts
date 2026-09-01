import axios from 'axios';
import { logger } from '../utils/logger.js';
import { FacebookApiError } from '../utils/errors.js';

interface InstagramPageContext {
    fbPageId: string;
    accessToken: string;
    igUserId?: string;
}

interface InstagramReelParams {
    title: string;
    caption?: string | null;
    hashtags?: string[];
    videoUrl: string;
}

const FB_VERSION = 'v20.0';

/**
 * Get connected Instagram Business/Creator Account ID linked to a Facebook Page
 */
export const getInstagramAccountId = async (page: InstagramPageContext): Promise<string | null> => {
    try {
        const response = await axios.get(`https://graph.facebook.com/${FB_VERSION}/${page.fbPageId}`, {
            params: {
                fields: 'instagram_business_account',
                access_token: page.accessToken,
            },
        });
        return response.data?.instagram_business_account?.id ?? null;
    } catch (err: any) {
        logger.warn(`[Instagram] Failed to fetch connected IG account for Page ${page.fbPageId}: ${err?.message}`);
        return null;
    }
};

/**
 * Publish Reel to Instagram via Meta Graph API Container Flow
 */
export const publishReelToInstagram = async (
    page: InstagramPageContext,
    reel: InstagramReelParams
): Promise<{ success: boolean; igMediaId: string }> => {
    const igUserId = page.igUserId ?? (await getInstagramAccountId(page));
    if (!igUserId) {
        throw new FacebookApiError(
            `No Instagram Business/Creator account connected to Facebook Page ID ${page.fbPageId}. Please link an Instagram Account in Meta Business Suite.`
        );
    }

    const captionText = [reel.title, reel.caption, (reel.hashtags ?? []).join(' ')]
        .filter(Boolean)
        .join('\n\n');

    logger.info(`[Instagram] Initiating Reel container creation for igUserId=${igUserId}`);

    // Step 1: Create media container
    const createRes = await axios.post(`https://graph.facebook.com/${FB_VERSION}/${igUserId}/media`, null, {
        params: {
            access_token: page.accessToken,
            media_type: 'REELS',
            video_url: reel.videoUrl,
            caption: captionText,
        },
    });

    const containerId = createRes.data?.id;
    if (!containerId) {
        throw new FacebookApiError('[Instagram] Failed to create Reel container: no ID returned from Graph API.');
    }

    logger.info(`[Instagram] Reel container created id=${containerId}. Polling status...`);

    // Step 2: Poll container status until ready
    const maxWaitMs = 120_000;
    const startTime = Date.now();
    let isReady = false;

    while (Date.now() - startTime < maxWaitMs) {
        const statusRes = await axios.get(`https://graph.facebook.com/${FB_VERSION}/${containerId}`, {
            params: {
                fields: 'status_code,status',
                access_token: page.accessToken,
            },
        });

        const statusCode = statusRes.data?.status_code;
        if (statusCode === 'FINISHED') {
            isReady = true;
            break;
        }
        if (statusCode === 'ERROR') {
            throw new FacebookApiError(`[Instagram] Container processing failed with status ERROR.`);
        }

        await new Promise((r) => setTimeout(r, 4000));
    }

    if (!isReady) {
        logger.warn(`[Instagram] Container polling timed out for containerId=${containerId}. Attempting publish anyway.`);
    }

    // Step 3: Publish container
    const publishRes = await axios.post(`https://graph.facebook.com/${FB_VERSION}/${igUserId}/media_publish`, null, {
        params: {
            access_token: page.accessToken,
            creation_id: containerId,
        },
    });

    const igMediaId = publishRes.data?.id ?? containerId;
    logger.info(`[Instagram] Reel published successfully igMediaId=${igMediaId}`);

    return { success: true, igMediaId };
};
