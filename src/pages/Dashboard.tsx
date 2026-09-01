import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  FileEdit,
  Users,
  AlertTriangle,
  Plus,
  Facebook,
  ListVideo,
  Eye,
  Flame,
  ExternalLink,
  Share2,
  Heart,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import KpiCard from '@/components/KpiCard';
import BarChart7Day from '@/components/BarChart7Day';
import { PeakTimeHeatmap } from '@/components/PeakTimeHeatmap';
import { RecycleModal } from '@/components/RecycleModal';
import { dashboardApi, recyclingApi, type DashboardStats, type AnalyticsStats, type RecyclableReel } from '@/lib/apiClient';
import { useAuthStore } from '@/store/authStore';

function ShimmerKpi() {
  return (
    <div className="card p-5 border-t-2 border-transparent">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 shrink-0 rounded-lg shimmer-bg" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 shimmer-bg" />
          <div className="h-7 w-16 shimmer-bg" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsStats | null>(null);
  const [recyclableReels, setRecyclableReels] = useState<RecyclableReel[]>([]);
  const [selectedRecycleReel, setSelectedRecycleReel] = useState<RecyclableReel | null>(null);
  const [recycleModalOpen, setRecycleModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [statsData, analyticsData, candidatesData] = await Promise.all([
        dashboardApi.getStats(),
        dashboardApi.getAnalytics().catch(() => null),
        recyclingApi.getCandidates().catch(() => []),
      ]);
      setStats(statsData);
      setAnalytics(analyticsData);
      setRecyclableReels(candidatesData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const defaultChartData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      date: d.toISOString(),
      published: 0,
      scheduled: 0,
    };
  });

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-8 pb-12">
        <div>
          <h1 className="section-title">Dashboard & Analytics</h1>
          <p className="section-subtitle">
            Welcome back, {user?.name || 'Creator'} — Here's how your short-form content is performing live!
          </p>
        </div>

        {error && (
          <div className="card p-4 mb-6 border-red-500/30 bg-red-500/5">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Operational KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => <ShimmerKpi key={i} />)
          ) : (
            <>
              <KpiCard
                title="Total Scheduled"
                value={stats?.totalScheduled ?? 0}
                icon={<Clock className="h-5 w-5" />}
                colorClass="cyan"
              />
              <KpiCard
                title="Published Today"
                value={stats?.publishedToday ?? 0}
                icon={<CheckCircle2 className="h-5 w-5" />}
                colorClass="emerald"
              />
              <KpiCard
                title="Draft Count"
                value={stats?.draftCount ?? 0}
                icon={<FileEdit className="h-5 w-5" />}
                colorClass="violet"
              />
              <KpiCard
                title="Connected Pages"
                value={stats?.connectedPages ?? 0}
                icon={<Users className="h-5 w-5" />}
                colorClass="cyan"
              />
              <KpiCard
                title="Failed"
                value={stats?.failedCount ?? 0}
                icon={<AlertTriangle className="h-5 w-5" />}
                colorClass="coral"
              />
            </>
          )}
        </div>

        {/* Performance Analytics Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5 border-l-4 border-indigo-500 bg-slate-900/90 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Reel Views</p>
                <p className="text-2xl font-extrabold text-slate-100 mt-1">
                  {(analytics?.totalViews ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Eye className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="card p-5 border-l-4 border-cyan-500 bg-slate-900/90 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Estimated Reach</p>
                <p className="text-2xl font-extrabold text-slate-100 mt-1">
                  {(analytics?.totalReach ?? 0).toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="card p-5 border-l-4 border-rose-500 bg-slate-900/90 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Likes & Shares</p>
                <p className="text-2xl font-extrabold text-slate-100 mt-1">
                  {((analytics?.totalLikes ?? 0) + (analytics?.totalShares ?? 0)).toLocaleString()}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Heart className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div className="card p-5 border-l-4 border-amber-500 bg-slate-900/90 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Viral Index Score</p>
                <p className="text-2xl font-extrabold text-slate-100 mt-1">
                  {analytics?.viralScore ?? 0} / 100
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Flame className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts and Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card p-6 lg:col-span-2">
            <h2 className="font-display text-lg font-semibold text-slate-100 mb-2">
              7-Day Publishing Trend
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Scheduled vs published reels over the last week
            </p>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="shimmer-bg h-8 w-full" />
                ))}
              </div>
            ) : (
              <BarChart7Day data={stats?.last7Days ?? defaultChartData} />
            )}
          </div>

          <div className="card p-6 flex flex-col justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold text-slate-100 mb-2">
                Platform Post Distribution
              </h2>
              <p className="text-xs text-slate-400 mb-4">
                Cross-posted distribution across social platforms
              </p>

              <div className="space-y-3">
                {[
                  { name: 'Facebook Reels', count: analytics?.platformBreakdown?.facebook ?? 0, color: 'bg-blue-500' },
                  { name: 'Instagram Reels', count: analytics?.platformBreakdown?.instagram ?? 0, color: 'bg-pink-500' },
                  { name: 'TikTok', count: analytics?.platformBreakdown?.tiktok ?? 0, color: 'bg-teal-500' },
                ].map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className={`h-3 w-3 rounded-full ${item.color}`} />
                      <span className="text-xs font-medium text-slate-200">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-300">{item.count} posts</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <Link
                to="/reels/new"
                className="w-full flex items-center justify-center gap-2 btn-primary !py-2 text-xs font-semibold"
              >
                <Plus className="h-4 w-4" />
                Create & Cross-Post Reel
              </Link>
            </div>
          </div>
        </div>

        {/* AI-Powered Best Time to Post Heatmap Widget */}
        <PeakTimeHeatmap
          onSelectSlot={(datetimeISO) => {
            navigate(`/reels/new?datetime=${encodeURIComponent(datetimeISO)}`);
          }}
        />

        {/* Evergreen Content Recycling Section */}
        {recyclableReels.length > 0 && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <RotateCcw className="h-5 w-5 text-emerald-400" />
                  Evergreen Content Recycling Engine
                </h2>
                <p className="text-xs text-slate-400">
                  Published Reels older than 7 days ready for auto-caption AI spinning & re-queuing
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {recyclableReels.slice(0, 4).map((reel) => (
                <div key={reel.id} className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-200 truncate">{reel.title}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                        {reel.daysAgo}d ago
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2">{reel.caption || 'No caption'}</p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedRecycleReel(reel);
                      setRecycleModalOpen(true);
                    }}
                    className="w-full py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Recycle with AI Caption Spin
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Viral Reels Section */}
        {analytics?.topReels && analytics.topReels.length > 0 && (
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <Flame className="h-5 w-5 text-amber-400" />
                  Top Viral Reels Performance
                </h2>
                <p className="text-xs text-slate-400">
                  Your best performing published Reels sorted by total view count
                </p>
              </div>
              <Link to="/queue" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300">
                View All Queue →
              </Link>
            </div>

            <div className="divide-y divide-slate-800 overflow-x-auto">
              {analytics.topReels.map((reel) => (
                <div key={reel.reelId} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-200 truncate">{reel.title}</h3>
                    <p className="text-xs text-slate-500">
                      Published {reel.publishedAt ? new Date(reel.publishedAt).toLocaleDateString() : 'recently'}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-xs text-slate-400 font-medium">Views</p>
                      <p className="text-sm font-bold text-indigo-400">{reel.views.toLocaleString()}</p>
                    </div>

                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-400 font-medium">Reach</p>
                      <p className="text-sm font-bold text-slate-300">{reel.reach.toLocaleString()}</p>
                    </div>

                    <div className="text-right hidden md:block">
                      <p className="text-xs text-slate-400 font-medium">Likes</p>
                      <p className="text-sm font-bold text-rose-400">{reel.likes.toLocaleString()}</p>
                    </div>

                    {reel.facebookPostUrl ? (
                      <a
                        href={reel.facebookPostUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        title="View Reel on Facebook"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="p-2 text-slate-600">
                        <Facebook className="h-4 w-4" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <RecycleModal
          isOpen={recycleModalOpen}
          onClose={() => setRecycleModalOpen(false)}
          reel={selectedRecycleReel}
          onRecycled={() => loadData()}
        />
      </div>
    </AppLayout>
  );
}
