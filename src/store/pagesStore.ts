import { create } from 'zustand';
import {
  pagesApi,
  type FacebookPage,
} from '@/lib/apiClient';

export interface FacebookAuthPayload {
  authUrl: string;
  facebookConfigured: boolean;
}

interface PagesState {
  pages: FacebookPage[];
  loading: boolean;
  error: string | null;
  authUrl: string | null;
  facebookConfigured: boolean;

  fetchPages: () => Promise<void>;
  disconnectPage: (id: number) => Promise<void>;
  bulkDisconnectPages: (ids: number[]) => Promise<number>;
  getFacebookAuthUrl: () => Promise<string>;
  clearError: () => void;
  clearAuthUrl: () => void;
}

export const usePagesStore = create<PagesState>((set, get) => ({
  pages: [],
  loading: false,
  error: null,
  authUrl: null,
  facebookConfigured: false,

  fetchPages: async () => {
    set({ loading: true, error: null });
    try {
      const response = await pagesApi.list();
      set({
        pages: response.pages,
        loading: false,
      });
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error ? err.message : 'Failed to load Facebook pages',
      });
      throw err;
    }
  },

  disconnectPage: async (id: number) => {
    set({ loading: true, error: null });
    try {
      await pagesApi.disconnect(id);
      set((state) => ({
        pages: state.pages.filter((p) => p.id !== id),
        loading: false,
      }));
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error ? err.message : 'Failed to disconnect page',
      });
      throw err;
    }
  },

  bulkDisconnectPages: async (ids: number[]) => {
    set({ loading: true, error: null });
    try {
      const res = await pagesApi.bulkDisconnect(ids);
      set((state) => ({
        pages: state.pages.filter((p) => !ids.includes(p.id)),
        loading: false,
      }));
      return res.count;
    } catch (err) {
      set({
        loading: false,
        error:
          err instanceof Error ? err.message : 'Failed to bulk disconnect pages',
      });
      throw err;
    }
  },

  getFacebookAuthUrl: async () => {
    set({ loading: true, error: null });
    try {
      const payload = (await pagesApi.getFacebookAuthUrl()) as unknown as FacebookAuthPayload;
      set({
        authUrl: payload.authUrl,
        facebookConfigured: !!payload.facebookConfigured,
        loading: false,
      });
      return payload.authUrl;
    } catch (err) {
      set({
        loading: false,
        facebookConfigured: false,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to get Facebook authorization URL',
      });
      throw err;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  clearAuthUrl: () => {
    set({ authUrl: null });
  },
}));
