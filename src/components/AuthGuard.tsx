import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, initialized, loading } = useAuthStore();
  const location = useLocation();

  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-page">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-accent-400/20"></div>
            <div className="absolute inset-0 rounded-full border-2 border-accent-400 border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-text-secondary animate-pulse-fade">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <>{children}</>;
}
