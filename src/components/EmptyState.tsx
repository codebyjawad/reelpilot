import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  ctaText?: string;
  onCta?: () => void;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  ctaText,
  onCta,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-700 bg-bg-surface/30 p-12 text-center animate-fade-in',
        className
      )}
    >
      <div className="mb-4 text-slate-500">{icon}</div>
      <h3 className="font-display text-lg font-semibold text-slate-200">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-sm text-slate-400">{description}</p>
      {ctaText && onCta && (
        <button
          onClick={onCta}
          className="btn-primary mt-6"
        >
          {ctaText}
        </button>
      )}
    </div>
  );
}
