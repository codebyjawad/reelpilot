import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  trend?: string;
  colorClass?: 'cyan' | 'coral' | 'emerald' | 'violet';
}

const colorMap = {
  cyan: {
    border: 'border-t-cyan-400',
    iconBg: 'bg-cyan-400/10',
    iconColor: 'text-cyan-400',
    trend: 'text-emerald-400',
  },
  coral: {
    border: 'border-t-red-500',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    trend: 'text-red-400',
  },
  emerald: {
    border: 'border-t-emerald-500',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
    trend: 'text-emerald-400',
  },
  violet: {
    border: 'border-t-violet-500',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
    trend: 'text-emerald-400',
  },
};

export default function KpiCard({
  title,
  value,
  icon,
  trend,
  colorClass = 'cyan',
}: KpiCardProps) {
  const colors = colorMap[colorClass];
  const isTrendPositive = trend?.startsWith('+');

  return (
    <div
      className={cn(
        'card p-5 border-t-2',
        colors.border
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg',
            colors.iconBg
          )}
        >
          <div className={colors.iconColor}>{icon}</div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            {title}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-slate-100">
              {value}
            </span>
            {trend && (
              <span
                className={cn(
                  'text-xs font-medium',
                  isTrendPositive ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {trend}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
