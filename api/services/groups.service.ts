import fs from 'fs';
import FormData from 'form-data';
import axios from 'axios';
import { getFacebookGroupModel } from '../models/FacebookGroup.model.js';
import { getFacebookPageModel } from '../models/FacebookPage.model.js';
import { decryptAes } from '../utils/encryption.js';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';


export interface GroupData {
    id: number;
    fbGroupId: string;
    name: string;
    privacy: string;
    avatarUrl: string | null;
    memberCount: number | null;
    connectedAt: Date;
}

export interface GroupActivityLog {
    id: string;
    userId: number;
    groupId: number;
    groupName: string;
    fbGroupId: string;
    title: string;
    sharedAt: string;
    status: 'published' | 'web_sharer';
    postUrl?: string;
}

const activityLogsStore: GroupActivityLog[] = [];

/**
 * Get all connected Facebook Groups for a user
 */
export const getUserGroups = async (userId: number): Promise<GroupData[]> => {
    const GroupModel = getFacebookGroupModel();
    const groups = await GroupModel.findAll({
        where: { userId },
        order: [['connectedAt', 'DESC']],
    });
    return groups.map((g) => g.toJSON());
};

/**
 * Helper to extract raw numeric Group ID or slug from a Facebook URL or string
 */
export function extractGroupId(input: string): string {
    const trimmed = input.trim();
    const urlMatch = trimmed.match(/facebook\.com\/groups\/([^\/\?#]+)/i);
    if (urlMatch && urlMatch[1]) {
        return urlMatch[1];
    }
    return trimmed;
}

/**
 * Connect a Facebook Group manually or via Graph API lookup
 */
export const connectGroup = async (
    userId: number,
    fbGroupId: string,
    name?: string,
    privacy?: string
): Promise<GroupData> => {
    const GroupModel = getFacebookGroupModel();
    const PageModel = getFacebookPageModel();

    const cleanGroupId = extractGroupId(fbGroupId);
    let groupName = name?.trim() || `Facebook Group (${cleanGroupId})`;
    let groupPrivacy = privacy || 'PUBLIC';
    let avatarUrl: string | null = null;
    let memberCount: number | null = null;

    // Try fetching group metadata via connected Facebook Page tokens if available
    const pages = await PageModel.findAll({ where: { userId } });
    for (const page of pages) {
        if (!page.accessTokenEnc) continue;
        try {
            const pageToken = decryptAes(page.accessTokenEnc, config.ENCRYPTION_KEY);
            const res = await axios.get(`https://graph.facebook.com/v20.0/${cleanGroupId}`, {
                params: {
                    fields: 'id,name,privacy,picture{url},member_count',
                    access_token: pageToken,
                },
            });
            if (res.data && res.data.name) {
                groupName = res.data.name;
                if (res.data.privacy) groupPrivacy = res.data.privacy;
                if (res.data.picture?.data?.url) avatarUrl = res.data.picture.data.url;
                if (res.data.member_count) memberCount = res.data.member_count;
                logger.info(`[Groups] Successfully fetched metadata for group ${cleanGroupId}: ${groupName}`);
                break;
            }
        } catch (_err) {
            logger.info(`[Groups] Custom metadata fetch notice for group ${cleanGroupId} with page ${page.fbPageId}`);
        }
    }

    // Fallback: If groupName wasn't explicitly passed and Graph API token didn't return a custom title,
    // fetch Open Graph metadata from public Facebook Group URL automatically
    if (!name && groupName.startsWith('Facebook Group (')) {
        try {
            const groupWebRes = await axios.get(`https://www.facebook.com/groups/${cleanGroupId}/`, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                timeout: 5000,
            });
            const html = groupWebRes.data;
            if (typeof html === 'string') {
                const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) || html.match(/<title>([^<]+)<\/title>/i);
                if (ogTitleMatch && ogTitleMatch[1]) {
                    const parsedTitle = ogTitleMatch[1].replace(/\s*\|\s*Facebook$/i, '').trim();
                    if (parsedTitle && parsedTitle.toLowerCase() !== 'facebook') {
                        groupName = parsedTitle;
                    }
                }
            }
        } catch (_webErr) {
            logger.info(`[Groups] Public web metadata scrape notice for ${cleanGroupId}`);
        }
    }

    const [group, created] = await GroupModel.findOrCreate({
        where: { userId, fbGroupId: cleanGroupId },
        defaults: {
            userId,
            fbGroupId: cleanGroupId,
            name: groupName,
            privacy: groupPrivacy,
            avatarUrl,
            memberCount,
            connectedAt: new Date(),
        },
    });

    if (!created) {
        group.name = groupName;
        group.privacy = groupPrivacy;
        if (avatarUrl) group.avatarUrl = avatarUrl;
        if (memberCount) group.memberCount = memberCount;
        await group.save();
    }

    return group.toJSON();
};

/**
 * Auto-sync joined & managed Facebook Groups via Meta Graph API using connected Page tokens
 */
export const syncFacebookGroups = async (userId: number): Promise<GroupData[]> => {
    const GroupModel = getFacebookGroupModel();
    const PageModel = getFacebookPageModel();

    const pages = await PageModel.findAll({ where: { userId } });
    if (pages.length === 0) {
        logger.info(`[Groups] No Facebook Pages connected for user ${userId} to sync groups`);
        return getUserGroups(userId);
    }

    let syncedCount = 0;

    for (const page of pages) {
        if (!page.accessTokenEnc) continue;

        try {
            const pageToken = decryptAes(page.accessTokenEnc, config.ENCRYPTION_KEY);
            
            // Query linked & managed groups for page
            const endpoints = [
                `https://graph.facebook.com/v20.0/${page.fbPageId}/groups`,
                `https://graph.facebook.com/v20.0/me/groups`,
            ];

            for (const endpoint of endpoints) {
                try {
                    const res = await axios.get(endpoint, {
                        params: {
                            fields: 'id,name,privacy,picture{url},member_count',
                            access_token: pageToken,
                        },
                    });

                    const groupList = res.data?.data;
                    if (Array.isArray(groupList)) {
                        for (const g of groupList) {
                            if (!g.id) continue;
                            const gId = String(g.id);
                            const gName = g.name || `Facebook Group (${gId})`;
                            const gPrivacy = g.privacy || 'PUBLIC';
                            const gAvatar = g.picture?.data?.url || null;
                            const gMembers = g.member_count || null;

                            const [group, created] = await GroupModel.findOrCreate({
                                where: { userId, fbGroupId: gId },
                                defaults: {
                                    userId,
                                    fbGroupId: gId,
                                    name: gName,
                                    privacy: gPrivacy,
                                    avatarUrl: gAvatar,
                                    memberCount: gMembers,
                                    connectedAt: new Date(),
                                },
                            });

                            if (!created) {
                                group.name = gName;
                                group.privacy = gPrivacy;
                                if (gAvatar) group.avatarUrl = gAvatar;
                                if (gMembers) group.memberCount = gMembers;
                                await group.save();
                            }

                            syncedCount++;
                        }
                    }
                } catch (epErr: any) {
                    logger.warn(`[Groups] Graph API sync sub-endpoint error: ${epErr?.response?.data?.error?.message || epErr?.message}`);
                }
            }
        } catch (err: any) {
            logger.warn(`[Groups] Failed to sync groups for page ${page.fbPageId}: ${err?.message}`);
        }
    }

    // Re-verify and resolve metadata for ALL existing connected groups (e.g. manually connected ones)
    const existingGroups = await GroupModel.findAll({ where: { userId } });
    for (const group of existingGroups) {
        if (group.name.startsWith('Facebook Group (') || !group.avatarUrl) {
            for (const page of pages) {
                if (!page.accessTokenEnc) continue;
                try {
                    const pageToken = decryptAes(page.accessTokenEnc, config.ENCRYPTION_KEY);
                    const res = await axios.get(`https://graph.facebook.com/v20.0/${group.fbGroupId}`, {
                        params: {
                            fields: 'id,name,privacy,picture{url},member_count',
                            access_token: pageToken,
                        },
                    });
                    if (res.data && res.data.name) {
                        group.name = res.data.name;
                        if (res.data.privacy) group.privacy = res.data.privacy;
                        if (res.data.picture?.data?.url) group.avatarUrl = res.data.picture.data.url;
                        if (res.data.member_count) group.memberCount = res.data.member_count;
                        await group.save();
                        logger.info(`[Groups] Re-resolved metadata for existing group ${group.fbGroupId}: ${group.name}`);
                        break;
                    }
                } catch (_resErr) {
                    // Ignore individual endpoint error and try next page token
                }
            }
        }
    }

    logger.info(`[Groups] Auto-synced ${syncedCount} Facebook Groups for user ${userId}`);
    return getUserGroups(userId);
};

/**
 * Remove/disconnect a Facebook Group
 */
export const removeGroup = async (userId: number, groupId: number): Promise<void> => {
    const GroupModel = getFacebookGroupModel();
    const group = await GroupModel.findOne({ where: { id: groupId, userId } });
    if (!group) {
        throw new NotFoundError('Facebook Group not found');
    }
    await group.destroy();
};

/**
 * Update an existing Facebook Group (name, privacy, group ID)
 */
export const updateGroup = async (
    userId: number,
    groupId: number,
    data: { name?: string; privacy?: string; fbGroupId?: string }
): Promise<GroupData> => {
    const GroupModel = getFacebookGroupModel();
    const group = await GroupModel.findOne({ where: { id: groupId, userId } });
    if (!group) {
        throw new NotFoundError('Facebook Group not found');
    }

    if (data.name !== undefined && data.name.trim() !== '') {
        group.name = data.name.trim();
    }
    if (data.privacy !== undefined && data.privacy.trim() !== '') {
        group.privacy = data.privacy.trim();
    }
    if (data.fbGroupId !== undefined && data.fbGroupId.trim() !== '') {
        group.fbGroupId = extractGroupId(data.fbGroupId);
    }

    await group.save();
    return group.toJSON();
};

/**
 * Publish a Reel / Video post directly to a Facebook Group
 */
export const publishReelToGroup = async (
    userId: number,
    groupId: number,
    videoUrl: string,
    title: string,
    description?: string
): Promise<{ success: boolean; postId?: string; requiresWebShare?: boolean; sharerUrl?: string; message?: string }> => {
    const GroupModel = getFacebookGroupModel();
    const PageModel = getFacebookPageModel();

    const group = await GroupModel.findOne({ where: { id: groupId, userId } });
    if (!group) {
        throw new NotFoundError('Facebook Group not found');
    }

    const page = await PageModel.findOne({ where: { userId } });
    if (!page || !page.accessTokenEnc) {
        throw new BadRequestError('Connect a Facebook Page first to acquire posting permissions');
    }

    const pageToken = decryptAes(page.accessTokenEnc, config.ENCRYPTION_KEY);
    const postMessage = description ? `${title}\n\n${description}` : title;
    const isFacebookLink = videoUrl.includes('facebook.com') || videoUrl.includes('fb.watch');
    const isLocalUrl = videoUrl.startsWith('/') || videoUrl.includes('localhost') || videoUrl.includes('127.0.0.1');

    // 1. If it's a Facebook Reel/Post URL, share via Graph API /{group_id}/feed endpoint
    if (isFacebookLink) {
        try {
            const res = await axios.post(`https://graph.facebook.com/v20.0/${group.fbGroupId}/feed`, null, {
                params: {
                    link: videoUrl,
                    message: postMessage,
                    access_token: pageToken,
                },
            });
            logger.info(`[Groups] Successfully shared Reel link to Group ${group.name} (${group.fbGroupId}): ${res.data?.id}`);
            
            const logEntry: GroupActivityLog = {
                id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                userId,
                groupId,
                groupName: group.name,
                fbGroupId: group.fbGroupId,
                title,
                sharedAt: new Date().toISOString(),
                status: 'published',
                postUrl: `https://www.facebook.com/${res.data?.id || group.fbGroupId}`,
            };
            activityLogsStore.unshift(logEntry);

            return { success: true, postId: res.data?.id };
        } catch (linkErr: any) {
            logger.warn(`[Groups] Feed link post failed: ${linkErr?.response?.data?.error?.message || linkErr?.message}`);
        }
    }

    // 2. If it's a public video URL, share via Graph API /{group_id}/videos endpoint
    if (!isLocalUrl && !isFacebookLink) {
        try {
            const res = await axios.post(`https://graph.facebook.com/v20.0/${group.fbGroupId}/videos`, null, {
                params: {
                    file_url: videoUrl,
                    title,
                    description: description || title,
                    access_token: pageToken,
                },
            });
            logger.info(`[Groups] Successfully published video file to Group ${group.name} (${group.fbGroupId}): ${res.data?.id}`);
            
            const logEntry: GroupActivityLog = {
                id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                userId,
                groupId,
                groupName: group.name,
                fbGroupId: group.fbGroupId,
                title,
                sharedAt: new Date().toISOString(),
                status: 'published',
                postUrl: `https://www.facebook.com/${res.data?.id || group.fbGroupId}`,
            };
            activityLogsStore.unshift(logEntry);

            return { success: true, postId: res.data?.id };
        } catch (vidErr: any) {
            logger.warn(`[Groups] Direct video upload to group failed: ${vidErr?.response?.data?.error?.message || vidErr?.message}`);
        }
    }

    // 3. Fallback: Meta Graph API restricts direct posting for unapproved apps or local video URLs.
    const encodedTarget = encodeURIComponent(videoUrl);
    const sharerUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedTarget}`;

    const logEntry: GroupActivityLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        userId,
        groupId,
        groupName: group.name,
        fbGroupId: group.fbGroupId,
        title,
        sharedAt: new Date().toISOString(),
        status: 'web_sharer',
        postUrl: `https://www.facebook.com/groups/${group.fbGroupId}`,
    };
    activityLogsStore.unshift(logEntry);

    logger.info(`[Groups] Returning Web Sharer fallback for Group ${group.name} (${group.fbGroupId})`);
    return {
        success: false,
        requiresWebShare: true,
        sharerUrl,
        message: `Meta API restriction for group ${group.name}. Use Facebook Web Share fallback.`,
    };
};

/**
 * Publish an AI Image / Photo post directly to a Facebook Group
 */
export const publishImageToGroup = async (
    userId: number,
    groupId: number,
    imagePathOrUrl: string,
    caption: string
): Promise<{ success: boolean; postId?: string; postUrl?: string; message?: string }> => {
    const GroupModel = getFacebookGroupModel();
    const PageModel = getFacebookPageModel();

    const group = await GroupModel.findOne({ where: { id: groupId, userId } });
    if (!group) {
        throw new NotFoundError('Facebook Group not found');
    }

    const pages = await PageModel.findAll({ where: { userId } });
    const pageWithToken = pages.find((p) => p.accessTokenEnc);
    if (!pageWithToken || !pageWithToken.accessTokenEnc) {
        throw new BadRequestError('Connect a Facebook Page first to acquire posting permissions');
    }

    const pageToken = decryptAes(pageWithToken.accessTokenEnc, config.ENCRYPTION_KEY);

    try {
        const isLocalFile = fs.existsSync(imagePathOrUrl);
        if (isLocalFile) {
            const form = new FormData();
            form.append('source', fs.createReadStream(imagePathOrUrl));
            form.append('caption', caption);
            form.append('access_token', pageToken);

            const res = await axios.post(
                `https://graph.facebook.com/v20.0/${group.fbGroupId}/photos`,
                form,
                {
                    headers: form.getHeaders(),
                    maxBodyLength: Infinity,
                    timeout: 45000,
                }
            );

            logger.info(`[Groups] Published photo to group ${group.name} (${group.fbGroupId}): ${res.data?.id}`);
            const logEntry: GroupActivityLog = {
                id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                userId,
                groupId,
                groupName: group.name,
                fbGroupId: group.fbGroupId,
                title: caption.slice(0, 50),
                sharedAt: new Date().toISOString(),
                status: 'published',
                postUrl: `https://www.facebook.com/${res.data?.post_id || res.data?.id || group.fbGroupId}`,
            };
            activityLogsStore.unshift(logEntry);

            return { success: true, postId: res.data?.id, postUrl: logEntry.postUrl };
        } else {
            const res = await axios.post(`https://graph.facebook.com/v20.0/${group.fbGroupId}/photos`, null, {
                params: {
                    url: imagePathOrUrl,
                    caption,
                    access_token: pageToken,
                },
                timeout: 45000,
            });

            logger.info(`[Groups] Published URL photo to group ${group.name} (${group.fbGroupId}): ${res.data?.id}`);
            const logEntry: GroupActivityLog = {
                id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                userId,
                groupId,
                groupName: group.name,
                fbGroupId: group.fbGroupId,
                title: caption.slice(0, 50),
                sharedAt: new Date().toISOString(),
                status: 'published',
                postUrl: `https://www.facebook.com/${res.data?.post_id || res.data?.id || group.fbGroupId}`,
            };
            activityLogsStore.unshift(logEntry);

            return { success: true, postId: res.data?.id, postUrl: logEntry.postUrl };
        }
    } catch (photoErr: any) {
        logger.warn(`[Groups] Direct photo upload to group ${group.fbGroupId} note: ${photoErr?.response?.data?.error?.message || photoErr?.message}`);
        return {
            success: false,
            message: photoErr?.response?.data?.error?.message || photoErr?.message,
        };
    }
};

export const getGroupActivityLogs = async (userId: number): Promise<GroupActivityLog[]> => {
    return activityLogsStore.filter((log) => log.userId === userId).slice(0, 50);
};

