import { cn } from '@/lib/utils';
import type { ReelStatus } from '@/lib/apiClient';

interface StatusBadgeProps {
  status: ReelStatus | 'all' | string;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-slate-700 text-slate-200',
  scheduled: 'bg-cyan-500 text-white',
  uploading: 'bg-amber-500 text-white',
  publishing: 'bg-violet-500 text-white',
  published: 'bg-emerald-500 text-white',
  failed: 'bg-red-500 text-white',
  all: 'bg-slate-700 text-slate-100',
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] || 'bg-slate-700 text-slate-200';
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        style
      )}
    >
      {label}
    </span>
  );
}
