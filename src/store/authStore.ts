import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  authApi,
  setToken as apiSetToken,
  clearToken as apiClearToken,
  type User,
  type LoginRequest,
  type RegisterRequest,
  type AuthResponse,
} from '@/lib/apiClient';

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;

  setAuth: (data: AuthResponse) => void;
  setUser: (user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,
      initialized: false,

      setAuth: (data: AuthResponse) => {
        apiSetToken(data.accessToken);
        set({
          token: data.accessToken,
          user: data.user,
          error: null,
        });
      },

      setUser: (user: User) => {
        set({ user, error: null });
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
        } finally {
          apiClearToken();
          set({
            token: null,
            user: null,
            loading: false,
            error: null,
            initialized: true,
          });
        }
      },

      checkAuth: async () => {
        const { token, initialized } = get();
        if (!token) {
          set({ initialized: true, user: null });
          return;
        }
        if (initialized) return;

        set({ loading: true, error: null });
        try {
          const user = await authApi.me();
          set({
            user,
            loading: false,
            initialized: true,
          });
        } catch (err) {
          apiClearToken();
          set({
            token: null,
            user: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Auth check failed',
            initialized: true,
          });
        }
      },

      login: async (credentials: LoginRequest) => {
        set({ loading: true, error: null });
        try {
          const response = await authApi.login(credentials);
          get().setAuth(response);
          set({ loading: false, initialized: true });
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : 'Login failed',
          });
          throw err;
        }
      },

      register: async (data: RegisterRequest) => {
        set({ loading: true, error: null });
        try {
          const response = await authApi.register(data);
          get().setAuth(response);
          set({ loading: false, initialized: true });
        } catch (err) {
          set({
            loading: false,
            error: err instanceof Error ? err.message : 'Registration failed',
          });
          throw err;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'reelpilot-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          apiSetToken(state.token);
        }
      },
    }
  )
);
