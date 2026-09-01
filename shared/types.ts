export type ReelStatus = 'draft' | 'scheduled' | 'uploading' | 'publishing' | 'published' | 'failed';

export type VideoSource = 'url' | 'upload';

export type TargetPlatform = 'facebook' | 'instagram' | 'tiktok' | 'youtube';

export interface User {
    id: number;
    email: string;
    name: string;
    passwordHash?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface FacebookPage {
    id: number;
    userId: number;
    fbPageId: string;
    name: string;
    avatarUrl?: string;
    accessTokenEnc?: string;
    accessToken?: string;
    permissions?: string[];
    tokenExpiresAt?: Date;
    connectedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Reel {
    id: number;
    userId: number;
    pageId: number;
    title: string;
    caption?: string | null;
    hashtags: string[];
    videoSource: VideoSource;
    videoUrl?: string | null;
    videoFilePath?: string | null;
    targetPlatforms?: TargetPlatform[];
    status: ReelStatus;
    scheduledAt?: Date | null;
    publishedAt?: Date | null;
    facebookPostId?: string | null;
    platformPostIds?: Record<string, string> | null;
    errorMessage?: string | null;
    retryCount: number;
    createdAt?: Date;
    updatedAt?: Date;
    page?: FacebookPage;
}

export interface RssFeed {
    id: number;
    userId: number;
    pageId: number;
    name: string;
    feedUrl: string;
    targetPlatforms: TargetPlatform[];
    intervalHours: number;
    isActive: boolean;
    lastPolledAt?: Date | null;
    importedCount: number;
    createdAt?: Date;
    updatedAt?: Date;
    page?: FacebookPage;
}

export interface PublishLog {
    id: number;
    reelId: number;
    attempt: number;
    success: boolean;
    responseCode?: number | null;
    errorMessage?: string | null;
    responseBody?: string | null;
    createdAt?: Date;
}

export interface RegisterRequest {
    email: string;
    name: string;
    password: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface CreateReelRequest {
    pageId: number;
    title: string;
    caption?: string;
    hashtags?: string[];
    videoSource: VideoSource;
    videoUrl?: string;
    targetPlatforms?: TargetPlatform[];
    scheduledAt?: string | Date;
}

export interface BulkImportItem {
    title: string;
    videoUrl: string;
    caption?: string;
    hashtags?: string[];
}

export interface BulkImportRequest {
    pageId: number;
    targetPlatforms?: TargetPlatform[];
    startAt?: string | Date;
    intervalHours?: number;
    items: BulkImportItem[];
}

export interface CreateRssFeedRequest {
    pageId: number;
    name: string;
    feedUrl: string;
    targetPlatforms?: TargetPlatform[];
    intervalHours?: number;
}

export interface UpdateReelRequest {
    pageId?: number;
    title?: string;
    caption?: string;
    hashtags?: string[];
    videoSource?: VideoSource;
    videoUrl?: string;
    targetPlatforms?: TargetPlatform[];
    scheduledAt?: string | Date;
    status?: ReelStatus;
}

export interface ReelQueryParams {
    status?: ReelStatus | 'all';
    pageId?: number;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
}

export interface PagedResult<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
}

export interface DashboardStats {
    totalScheduled: number;
    publishedToday: number;
    draftCount: number;
    connectedPages: number;
    failedCount: number;
    last7Days: Array<{
        date: string;
        published: number;
        scheduled: number;
    }>;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    validationErrors?: any;
}
