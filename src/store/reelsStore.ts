import { create } from 'zustand';
import {
  reelsApi,
  type ReelWithPage,
  type Reel,
  type ReelQueryParams,
  type CreateReelRequest,
  type UpdateReelRequest,
  type ReelStatus,
} from '@/lib/apiClient';

interface ReelsFilters {
  status?: ReelStatus | 'all';
  pageId?: number;
  from?: string;
  to?: string;
}

interface ReelsState {
  reels: ReelWithPage[];
  total: number;
  page: number;
  limit: number;
  filters: ReelsFilters;
  loading: boolean;
  error: string | null;
  currentReel: ReelWithPage | null;
  actionLoading: boolean;

  fetchReels: (params?: ReelQueryParams) => Promise<void>;
  fetchReel: (id: number) => Promise<ReelWithPage>;
  createReel: (data: CreateReelRequest, file?: File) => Promise<Reel>;
  updateReel: (id: number, data: UpdateReelRequest) => Promise<Reel>;
  deleteReel: (id: number) => Promise<void>;
  publishNow: (id: number) => Promise<Reel>;
  retry: (id: number) => Promise<Reel>;
  setFilters: (filters: Partial<ReelsFilters>) => void;
  setPage: (page: number) => void;
  clearCurrentReel: () => void;
  clearError: () => void;
}

export const useReelsStore = create<ReelsState>((set, get) => ({
  reels: [],
  total: 0,
  page: 1,
  limit: 20,
  filters: {},
  loading: false,
  error: null,
  currentReel: null,
  actionLoading: false,

  fetchReels: async (params?: ReelQueryParams) => {
    const { filters, page, limit } = get();
    set({ loading: true, error: null });
    try {
      const queryParams: ReelQueryParams = {
        ...filters,
        page: params?.page ?? page,
        limit: params?.limit ?? limit,
        ...params,
      };
      const response = await reelsApi.list(queryParams);
      set({
        reels: response.reels,
        total: response.total,
        page: response.page,
        limit: response.limit,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load reels',
      });
      throw err;
    }
  },

  fetchReel: async (id: number) => {
    set({ loading: true, error: null });
    try {
      const reel = await reelsApi.get(id);
      set({
        currentReel: reel,
        loading: false,
      });
      return reel;
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load reel',
      });
      throw err;
    }
  },

  createReel: async (data: CreateReelRequest, file?: File) => {
    set({ actionLoading: true, error: null });
    try {
      const reel = await reelsApi.create(data, file);
      set({ actionLoading: false });
      return reel;
    } catch (err) {
      set({
        actionLoading: false,
        error: err instanceof Error ? err.message : 'Failed to create reel',
      });
      throw err;
    }
  },

  updateReel: async (id: number, data: UpdateReelRequest) => {
    set({ actionLoading: true, error: null });
    try {
      const reel = await reelsApi.update(id, data);
      set((state) => ({
        actionLoading: false,
        reels: state.reels.map((r) =>
          r.id === id ? ({ ...r, ...reel } as ReelWithPage) : r
        ),
        currentReel:
          state.currentReel?.id === id
            ? ({ ...state.currentReel, ...reel } as ReelWithPage)
            : state.currentReel,
      }));
      return reel;
    } catch (err) {
      set({
        actionLoading: false,
        error: err instanceof Error ? err.message : 'Failed to update reel',
      });
      throw err;
    }
  },

  deleteReel: async (id: number) => {
    set({ actionLoading: true, error: null });
    try {
      await reelsApi.remove(id);
      set((state) => ({
        actionLoading: false,
        reels: state.reels.filter((r) => r.id !== id),
        total: Math.max(0, state.total - 1),
        currentReel: state.currentReel?.id === id ? null : state.currentReel,
      }));
    } catch (err) {
      set({
        actionLoading: false,
        error: err instanceof Error ? err.message : 'Failed to delete reel',
      });
      throw err;
    }
  },

  publishNow: async (id: number) => {
    set({ actionLoading: true, error: null });
    try {
      const reel = await reelsApi.publishNow(id);
      set((state) => ({
        actionLoading: false,
        reels: state.reels.map((r) =>
          r.id === id ? ({ ...r, ...reel } as ReelWithPage) : r
        ),
        currentReel:
          state.currentReel?.id === id
            ? ({ ...state.currentReel, ...reel } as ReelWithPage)
            : state.currentReel,
      }));
      return reel;
    } catch (err) {
      set({
        actionLoading: false,
        error: err instanceof Error ? err.message : 'Failed to publish reel',
      });
      throw err;
    }
  },

  retry: async (id: number) => {
    set({ actionLoading: true, error: null });
    try {
      const reel = await reelsApi.retry(id);
      set((state) => ({
        actionLoading: false,
        reels: state.reels.map((r) =>
          r.id === id ? ({ ...r, ...reel } as ReelWithPage) : r
        ),
        currentReel:
          state.currentReel?.id === id
            ? ({ ...state.currentReel, ...reel } as ReelWithPage)
            : state.currentReel,
      }));
      return reel;
    } catch (err) {
      set({
        actionLoading: false,
        error: err instanceof Error ? err.message : 'Failed to retry reel',
      });
      throw err;
    }
  },

  setFilters: (filters: Partial<ReelsFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
      page: 1,
    }));
  },

  setPage: (page: number) => {
    set({ page });
  },

  clearCurrentReel: () => {
    set({ currentReel: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));
