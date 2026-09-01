import axios from 'axios';
import { getReelModel } from '../models/Reel.model.js';
import { getFacebookPageModel } from '../models/FacebookPage.model.js';
import { decryptAes } from '../utils/encryption.js';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';
import { generateReelContent } from './ai.service.js';

export interface ReelComment {
    id: string;
    message: string;
    createdTime: string;
    fromName: string;
    fromId?: string;
    hasReplied?: boolean;
    likeCount?: number;
}

/**
 * Fetch comments for a published Reel from Meta Graph API
 */
export const fetchReelComments = async (userId: number, reelId: number): Promise<{ reelTitle: string; comments: ReelComment[] }> => {
    const ReelModel = getReelModel();
    const PageModel = getFacebookPageModel();

    const reel = await ReelModel.findOne({ where: { id: reelId, userId } });
    if (!reel) {
        throw new NotFoundError('Reel not found');
    }

    let fbVideoId: string | null = null;
    const postIds: any = reel.platformPostIds;
    if (typeof postIds === 'string') {
        try {
            const parsed = JSON.parse(postIds);
            if (typeof parsed === 'string') {
                fbVideoId = parsed;
            } else if (parsed && typeof parsed === 'object') {
                fbVideoId = parsed.facebook || parsed.video_id || null;
            }
        } catch (_e) {
            fbVideoId = postIds;
        }
    } else if (postIds && typeof postIds === 'object') {
        fbVideoId = postIds.facebook || postIds.video_id || null;
    }

    if (!fbVideoId) {
        return { reelTitle: reel.title, comments: [] };
    }

    const page = await PageModel.findOne({ where: { id: reel.pageId, userId } });
    if (!page || !page.accessTokenEnc) {
        throw new BadRequestError('Facebook Page token not found');
    }

    const pageToken = decryptAes(page.accessTokenEnc, config.ENCRYPTION_KEY);

    try {
        const res = await axios.get(`https://graph.facebook.com/v20.0/${fbVideoId}/comments`, {
            params: {
                fields: 'id,message,created_time,from,like_count,comments{id}',
                access_token: pageToken,
            },
        });

        const rawComments = res.data?.data || [];
        const comments: ReelComment[] = rawComments.map((item: any) => ({
            id: item.id,
            message: item.message || '',
            createdTime: item.created_time || new Date().toISOString(),
            fromName: item.from?.name || 'Facebook User',
            fromId: item.from?.id,
            hasReplied: Boolean(item.comments?.data?.length),
            likeCount: item.like_count || 0,
        }));

        return { reelTitle: reel.title, comments };
    } catch (err: any) {
        const detail = err?.response?.data?.error?.message || err?.message;
        logger.warn(`[Comments] Failed to fetch comments for Reel ${reelId}: ${detail}`);
        return { reelTitle: reel.title, comments: [] };
    }
};

/**
 * Generate an AI contextual reply for a comment using Gemini AI
 */
export const generateAiCommentReply = async (
    commentMessage: string,
    reelTitle: string,
    tone: string = 'Viral Creator',
    customGeminiKey?: string
): Promise<string> => {
    const geminiKey = customGeminiKey || process.env.GEMINI_API_KEY;

    if (geminiKey) {
        try {
            const prompt = `You are a social media manager for a viral content creator.
Tone: ${tone}
Reel Title: "${reelTitle}"
User Comment: "${commentMessage}"

Generate a short, engaging, 1-2 sentence reply to this comment (include 1-2 relevant emojis). Return ONLY the reply text directly.`;

            const res = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
                {
                    contents: [{ parts: [{ text: prompt }] }],
                }
            );

            const reply = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
            if (reply) return reply;
        } catch (err: any) {
            logger.warn(`[Comments] Gemini AI reply generation failed: ${err?.message}`);
        }
    }

    // Intelligent Fallback Replies based on sentiment keywords
    const lower = commentMessage.toLowerCase();
    if (lower.includes('love') || lower.includes('awesome') || lower.includes('amazing') || lower.includes('fire') || lower.includes('great')) {
        return 'Thank you so much! Really glad you enjoyed it! 🔥❤️';
    }
    if (lower.includes('how') || lower.includes('where') || lower.includes('what') || lower.includes('?')) {
        return 'Great question! Check out the description or stay tuned for part 2! 🚀';
    }
    if (lower.includes('lol') || lower.includes('funny') || lower.includes('haha')) {
        return 'Haha glad it gave you a laugh! Stay tuned for more! 😂🙌';
    }

    return 'Thanks for watching and dropping a comment! Appreciate the support! 🙌✨';
};

/**
 * Post reply to Meta Graph API comment
 */
export const postCommentReply = async (
    userId: number,
    commentId: string,
    replyText: string,
    pageId?: number
): Promise<{ success: boolean; replyId?: string }> => {
    const PageModel = getFacebookPageModel();

    let page = pageId ? await PageModel.findOne({ where: { id: pageId, userId } }) : null;
    if (!page) {
        page = await PageModel.findOne({ where: { userId } });
    }

    if (!page || !page.accessTokenEnc) {
        throw new BadRequestError('Facebook Page access token missing');
    }

    const pageToken = decryptAes(page.accessTokenEnc, config.ENCRYPTION_KEY);

    try {
        const res = await axios.post(`https://graph.facebook.com/v20.0/${commentId}/comments`, null, {
            params: {
                message: replyText,
                access_token: pageToken,
            },
        });

        logger.info(`[Comments] Successfully posted AI reply to comment ${commentId}: ${res.data?.id}`);
        return { success: true, replyId: res.data?.id };
    } catch (err: any) {
        const msg = err?.response?.data?.error?.message || err?.message;
        logger.error(`[Comments] Failed to post comment reply: ${msg}`);
        throw new BadRequestError(`Posting reply failed: ${msg}`);
    }
};

/**
 * Run Auto-Responder Bot on target Reel
 */
export const runAutoResponderForReel = async (
    userId: number,
    reelId: number,
    tone: string = 'Viral Creator'
): Promise<{ repliedCount: number; details: string[] }> => {
    const { reelTitle, comments } = await fetchReelComments(userId, reelId);
    const unreplied = comments.filter((c) => !c.hasReplied);

    let repliedCount = 0;
    const details: string[] = [];

    for (const comment of unreplied.slice(0, 5)) { // Process up to 5 unreplied comments per run
        try {
            const aiReply = await generateAiCommentReply(comment.message, reelTitle, tone);
            await postCommentReply(userId, comment.id, aiReply);
            repliedCount++;
            details.push(`Replied to "${comment.fromName}": "${aiReply}"`);
        } catch (err: any) {
            logger.warn(`[Comments] Auto-reply failed for comment ${comment.id}: ${err?.message}`);
        }
    }

    return { repliedCount, details };
};
