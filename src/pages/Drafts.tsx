import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileEdit, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ReelCard from '@/components/ReelCard';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import { useReelsStore } from '@/store/reelsStore';
import type { ReelStatus } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

const statusTabs: { value: ReelStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
];

export default function Drafts() {
  const navigate = useNavigate();
  const {
    reels,
    total,
    page,
    limit,
    filters,
    loading,
    fetchReels,
    setFilters,
    setPage,
  } = useReelsStore();

  useEffect(() => {
    setFilters({ status: 'draft' });
  }, [setFilters]);

  useEffect(() => {
    fetchReels();
  }, [fetchReels, page, filters]);

  const totalPages = Math.ceil(total / limit);

  const statusCounts = useMemo(() => {
    return {
      all: total,
      draft: reels.filter((r) => r.status === 'draft').length || total,
    };
  }, [total, reels]);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="section-title">Drafts</h1>
          <p className="section-subtitle">Your unfinished reels</p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {statusTabs.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilters({ status: value === 'all' ? 'draft' : value })}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
                  (filters.status || 'draft') === value || (value === 'all' && filters.status === 'draft')
                    ? 'bg-accent-400/15 text-accent-400 border border-accent-400/20'
                    : 'text-slate-400 hover:bg-slate-800/50 border border-transparent'
                )}
              >
                {label}
                <StatusBadge status={value === 'all' ? 'all' : value} />
                <span className="text-xs">({statusCounts[value]})</span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card p-4">
                <div className="flex gap-4">
                  <div className="aspect-[9/16] w-24 rounded-lg shimmer-bg" />
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between">
                      <div className="h-5 w-3/4 shimmer-bg" />
                      <div className="h-5 w-16 shimmer-bg" />
                    </div>
                    <div className="h-4 w-1/2 shimmer-bg" />
                    <div className="h-4 w-full shimmer-bg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : reels.length === 0 ? (
          <EmptyState
            icon={<FileEdit className="h-12 w-12" />}
            title="No drafts yet"
            description="Start creating your first reel! Unfinished creations will be saved here."
            ctaText="Create New Reel"
            onCta={() => navigate('/reels/new')}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {reels.map((reel) => (
                <ReelCard key={reel.id} reel={reel} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="btn-ghost !px-3 !py-1.5 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="px-4 text-sm text-slate-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="btn-ghost !px-3 !py-1.5 disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
