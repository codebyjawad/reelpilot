import { create } from 'zustand';

export type ToastVariant = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
}

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  push: (toast) => {
    const id = generateId();
    const newToast: Toast = { id, ...toast };
    set((state) => ({ toasts: [...state.toasts, newToast] }));
    setTimeout(() => {
      get().remove(id);
    }, 3000);
  },

  remove: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export function useToast() {
  const { toasts, push, remove } = useToastStore();
  return { toasts, push, remove };
}
