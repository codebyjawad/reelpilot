import { Link } from 'react-router-dom';
import { Compass, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import AppLayout from '@/components/AppLayout';
import ToastContainer from '@/components/Toast';
import { cn } from '@/lib/utils';

export default function NotFound() {
  const user = useAuthStore((s) => s.user);
  const isAuthed = !!user;

  const content = (
    <div
      className={cn(
        'flex min-h-[80vh] flex-col items-center justify-center text-center animate-fade-in',
        !isAuthed && 'min-h-screen'
      )}
    >
      <div className="relative mb-6">
        <h1 className="font-display text-[120px] sm:text-[160px] font-bold leading-none tracking-tighter bg-gradient-to-br from-accent-400 via-cyan-500 to-accent-600 bg-clip-text text-transparent">
          404
        </h1>
        <div className="absolute -top-4 -right-6 sm:-right-10 rotate-12">
          <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-slate-800/80 border border-slate-700 shadow-card-lg">
            <Compass className="h-6 w-6 sm:h-8 sm:w-8 text-accent-400" />
          </div>
        </div>
      </div>

      <h2 className="font-display text-2xl sm:text-3xl font-semibold text-slate-100 tracking-tight">
        We couldn&apos;t find that page
      </h2>
      <p className="mt-3 max-w-md text-sm sm:text-base text-slate-400">
        The link you followed may be broken, or the page may have been moved.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          to={isAuthed ? '/dashboard' : '/login'}
          className="btn-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {isAuthed ? 'Back to Dashboard' : 'Go to Login'}
        </Link>
        {isAuthed && (
          <Link to="/queue" className="btn-ghost">
            View Queue
          </Link>
        )}
      </div>
    </div>
  );

  if (isAuthed) {
    return (
      <AppLayout>
        {content}
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-bg-page">
      {content}
      <ToastContainer />
    </div>
  );
}
