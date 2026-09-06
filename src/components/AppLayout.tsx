import { useState, useEffect } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ListVideo,
  FileEdit,
  Users,
  Settings,
  LogOut,
  Plus,
  Menu,
  X,
  ChevronRight,
  Clapperboard,
  Bot,
  Sparkles,
  MessageSquare,
  Activity,
  Cpu,
  Zap,
  ShieldCheck,
  Split,
  Flame,
  Youtube,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { usePagesStore } from '@/store/pagesStore';
import { useToast } from '@/store/toastStore';
import ToastContainer from '@/components/Toast';
import { BulkImportModal } from '@/components/BulkImportModal';
import { backgroundApi, type BackgroundWorkerStats } from '@/lib/apiClient';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: BarChart3, label: 'Dashboard' },
  { to: '/queue', icon: ListVideo, label: 'Queue' },
  { to: '/drafts', icon: FileEdit, label: 'Drafts' },
  { to: '/rss-autopilot', icon: Bot, label: 'RSS Auto-Pilot' },
  { to: '/viral-shorts', icon: Flame, label: 'Viral Shorts' },
  { to: '/ai-autopilot', icon: Sparkles, label: 'AI Image Pilot' },
  { to: '/branding', icon: ShieldCheck, label: 'Branding Presets' },
  { to: '/engagement', icon: MessageSquare, label: 'Auto-Reply Rules' },
  { to: '/ab-testing', icon: Split, label: 'A/B Testing' },
  { to: '/pages', icon: Users, label: 'Pages' },
  { to: '/groups', icon: Users, label: 'FB Groups' },
  { to: '/comments', icon: MessageSquare, label: 'AI Comments' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const getPathSegments = (pathname: string): { label: string; path: string }[] => {
  const segments = pathname.split('/').filter(Boolean);
  const result: { label: string; path: string }[] = [];
  let accumulated = '';
  for (const seg of segments) {
    accumulated += '/' + seg;
    const labelMap: Record<string, string> = {
      dashboard: 'Dashboard',
      queue: 'Queue',
      drafts: 'Drafts',
      pages: 'Pages',
      settings: 'Settings',
      reels: 'Reels',
      branding: 'Branding Presets',
      engagement: 'Auto-Reply Rules',
      'ab-testing': 'A/B Testing',
      'viral-shorts': 'Viral Shorts',
      new: 'New',
      edit: 'Edit',
    };
    result.push({
      label:
        labelMap[seg] ||
        (seg.match(/^\d+$/) ? '#' + seg : seg.charAt(0).toUpperCase() + seg.slice(1)),
      path: accumulated,
    });
  }
  return result;
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { push } = useToast();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [workerStats, setWorkerStats] = useState<BackgroundWorkerStats | null>(null);
  const [showWorkerTooltip, setShowWorkerTooltip] = useState(false);
  const pages = usePagesStore((s) => s.pages);
  const fetchPages = usePagesStore((s) => s.fetchPages);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  useEffect(() => {
    const fetchWorkerStats = () => {
      backgroundApi.getStatus()
        .then((data) => setWorkerStats(data))
        .catch(() => {});
    };
    fetchWorkerStats();
    const interval = setInterval(fetchWorkerStats, 20000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (sidebarOpen) setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      push({ title: 'Signed out', variant: 'info' });
      navigate('/login', { replace: true });
    } catch (err) {
      push({
        title: 'Sign out failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'error',
      });
    }
  };

  const breadcrumbs = getPathSegments(location.pathname);

  const SidebarContent = (
    <div className="flex h-full flex-col bg-[#0A1628]/80 backdrop-blur-xl">
      <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 shadow-glow">
          <Clapperboard className="h-5 w-5 text-primary-950" />
        </div>
        <span className="font-display text-lg font-bold tracking-tight text-slate-100">
          Reel<span className="text-accent-400">Pilot</span>
        </span>
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">        <ul className="space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-accent-400/15 text-accent-400 shadow-sm'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-slate-800 p-3">
        <div className="mb-3 rounded-lg bg-slate-800/50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-cyan-600 text-sm font-semibold text-primary-950">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200">
                {user?.name || 'User'}
              </p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut className="h-5 w-5" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-bg-page text-slate-100 relative">
      {/* Dynamic Ambient Background Mesh & Pattern Grid */}
      <div className="bg-ambient-mesh" />
      <div className="bg-grid-pattern" />

      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-60 shrink-0 border-r border-slate-800 transition-transform duration-300 lg:static lg:h-full lg:translate-x-0 bg-[#0A1628]/95 backdrop-blur-md',
          isMobile && !sidebarOpen && '-translate-x-full'
        )}
      >
        {SidebarContent}
      </aside>

      <div className="flex h-full flex-1 flex-col min-w-0 overflow-hidden relative">
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-slate-800/80 bg-bg-page/80 backdrop-blur-md">

          <div className="flex w-full items-center justify-between px-4 sm:px-6">
            <div className="flex items-center gap-3 min-w-0">
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
              )}
              <nav className="flex min-w-0 items-center gap-1 text-sm text-slate-500">
                {breadcrumbs.length === 0 ? (
                  <span className="text-slate-500">Home</span>
                ) : (
                  breadcrumbs.map((crumb, i) => (
                    <div key={crumb.path} className="flex items-center gap-1 min-w-0">
                      {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />}
                      <span
                        className={cn(
                          'truncate',
                          i === breadcrumbs.length - 1
                            ? 'font-medium text-slate-200'
                            : 'hover:text-slate-300'
                        )}
                      >
                        {crumb.label}
                      </span>
                    </div>
                  ))
                )}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {/* Background Worker Health Live Widget */}
              <div className="relative">
                <button
                  onClick={() => setShowWorkerTooltip(!showWorkerTooltip)}
                  className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900/90 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center gap-1.5 transition-all shadow-sm"
                  title="Background Worker Queue Health Status"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="font-mono text-[11px] text-emerald-400">Worker Online</span>
                </button>

                {showWorkerTooltip && (
                  <div className="absolute right-0 mt-2 w-64 p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl z-50 text-xs space-y-2 animate-fade-in text-slate-200">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="font-bold flex items-center gap-1.5 text-indigo-400">
                        <Activity className="h-4 w-4" />
                        Background Service Status
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">Active</span>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Pending Scheduled Queue:</span>
                        <strong className="text-slate-200">{workerStats?.pendingQueueCount ?? 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Background Retries:</span>
                        <strong className="text-slate-200">{workerStats?.autoRetriesCount ?? 0}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Worker Ticks:</span>
                        <strong className="text-slate-200">{workerStats?.totalTicks ?? 1}</strong>
                      </div>
                      {workerStats?.lastTickTime && (
                        <div className="flex justify-between pt-1 border-t border-slate-800/60 text-[10px]">
                          <span>Last Health Check:</span>
                          <span className="text-slate-400">{new Date(workerStats.lastTickTime).toLocaleTimeString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setBulkModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors flex items-center gap-1.5"
              >
                <span>⚡ Bulk Import</span>
              </button>

              <Link to="/reels/new" className="btn-primary !py-1.5 !px-3 text-sm shrink-0">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Reel</span>
              </Link>
            </div>
          </div>
        </header>

        <BulkImportModal
          isOpen={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          pages={pages}
          onSuccess={() => {
            push({ title: 'Bulk Reels successfully queued!', variant: 'success' });
            navigate('/queue');
          }}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">
            {children}
          </div>
        </main>

        {isMobile && (
          <nav className="fixed bottom-0 inset-x-0 z-30 flex items-center justify-around border-t border-slate-800 bg-[#0A1628] py-2 lg:hidden">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center gap-0.5 rounded-lg px-3 py-1 text-[10px] font-medium transition-colors',
                    isActive ? 'text-accent-400' : 'text-slate-500 hover:text-slate-300'
                  )
                }
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        )}
      </div>

      <ToastContainer />
    </div>
  );
}
