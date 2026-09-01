import { useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Loader2,
  Clapperboard,
  Captions,
  CalendarDays,
  Zap,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import ToastContainer from '@/components/Toast';
import type { LoginRequest } from '@/lib/apiClient';

const features = [
  {
    icon: Captions,
    title: 'Schedule Reels & Facebook Groups',
    description: 'Auto-publish to Facebook Pages & Groups seamlessly',
  },
  {
    icon: CalendarDays,
    title: 'RSS Auto-Pilot Pipeline',
    description: 'Auto-convert YouTube feeds into published Reels 24/7',
  },
  {
    icon: Zap,
    title: 'Background Worker & Retries',
    description: 'Automated 1-click cross-posting & Graph API retries',
  },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, loading, error, clearError, initialized } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginRequest>();

  const from = (location.state as { from?: string })?.from || '/dashboard';

  useEffect(() => {
    if (initialized && user) {
      navigate(from, { replace: true });
    }
  }, [initialized, user, navigate, from]);

  const onSubmit = async (data: LoginRequest) => {
    clearError();
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch {
    }
  };

  const handleDemoFill = () => {
    setValue('email', 'jawadiq@yahoo.com');
    setValue('password', 'Test1234');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0A1628] text-slate-100 relative overflow-hidden">
      {/* Background Ambient Glowing Mesh & Grid Pattern */}
      <div className="bg-ambient-mesh" />
      <div className="bg-grid-pattern" />

      {/* Left Branding Showcase Column */}
      <div className="relative hidden lg:flex lg:w-1/2 items-center justify-center p-12 z-10 border-r border-slate-800/80 bg-[#0A1628]/60 backdrop-blur-md">
        <div className="max-w-md space-y-8 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-glow-strong">
              <Clapperboard className="h-6 w-6 text-primary-950" />
            </div>
            <span className="font-display text-3xl font-extrabold tracking-tight text-slate-100">
              Reel<span className="text-accent-400">Pilot</span>
            </span>
          </div>

          <div>
            <h2 className="font-display text-4xl font-extrabold leading-tight text-slate-100 tracking-tight">
              Automate your <span className="bg-gradient-to-r from-accent-400 via-cyan-300 to-indigo-400 bg-clip-text text-transparent">Facebook Reels</span> pipeline
            </h2>
            <p className="mt-4 text-slate-300/80 text-base leading-relaxed">
              Plan, batch, cross-post to Facebook Groups, and publish short-form video content on autopilot with AI support.
            </p>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-800/80">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-[#12233D]/60 border border-slate-700/40 backdrop-blur-md">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-400/15 text-accent-400">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-100">{title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-emerald-400 pt-2 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            <span>Background Worker & RSS Auto-Pilot Online</span>
          </div>
        </div>
      </div>

      {/* Right Login Form Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 shadow-glow">
              <Clapperboard className="h-6 w-6 text-primary-950" />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-slate-100">
              Reel<span className="text-accent-400">Pilot</span>
            </span>
          </div>

          {/* Glassmorphism Card Wrapper */}
          <div className="bg-[#12233D]/80 backdrop-blur-xl border border-slate-700/60 p-8 rounded-2xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h1 className="font-display text-2xl font-bold tracking-tight text-slate-100">
                  Welcome Back
                </h1>
                <p className="mt-1 text-xs text-slate-400">
                  Sign in to manage your Reels & Facebook Pages
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-400/10 text-accent-400 border border-accent-400/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="input-field font-medium text-sm"
                  placeholder="you@example.com"
                  autoComplete="email"
                  {...register('email', {
                    required: 'Email is required',
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: 'Invalid email address',
                    },
                  })}
                />
                {errors.email && (
                  <p className="form-error">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className="input-field font-medium text-sm"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters',
                    },
                  })}
                />
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-4 py-3 text-xs text-red-300 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full !py-2.5 text-sm font-bold shadow-glow hover:shadow-glow-strong"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </button>

              <button
                type="button"
                onClick={handleDemoFill}
                className="w-full py-2 px-3 rounded-lg border border-slate-700/80 bg-slate-800/80 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>Auto-fill Demo Credentials</span>
              </button>
            </form>

            <div className="pt-4 border-t border-slate-800/80 text-center">
              <p className="text-xs text-slate-400">
                Don&apos;t have an account?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-accent-400 hover:text-accent-300 transition-colors"
                >
                  Create free account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
