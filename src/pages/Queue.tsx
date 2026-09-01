import { useEffect, useMemo, useState, useRef } from 'react';
import { ListVideo, ChevronLeft, ChevronRight, Users, ChevronsUpDown, Check } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ReelCard from '@/components/ReelCard';
import EmptyState from '@/components/EmptyState';
import StatusBadge from '@/components/StatusBadge';
import { useReelsStore } from '@/store/reelsStore';
import { usePagesStore } from '@/store/pagesStore';
import type { ReelStatus } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

const statusTabs: { value: ReelStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'uploading', label: 'Uploading' },
  { value: 'publishing', label: 'Publishing' },
  { value: 'published', label: 'Published' },
  { value: 'failed', label: 'Failed' },
];
    
export default function Queue() {
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

  const { pages, fetchPages } = usePagesStore();
  const [pageDropdownOpen, setPageDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchReels();
  }, [fetchReels, page, filters]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPageDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const totalPages = Math.ceil(total / limit);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: total };
    for (const tab of statusTabs) {
      if (tab.value !== 'all') {
        counts[tab.value] = reels.filter((r) => r.status === tab.value).length;
      }
    }
    return counts;
  }, [total, reels]);

  const selectedPage = pages.find((p) => p.id === filters.pageId);

  return (
    <AppLayout>
      <div className="animate-fade-in pb-20 lg:pb-6">
        <div className="mb-6">
          <h1 className="section-title">Content Queue</h1>
          <p className="section-subtitle">Manage and schedule your reels</p>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {statusTabs.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilters({ status: value === 'all' ? undefined : value })}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
                  (filters.status || 'all') === value
                    ? 'bg-accent-400/15 text-accent-400 border border-accent-400/20'
                    : 'text-slate-400 hover:bg-slate-800/50 border border-transparent'
                )}
              >
                {label}
                <StatusBadge status={value} />
                <span className="text-xs">({statusCounts[value] ?? 0})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setPageDropdownOpen((v) => !v)}
                className="btn-ghost !py-1.5 !px-3 text-sm inline-flex items-center gap-2"
              >
                {selectedPage?.avatarUrl ? (
                  <img
                    src={selectedPage.avatarUrl}
                    alt={selectedPage.name}
                    className="h-4 w-4 rounded-full object-cover"
                  />
                ) : (
                  <Users className="h-4 w-4" />
                )}
                <span className="truncate max-w-[140px]">
                  {selectedPage?.name ?? 'All Pages'}
                </span>
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
              </button>

              {pageDropdownOpen && (
                <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-lg border border-slate-700 bg-bg-card py-1 shadow-card-lg animate-fade-in">
                  <button
                    onClick={() => {
                      setFilters({ pageId: undefined });
                      setPageDropdownOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                      !filters.pageId
                        ? 'bg-accent-400/10 text-accent-400'
                        : 'text-slate-300 hover:bg-slate-800/50'
                    )}
                  >
                    <Users className="h-4 w-4 shrink-0 opacity-60" />
                    <span className="flex-1 text-left">All Pages</span>
                    {!filters.pageId && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                  {pages.length === 0 && (
                    <div className="px-3 py-4 text-xs text-slate-500 text-center">
                      No pages connected
                    </div>
                  )}
                  {pages.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setFilters({ pageId: p.id });
                        setPageDropdownOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                        filters.pageId === p.id
                          ? 'bg-accent-400/10 text-accent-400'
                          : 'text-slate-300 hover:bg-slate-800/50'
                      )}
                    >
                      {p.avatarUrl ? (
                        <img
                          src={p.avatarUrl}
                          alt={p.name}
                          className="h-5 w-5 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="h-5 w-5 shrink-0 opacity-60" />
                      )}
                      <span className="flex-1 truncate text-left">{p.name}</span>
                      {filters.pageId === p.id && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            icon={<ListVideo className="h-12 w-12" />}
            title="No reels in queue"
            description={
              filters.status || filters.pageId
                ? 'Try adjusting your filters to see more content.'
                : 'Create your first reel to start scheduling content.'
            }
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
                  Page {page} of {totalPages} · {total} total
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
