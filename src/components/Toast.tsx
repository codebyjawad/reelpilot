import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToastStore, type Toast, type ToastVariant } from '@/store/toastStore';

const variantStyles: Record<ToastVariant, { bg: string; border: string; icon: React.ReactNode; iconColor: string }> = {
  success: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: <CheckCircle2 className="h-5 w-5" />,
    iconColor: 'text-emerald-400',
  },
  error: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: <XCircle className="h-5 w-5" />,
    iconColor: 'text-red-400',
  },
  info: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    icon: <Info className="h-5 w-5" />,
    iconColor: 'text-cyan-400',
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.remove);
  const styles = variantStyles[toast.variant];

  return (
    <div
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border p-4 shadow-card-lg animate-slide-up',
        styles.bg,
        styles.border
      )}
    >
      <div className={cn('shrink-0 mt-0.5', styles.iconColor)}>
        {styles.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-100">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-xs text-slate-400">{toast.description}</p>
        )}
      </div>
      <button
        onClick={() => remove(toast.id)}
        className="shrink-0 rounded-md p-1 text-slate-500 hover:bg-slate-700/50 hover:text-slate-300 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-end gap-2 p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
