export type ReelStatus =
  | 'draft'
  | 'scheduled'
  | 'uploading'
  | 'publishing'
  | 'published'
  | 'failed';

export type VideoSource = 'url' | 'upload';

export type TargetPlatform = 'facebook' | 'instagram' | 'tiktok' | 'youtube';

export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface FacebookPage {
  id: number;
  userId: number;
  pageId: string;
  name: string;
  avatarUrl: string | null;
  permissions: string[];
  tokenExpiresAt: string | null;
  connectedAt: string;
}

export interface FacebookPageStub {
  id: number;
  name: string;
  avatarUrl: string | null;
  fbPageId?: string;
  facebookPageUrl?: string | null;
}

export interface Reel {
  id: number;
  userId: number;
  pageId: number;
  title: string;
  caption: string | null;
  hashtags: string[];
  videoSource: VideoSource;
  videoUrl: string | null;
  videoFilePath: string | null;
  thumbnailUrl: string | null;
  targetPlatforms?: TargetPlatform[];
  status: ReelStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  facebookPostId: string | null;
  facebookPostUrl: string | null;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReelWithPage extends Reel {
  page: FacebookPageStub;
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

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface FacebookAuthUrlResponse {
  authUrl: string;
}

export interface PageListResponse {
  pages: FacebookPage[];
}

export interface CreateReelRequest {
  pageId: number;
  title: string;
  caption?: string;
  hashtags?: string[];
  videoSource: VideoSource;
  videoUrl?: string;
  scheduledAt?: string;
}

export interface UpdateReelRequest
  extends Partial<Omit<CreateReelRequest, 'videoSource'>> { }

export interface ReelQueryParams {
  status?: ReelStatus | 'all';
  pageId?: number;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface ReelListResponse {
  reels: ReelWithPage[];
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
  last7Days: { date: string; published: number; scheduled: number }[];
}

interface ApiErrorResponse {
  message?: string;
  error?: string;
}

const TOKEN_KEY = 'reelpilot_token';
const BASE_URL = '/api';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
  }
}

function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const obj = body as ApiErrorResponse;
    if (typeof obj.message === 'string' && obj.message.length > 0) {
      return obj.message;
    }
    if (typeof obj.error === 'string' && obj.error.length > 0) {
      return obj.error;
    }
  }
  return fallback;
}

function buildQueryString(params: Record<string, unknown>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (entries.length === 0) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of entries) {
    searchParams.append(key, String(value));
  }
  return '?' + searchParams.toString();
}

export interface RequestOptions extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
}

export async function request<T>(
  path: string,
  opts: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, ...rest } = opts;

  const url = BASE_URL + path;

  const isFormData = body instanceof FormData;

  const mergedHeaders: Record<string, string> = { ...headers };

  if (!isFormData && body !== undefined && body !== null) {
    mergedHeaders['Content-Type'] = 'application/json';
  }

  const token = getToken();
  if (token) {
    mergedHeaders['Authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = {
    method,
    headers: mergedHeaders,
    ...rest,
  };

  if (body !== undefined && body !== null) {
    init.body = isFormData ? (body as FormData) : JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Network error';
    throw new Error(message);
  }

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined' && !path.startsWith('/auth/')) {
      window.location.href = '/login';
    }
    const text = await res.text().catch(() => '');
    let parsedBody: unknown = null;
    try {
      parsedBody = text ? JSON.parse(text) : null;
    } catch {
      parsedBody = null;
    }
    const msg = extractErrorMessage(parsedBody, 'Unauthorized');
    throw new Error(msg);
  }

  const contentType = res.headers.get('content-type') || '';
  let parsedBody: unknown = null;

  if (contentType.includes('application/json')) {
    const text = await res.text().catch(() => '');
    if (text) {
      try {
        parsedBody = JSON.parse(text);
      } catch {
        parsedBody = text;
      }
    }
  } else {
    parsedBody = await res.text().catch(() => '');
  }

  if (!res.ok) {
    const fallback = `Request failed with status ${res.status}`;
    const msg = extractErrorMessage(parsedBody, fallback);
    throw new Error(msg);
  }

  const envelope = parsedBody as { success?: boolean; data?: unknown };
  if (
    envelope &&
    typeof envelope === 'object' &&
    'success' in envelope &&
    envelope.success === true &&
    'data' in envelope
  ) {
    return envelope.data as T;
  }

  return parsedBody as T;
}

export const authApi = {
  register(data: RegisterRequest): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: data,
    });
  },

  login(data: LoginRequest): Promise<AuthResponse> {
    return request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: data,
    });
  },

  logout(): Promise<void> {
    return request<void>('/auth/logout', { method: 'POST' });
  },

  me(): Promise<User> {
    return request<User>('/auth/me', { method: 'GET' });
  },
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

export interface FetchPageReelsResponse {
  page: FacebookPage;
  reels: FacebookFetchedReel[];
}

export const pagesApi = {
  list(): Promise<PageListResponse> {
    return request<PageListResponse>('/pages', { method: 'GET' });
  },

  disconnect(id: number): Promise<void> {
    return request<void>(`/pages/${id}`, { method: 'DELETE' });
  },

  bulkDisconnect(pageIds: number[]): Promise<{ count: number }> {
    return request<{ count: number }>('/pages/bulk-disconnect', {
      method: 'POST',
      body: { pageIds },
    });
  },

  getFacebookAuthUrl(): Promise<FacebookAuthUrlResponse> {
    return request<FacebookAuthUrlResponse>('/pages/facebook/auth-url', {
      method: 'GET',
    });
  },

  fetchReels(pageId: number, limit: number = 10): Promise<FetchPageReelsResponse> {
    return request<FetchPageReelsResponse>(`/pages/${pageId}/reels?limit=${limit}`, {
      method: 'GET',
    });
  },

  importReel(pageId: number, reel: Partial<FacebookFetchedReel>): Promise<{ reel: Reel }> {
    return request<{ reel: Reel }>(`/pages/${pageId}/import-reel`, {
      method: 'POST',
      body: {
        title: reel.title,
        description: reel.description,
        videoUrl: reel.videoUrl,
        thumbnailUrl: reel.thumbnailUrl,
        facebookPostId: reel.id,
        permalinkUrl: reel.permalinkUrl,
      },
    });
  },
};


export const reelsApi = {
  list(params?: ReelQueryParams): Promise<ReelListResponse> {
    const qs = params ? buildQueryString(params as Record<string, unknown>) : '';
    return request<ReelListResponse>(`/reels${qs}`, { method: 'GET' });
  },

  get(id: number): Promise<ReelWithPage> {
    return request<ReelWithPage>(`/reels/${id}`, { method: 'GET' });
  },

  create(data: CreateReelRequest, file?: File): Promise<Reel> {
    if (file) {
      const formData = new FormData();
      formData.append('pageId', String(data.pageId));
      formData.append('title', data.title);
      formData.append('videoSource', data.videoSource);
      if (data.caption) formData.append('caption', data.caption);
      if (data.hashtags && data.hashtags.length > 0) {
        formData.append('hashtags', JSON.stringify(data.hashtags));
      }
      if (data.scheduledAt) formData.append('scheduledAt', data.scheduledAt);
      formData.append('video', file);
      return request<Reel>('/reels', {
        method: 'POST',
        body: formData,
      });
    }
    return request<Reel>('/reels', {
      method: 'POST',
      body: data,
    });
  },

  update(id: number, data: UpdateReelRequest): Promise<Reel> {
    return request<Reel>(`/reels/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  remove(id: number): Promise<void> {
    return request<void>(`/reels/${id}`, { method: 'DELETE' });
  },

  publishNow(id: number): Promise<Reel> {
    return request<Reel>(`/reels/${id}/publish-now`, { method: 'POST' });
  },

  retry(id: number): Promise<Reel> {
    return request<Reel>(`/reels/${id}/retry`, { method: 'POST' });
  },

  getPeakTimes(date?: string): Promise<PeakTimesResponse> {
    const params = date ? `?date=${encodeURIComponent(date)}` : '';
    return request<PeakTimesResponse>(`/reels/peak-times${params}`, { method: 'GET' });
  },
};

export interface ReelInsights {
  reelId: number;
  title: string;
  views: number;
  reach: number;
  likes: number;
  shares: number;
  facebookPostUrl?: string | null;
  publishedAt?: string | null;
}

export interface AnalyticsStats {
  totalViews: number;
  totalReach: number;
  totalLikes: number;
  totalShares: number;
  viralScore: number;
  publishedCount: number;
  platformBreakdown: {
    facebook: number;
    instagram: number;
    tiktok: number;
  };
  topReels: ReelInsights[];
}

export interface PeakTimeSlot {
  label: string;
  datetime: string;
  formattedTime: string;
  score: number;
  rationale: string;
}

export interface PeakTimesResponse {
  slots: PeakTimeSlot[];
  bestNextSlot: PeakTimeSlot;
}

export const dashboardApi = {
  getStats(): Promise<DashboardStats> {
    return request<DashboardStats>('/dashboard/stats', { method: 'GET' });
  },
  getAnalytics(): Promise<AnalyticsStats> {
    return request<AnalyticsStats>('/dashboard/analytics', { method: 'GET' });
  },
};

export interface FacebookGroup {
  id: number;
  userId: number;
  fbGroupId: string;
  name: string;
  privacy: string;
  avatarUrl: string | null;
  memberCount: number | null;
  connectedAt: string;
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

export const groupsApi = {
  getGroups(): Promise<FacebookGroup[]> {
    return request<FacebookGroup[]>('/groups', { method: 'GET' });
  },
  list(): Promise<FacebookGroup[]> {
    return request<FacebookGroup[]>('/groups', { method: 'GET' });
  },

  connectGroup(data: { fbGroupId: string; name?: string; privacy?: string }): Promise<FacebookGroup> {
    return request<FacebookGroup>('/groups/connect', { method: 'POST', body: data });
  },
  updateGroup(id: number, data: { name?: string; privacy?: string; fbGroupId?: string }): Promise<FacebookGroup> {
    return request<FacebookGroup>(`/groups/${id}`, { method: 'PUT', body: data });
  },
  syncGroups(): Promise<FacebookGroup[]> {
    return request<FacebookGroup[]>('/groups/sync', { method: 'POST' });
  },
  getActivityLogs(): Promise<GroupActivityLog[]> {
    return request<GroupActivityLog[]>('/groups/activity', { method: 'GET' });
  },
  deleteGroup(id: number): Promise<void> {
    return request<void>(`/groups/${id}`, { method: 'DELETE' });
  },
  publishToGroup(id: number, data: { videoUrl: string; title: string; description?: string }): Promise<{ success: boolean; postId?: string; requiresWebShare?: boolean; sharerUrl?: string; message?: string }> {
    return request<{ success: boolean; postId?: string; requiresWebShare?: boolean; sharerUrl?: string; message?: string }>(`/groups/${id}/publish`, { method: 'POST', body: data });
  },
};

export interface BackgroundWorkerStats {
  status: 'running' | 'idle' | 'stopped';
  lastTickTime: string | null;
  totalTicks: number;
  reelsProcessedCount: number;
  rssFeedsSyncedCount: number;
  autoRetriesCount: number;
  pendingQueueCount: number;
  uptimeSeconds: number;
}

export const backgroundApi = {
  getStatus(): Promise<BackgroundWorkerStats> {
    return request<BackgroundWorkerStats>('/background/status', { method: 'GET' });
  },
  triggerAutoRetry(): Promise<{ retriedCount: number }> {
    return request<{ retriedCount: number }>('/background/retry', { method: 'POST' });
  },
};

export interface ReelComment {
  id: string;
  message: string;
  createdTime: string;
  fromName: string;
  fromId?: string;
  hasReplied?: boolean;
  likeCount?: number;
}

export const commentsApi = {
  getReelComments(reelId: number): Promise<{ reelTitle: string; comments: ReelComment[] }> {
    return request<{ reelTitle: string; comments: ReelComment[] }>(`/comments/reel/${reelId}`, { method: 'GET' });
  },
  generateAiReply(data: { commentMessage: string; reelTitle: string; tone?: string; geminiApiKey?: string }): Promise<{ reply: string }> {
    return request<{ reply: string }>('/comments/generate-reply', { method: 'POST', body: data });
  },
  postReply(data: { commentId: string; replyText: string; pageId?: number }): Promise<{ success: boolean; replyId?: string }> {
    return request<{ success: boolean; replyId?: string }>('/comments/reply', { method: 'POST', body: data });
  },
  runAutoBot(reelId: number, tone?: string): Promise<{ repliedCount: number; details: string[] }> {
    return request<{ repliedCount: number; details: string[] }>(`/comments/auto-bot/${reelId}`, { method: 'POST', body: { tone } });
  },
};

export interface ViralGroupRecommendation {
  category: string;
  searchKeyword: string;
  targetDemographic: string;
  viralMatchScore: number;
  rationale: string;
  suggestedGroupNames: string[];
}

export interface GroupDiscoveryResponse {
  topic: string;
  recommendations: ViralGroupRecommendation[];
  viralStrategyTip: string;
}

export const growthApi = {
  findViralGroups(topic: string, geminiApiKey?: string): Promise<GroupDiscoveryResponse> {
    return request<GroupDiscoveryResponse>('/growth/find-groups', { method: 'POST', body: { topic, geminiApiKey } });
  },
  generateViralHook(topic: string, groupName?: string, geminiApiKey?: string): Promise<{ hookText: string; callToAction: string }> {
    return request<{ hookText: string; callToAction: string }>('/growth/viral-hook', { method: 'POST', body: { topic, groupName, geminiApiKey } });
  },
};

export interface RecyclableReel {
  id: number;
  title: string;
  caption: string | null;
  hashtags: string[];
  videoSource: VideoSource;
  videoUrl: string | null;
  videoFilePath: string | null;
  publishedAt: string | null;
  pageName: string;
  pageId: number;
  daysAgo: number;
}

export interface HeatmapCell {
  dayIndex: number;
  dayName: string;
  hour: number;
  score: number;
  level: 'low' | 'medium' | 'high' | 'peak';
  datetimeISO: string;
  formattedTime: string;
  rationale: string;
}

export interface HeatmapMatrixResponse {
  days: string[];
  hours: number[];
  matrix: HeatmapCell[][];
  topPeakCell: HeatmapCell;
}

export const recyclingApi = {
  getCandidates(): Promise<RecyclableReel[]> {
    return request<RecyclableReel[]>('/reels/recycling/candidates', { method: 'GET' });
  },
  recycleReel(
    id: number,
    data: { customTitle?: string; scheduledAt?: string; targetPlatforms?: TargetPlatform[]; spinCaptionWithAi?: boolean }
  ): Promise<Reel> {
    return request<Reel>(`/reels/${id}/recycle`, { method: 'POST', body: data });
  },
};

export const peakTimeApi = {
  getHeatmap(): Promise<HeatmapMatrixResponse> {
    return request<HeatmapMatrixResponse>('/reels/peak-heatmap', { method: 'GET' });
  },
};

export interface ViralShortSource {
  id: number;
  userId: number;
  pageId: number;
  name: string;
  keywords: string[];
  minViews: number;
  publishedWithinDays: number;
  resultCount: number;
  targetPlatforms?: TargetPlatform[];
  useAiCaptions: boolean;
  autoImport: boolean;
  intervalHours: number;
  isActive: boolean;
  lastPolledAt?: string | null;
  discoveredCount: number;
  importedCount: number;
  page?: { id: number; name: string; avatarUrl: string | null };
}

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

export interface ViralShortsImportResult {
  scheduledCount: number;
  skippedExistingCount: number;
  reels: Array<{ id: number; title: string; scheduledAt: string | null; peakTimeLabel: string }>;
}

export interface ViralSourceSyncResult {
  candidateCount: number;
  scheduledCount: number;
  skippedExistingCount: number;
}

export interface ViralPeakSlot {
  datetimeISO: string;
  score: number;
}

export const viralShortsApi = {
  list(): Promise<{ sources: ViralShortSource[] }> {
    return request<{ sources: ViralShortSource[] }>('/viral-shorts', { method: 'GET' });
  },
  create(data: {
    pageId: number;
    name: string;
    keywords: string[];
    minViews?: number;
    publishedWithinDays?: number;
    resultCount?: number;
    targetPlatforms?: TargetPlatform[];
    useAiCaptions?: boolean;
    autoImport?: boolean;
    intervalHours?: number;
  }): Promise<{ source: ViralShortSource }> {
    return request<{ source: ViralShortSource }>('/viral-shorts', { method: 'POST', body: data });
  },
  discover(data: {
    keywords: string[];
    minViews?: number;
    publishedWithinDays?: number;
    resultCount?: number;
    youtubeApiKey?: string;
  }): Promise<{ candidates: ViralShortCandidate[] }> {
    return request<{ candidates: ViralShortCandidate[] }>('/viral-shorts/discover', { method: 'POST', body: data });
  },
  suggestTopics(seed?: string, pageId?: number): Promise<{ topics: string[] }> {
    return request<{ topics: string[] }>('/viral-shorts/suggest-topics', { method: 'POST', body: { seed: seed || '', pageId } });
  },
  importCandidates(data: {
    pageId: number;
    candidates: ViralShortCandidate[];
    targetPlatforms?: TargetPlatform[];
    useAiCaptions?: boolean;
  }): Promise<ViralShortsImportResult> {
    return request<ViralShortsImportResult>('/viral-shorts/import', { method: 'POST', body: data });
  },
  sync(id: number): Promise<ViralSourceSyncResult> {
    return request<ViralSourceSyncResult>(`/viral-shorts/${id}/sync`, { method: 'POST' });
  },
  update(id: number, data: {
    name?: string;
    keywords?: string[];
    pageId?: number;
    minViews?: number;
    publishedWithinDays?: number;
    resultCount?: number;
    targetPlatforms?: TargetPlatform[];
    useAiCaptions?: boolean;
    autoImport?: boolean;
    intervalHours?: number;
    isActive?: boolean;
  }): Promise<{ source: ViralShortSource }> {
    return request<{ source: ViralShortSource }>(`/viral-shorts/${id}`, { method: 'PUT', body: data });
  },
  toggle(id: number): Promise<{ source: ViralShortSource }> {
    return request<{ source: ViralShortSource }>(`/viral-shorts/${id}/toggle`, { method: 'PATCH' });
  },
  getPeakSlots(count: number, horizonHours?: number, pageId?: number): Promise<{ count: number; slots: ViralPeakSlot[] }> {
    const horizon = horizonHours ? `&horizon=${horizonHours}` : '';
    const page = pageId ? `&pageId=${pageId}` : '';
    return request<{ count: number; slots: ViralPeakSlot[] }>(`/viral-shorts/peak-slots?count=${count}${horizon}${page}`, { method: 'GET' });
  },
  remove(id: number): Promise<void> {
    return request<void>(`/viral-shorts/${id}`, { method: 'DELETE' });
  },
};

export const api = {
  get: <T = any>(url: string) => request<T>(url, { method: 'GET' }),
  post: <T = any>(url: string, data?: any) => request<T>(url, { method: 'POST', body: data }),
  put: <T = any>(url: string, data?: any) => request<T>(url, { method: 'PUT', body: data }),
  patch: <T = any>(url: string, data?: any) => request<T>(url, { method: 'PATCH', body: data }),
  delete: <T = any>(url: string) => request<T>(url, { method: 'DELETE' }),
};

export default api;
