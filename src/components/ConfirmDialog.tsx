import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div
        className={cn(
          'relative z-10 w-full max-w-md rounded-xl border border-slate-700 bg-bg-card p-6 shadow-card-lg animate-slide-up'
        )}
      >
        <h3 className="font-display text-lg font-semibold text-slate-100">
          {title}
        </h3>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="btn-ghost">
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              confirmVariant === 'danger'
                ? 'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-white bg-red-500 hover:bg-red-400 active:bg-red-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                : 'btn-primary'
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
