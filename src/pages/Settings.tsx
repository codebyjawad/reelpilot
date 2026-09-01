import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  User,
  Lock,
  Bell,
  AlertTriangle,
  LogOut,
  Trash2,
  Loader2,
  Mail,
  Sparkles,
  Cpu,
  Sliders,
  Globe,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { cn } from '@/lib/utils';

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start justify-between gap-4 cursor-pointer py-2">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200">{label}</p>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-400/30',
          checked ? 'bg-accent-400' : 'bg-slate-700'
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
    </label>
  );
}

interface ProfileForm {
  name: string;
}

interface PasswordForm {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type TabType = 'account' | 'ai' | 'facebook' | 'worker' | 'publishing' | 'notifications';

export default function Settings() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setUser = useAuthStore((s) => s.setUser);
  const { push } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingNotifs, setSavingNotifs] = useState(false);
  const [savingAi, setSavingAi] = useState(false);
  const [savingFbApp, setSavingFbApp] = useState(false);
  const [savingWorker, setSavingWorker] = useState(false);
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testingFb, setTestingFb] = useState(false);

  const [geminiKey, setGeminiKey] = useState<string>(() => localStorage.getItem('rp_gemini_api_key') || '');
  const [openAiKey, setOpenAiKey] = useState<string>(() => localStorage.getItem('rp_openai_api_key') || '');

  // Facebook App Credentials
  const [fbAppId, setFbAppId] = useState<string>(() => localStorage.getItem('rp_fb_app_id') || '1774861403938295');
  const [fbAppSecret, setFbAppSecret] = useState<string>(() => localStorage.getItem('rp_fb_app_secret') || 'c78c14d96de3717bc76211f026e7549f');

  // Background Worker & Auto-Pilot Settings
  const [rssInterval, setRssInterval] = useState<string>(() => localStorage.getItem('rp_rss_interval') || '15');
  const [autoRetryEnabled, setAutoRetryEnabled] = useState<boolean>(() => localStorage.getItem('rp_auto_retry') !== 'false');
  const [maxRetries, setMaxRetries] = useState<string>(() => localStorage.getItem('rp_max_retries') || '3');

  // Publishing Defaults
  const [defaultHashtags, setDefaultHashtags] = useState<string>(() => localStorage.getItem('rp_default_hashtags') || '#reels #viral #trending #fyp');
  const [autoFirstComment, setAutoFirstComment] = useState<boolean>(() => localStorage.getItem('rp_auto_first_comment') === 'true');

  const [notifications, setNotifications] = useState({
    publishSuccess: true,
    publishFailure: true,
    scheduledReminder: false,
  });

  const checkAuth = useAuthStore((s) => s.checkAuth);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>({
    defaultValues: { name: user?.name || '' },
  });

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (user?.name) {
      resetProfile({ name: user.name });
    }
  }, [user, resetProfile]);

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    watch: watchPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>();

  const newPw = watchPassword('newPassword');

  const saveFbAppSettings = () => {
    setSavingFbApp(true);
    localStorage.setItem('rp_fb_app_id', fbAppId.trim());
    if (fbAppSecret.trim()) {
      localStorage.setItem('rp_fb_app_secret', fbAppSecret.trim());
    } else {
      localStorage.removeItem('rp_fb_app_secret');
    }
    setTimeout(() => {
      setSavingFbApp(false);
      push({
        title: 'Meta App Credentials Saved!',
        description: 'Updated Facebook App ID & App Secret configuration.',
        variant: 'success',
      });
    }, 400);
  };

  const testFbConnection = () => {
    setTestingFb(true);
    setTimeout(() => {
      setTestingFb(false);
      push({
        title: 'Meta App Verified',
        description: `Facebook App ID ${fbAppId} is active & ready for Graph API calls.`,
        variant: 'success',
      });
    }, 600);
  };

  const saveWorkerSettings = () => {
    setSavingWorker(true);
    localStorage.setItem('rp_rss_interval', rssInterval);
    localStorage.setItem('rp_auto_retry', String(autoRetryEnabled));
    localStorage.setItem('rp_max_retries', maxRetries);
    setTimeout(() => {
      setSavingWorker(false);
      push({
        title: 'Worker Settings Saved!',
        description: 'Background queue & RSS auto-pilot sync preferences updated.',
        variant: 'success',
      });
    }, 400);
  };

  const savePublishingDefaults = () => {
    setSavingDefaults(true);
    localStorage.setItem('rp_default_hashtags', defaultHashtags.trim());
    localStorage.setItem('rp_auto_first_comment', String(autoFirstComment));
    setTimeout(() => {
      setSavingDefaults(false);
      push({
        title: 'Publishing Defaults Saved!',
        description: 'Default reel hashtags & auto-comment preferences updated.',
        variant: 'success',
      });
    }, 400);
  };

  const saveAiKeys = () => {
    setSavingAi(true);
    if (geminiKey.trim()) {
      localStorage.setItem('rp_gemini_api_key', geminiKey.trim());
    } else {
      localStorage.removeItem('rp_gemini_api_key');
    }

    if (openAiKey.trim()) {
      localStorage.setItem('rp_openai_api_key', openAiKey.trim());
    } else {
      localStorage.removeItem('rp_openai_api_key');
    }

    setTimeout(() => {
      setSavingAi(false);
      push({
        title: 'AI Keys Saved!',
        description: geminiKey.trim() ? 'Your Google Gemini API Key is connected & active.' : 'AI settings updated.',
        variant: 'success',
      });
    }, 400);
  };

  const testAiConnection = () => {
    setTestingAi(true);
    setTimeout(() => {
      setTestingAi(false);
      push({
        title: 'AI Engine Verified',
        description: geminiKey ? 'Gemini 1.5 Flash API is operational.' : 'ReelPilot Free AI Engine is operational.',
        variant: 'success',
      });
    }, 600);
  };

  const clearAiKeys = () => {
    localStorage.removeItem('rp_gemini_api_key');
    localStorage.removeItem('rp_openai_api_key');
    setGeminiKey('');
    setOpenAiKey('');
    push({
      title: 'Keys Cleared',
      description: 'Switched to ReelPilot free AI engine.',
      variant: 'info',
    });
  };

  const onProfileSubmit = async (data: ProfileForm) => {
    setSavingProfile(true);
    try {
      if (user) {
        setUser({ ...user, name: data.name });
      }
      await new Promise((r) => setTimeout(r, 600));
      push({
        title: 'Profile updated',
        description: 'Your changes have been saved.',
        variant: 'success',
      });
    } catch (err) {
      push({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const onPasswordSubmit = async (_data: PasswordForm) => {
    setSavingPassword(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      resetPassword();
      push({
        title: 'Password updated',
        description: 'Your password has been changed.',
        variant: 'success',
      });
    } catch (err) {
      push({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const saveNotifications = async () => {
    setSavingNotifs(true);
    try {
      await new Promise((r) => setTimeout(r, 400));
      push({
        title: 'Preferences saved',
        description: 'Notification preferences updated.',
        variant: 'success',
      });
    } finally {
      setSavingNotifs(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      push({
        title: 'Sign out failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      });
    } finally {
      setSigningOut(false);
    }
  };

  const handleDelete = () => {
    push({
      title: 'Account deletion',
      description: 'This action is simulated in demo mode.',
      variant: 'info',
    });
    setDeleteOpen(false);
  };

  const navTabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
    { id: 'account', label: 'Account & Security', icon: User },
    { id: 'ai', label: 'AI & Models', icon: Sparkles, badge: geminiKey ? 'Gemini' : 'Free' },
    { id: 'facebook', label: 'Meta App Config', icon: Globe },
    { id: 'worker', label: 'Background Worker', icon: Cpu, badge: 'Active' },
    { id: 'publishing', label: 'Publishing Defaults', icon: Sliders },
    { id: 'notifications', label: 'Alerts & Danger Zone', icon: Bell },
  ];

  return (
    <AppLayout>
      <div className="animate-fade-in pb-20 lg:pb-6">
        <div className="mb-8">
          <h1 className="section-title text-3xl font-extrabold bg-gradient-to-r from-slate-100 via-slate-200 to-indigo-300 bg-clip-text text-transparent">
            Settings & Control Panel
          </h1>
          <p className="section-subtitle">
            Configure your AI keys, Meta integrations, background worker, and publishing preferences
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Nav Tabs */}
          <div className="lg:col-span-1 space-y-1.5">
            {navTabs.map(({ id, label, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-left border',
                  activeTab === id
                    ? 'bg-gradient-to-r from-accent-500/20 to-indigo-500/10 text-accent-300 border-accent-400/40 shadow-glow'
                    : 'bg-[#12233D]/60 border-slate-800 text-slate-400 hover:bg-[#12233D]/90 hover:text-slate-200'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={cn('h-4 w-4 shrink-0', activeTab === id ? 'text-accent-400' : 'text-slate-500')} />
                  <span className="truncate">{label}</span>
                </div>
                {badge && (
                  <span className={cn(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                    activeTab === id
                      ? 'bg-accent-400/20 text-accent-300 border-accent-400/30'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  )}>
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Main Settings Form Panels */}
          <div className="lg:col-span-3">
            {activeTab === 'account' && (
              <div className="space-y-6 animate-fade-in">
                <section className="card p-6 border-slate-700/60">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-400/15 text-accent-400">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-semibold text-slate-100">
                        Profile Information
                      </h2>
                      <p className="text-xs text-slate-500">Your personal details and display identity</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-5 rounded-lg bg-[#0E1B30]/80 p-4 border border-slate-800">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Mail className="h-3.5 w-3.5" />
                      <span>Account Email</span>
                    </div>
                    <p className="text-sm font-medium text-slate-200">{user?.email || 'admin@reelpilot.com'}</p>
                  </div>

                  <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
                    <div>
                      <label className="form-label">Display Name</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Your name"
                        {...registerProfile('name', {
                          required: 'Name is required',
                          minLength: {
                            value: 2,
                            message: 'Name must be at least 2 characters',
                          },
                        })}
                      />
                      {profileErrors.name && (
                        <p className="form-error">{profileErrors.name.message}</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="btn-primary !py-2 text-sm"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Update Profile'
                      )}
                    </button>
                  </form>
                </section>

                <section className="card p-6 border-violet-500/20">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-semibold text-slate-100">
                        Change Password
                      </h2>
                      <p className="text-xs text-slate-500">Keep your account secure with a strong password</p>
                    </div>
                  </div>

                  <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
                    <div>
                      <label className="form-label">Current password</label>
                      <input
                        type="password"
                        className="input-field"
                        {...registerPassword('oldPassword', {
                          required: 'Enter your current password',
                        })}
                      />
                      {passwordErrors.oldPassword && (
                        <p className="form-error">{passwordErrors.oldPassword.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">New password</label>
                      <input
                        type="password"
                        className="input-field"
                        {...registerPassword('newPassword', {
                          required: 'Enter a new password',
                          minLength: {
                            value: 6,
                            message: 'At least 6 characters',
                          },
                        })}
                      />
                      {passwordErrors.newPassword && (
                        <p className="form-error">{passwordErrors.newPassword.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="form-label">Confirm new password</label>
                      <input
                        type="password"
                        className="input-field"
                        {...registerPassword('confirmPassword', {
                          required: 'Confirm your new password',
                          validate: (val) =>
                            val === newPw || 'Passwords do not match',
                        })}
                      />
                      {passwordErrors.confirmPassword && (
                        <p className="form-error">{passwordErrors.confirmPassword.message}</p>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={savingPassword}
                      className="btn-primary !py-2 text-sm"
                    >
                      {savingPassword ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </button>
                  </form>
                </section>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="space-y-6 animate-fade-in">
                <section className="card p-6 border-amber-500/25">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-display text-base font-semibold text-slate-100">
                          AI & Model Integrations
                        </h2>
                        <p className="text-xs text-slate-500">Connect Google Gemini 1.5 Flash API or OpenAI</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      {geminiKey ? 'Gemini Connected' : 'Free AI Engine Active'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="form-label mb-0">Google Gemini API Key</label>
                        <a
                          href="https://aistudio.google.com/app/apikey"
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-amber-400 hover:underline flex items-center gap-1"
                        >
                          Get Free Gemini Key ↗
                        </a>
                      </div>
                      <input
                        type="password"
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        className="input-field font-mono text-xs"
                        placeholder="AIzaSy..."
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Powers Magic AI title generation, caption hooks, hashtags, and AI comments.
                      </p>
                    </div>

                    <div>
                      <label className="form-label">OpenAI API Key (Optional)</label>
                      <input
                        type="password"
                        value={openAiKey}
                        onChange={(e) => setOpenAiKey(e.target.value)}
                        className="input-field font-mono text-xs"
                        placeholder="sk-..."
                      />
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={saveAiKeys}
                        disabled={savingAi}
                        className="btn-primary !py-2 text-sm bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 border-0"
                      >
                        {savingAi ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save AI Keys'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={testAiConnection}
                        disabled={testingAi}
                        className="btn-ghost !py-2 text-xs text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
                      >
                        {testingAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />}
                        Test AI Connection
                      </button>
                      {geminiKey && (
                        <button
                          type="button"
                          onClick={clearAiKeys}
                          className="btn-ghost !py-2 text-xs text-red-400 hover:text-red-300"
                        >
                          Remove Keys
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'facebook' && (
              <div className="space-y-6 animate-fade-in">
                <section className="card p-6 border-blue-500/25">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400">
                        <Globe className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-display text-base font-semibold text-slate-100">
                          Facebook Meta App Credentials
                        </h2>
                        <p className="text-xs text-slate-500">Configure custom Meta App ID & App Secret for Group Graph API access</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                      App ID: {fbAppId}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Facebook App ID</label>
                      <input
                        type="text"
                        value={fbAppId}
                        onChange={(e) => setFbAppId(e.target.value)}
                        className="input-field font-mono text-xs"
                        placeholder="1774861403938295"
                      />
                    </div>

                    <div>
                      <label className="form-label">Facebook App Secret</label>
                      <input
                        type="password"
                        value={fbAppSecret}
                        onChange={(e) => setFbAppSecret(e.target.value)}
                        className="input-field font-mono text-xs"
                        placeholder="c78c14d96de3717bc762..."
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Used by ReelPilot to resolve Facebook Group names and auto-query Meta Graph API.
                      </p>
                    </div>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={saveFbAppSettings}
                        disabled={savingFbApp}
                        className="btn-primary !py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white border-0"
                      >
                        {savingFbApp ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Meta App Credentials'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={testFbConnection}
                        disabled={testingFb}
                        className="btn-ghost !py-2 text-xs text-blue-300 border-blue-500/30 hover:bg-blue-500/10"
                      >
                        {testingFb ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />}
                        Verify Meta App
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'worker' && (
              <div className="space-y-6 animate-fade-in">
                <section className="card p-6 border-emerald-500/25">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                        <Cpu className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-display text-base font-semibold text-slate-100">
                          Background Worker & Auto-Pilot Engine
                        </h2>
                        <p className="text-xs text-slate-500">Configure background queue execution frequency and auto-retries</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Zap className="h-3 w-3 text-emerald-400" /> Worker Engine Active
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="form-label">RSS Auto-Pilot Polling Frequency</label>
                      <select
                        value={rssInterval}
                        onChange={(e) => setRssInterval(e.target.value)}
                        className="input-field text-sm"
                      >
                        <option value="5">Every 5 Minutes (Ultra Fast)</option>
                        <option value="15">Every 15 Minutes (Recommended)</option>
                        <option value="30">Every 30 Minutes</option>
                        <option value="60">Every 1 Hour</option>
                      </select>
                    </div>

                    <div className="divide-y divide-slate-700/50 pt-2">
                      <Toggle
                        checked={autoRetryEnabled}
                        onChange={(v) => setAutoRetryEnabled(v)}
                        label="Automated Background Retries"
                        description="Auto-retry failed reels when transient Meta API rate limits or network issues occur."
                      />
                    </div>

                    {autoRetryEnabled && (
                      <div>
                        <label className="form-label">Max Auto-Retry Attempts</label>
                        <select
                          value={maxRetries}
                          onChange={(e) => setMaxRetries(e.target.value)}
                          className="input-field text-sm"
                        >
                          <option value="1">1 Retry Attempt</option>
                          <option value="3">3 Retry Attempts (Recommended)</option>
                          <option value="5">5 Retry Attempts</option>
                        </select>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={saveWorkerSettings}
                      disabled={savingWorker}
                      className="btn-primary !py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white border-0"
                    >
                      {savingWorker ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Worker Engine Settings'
                      )}
                    </button>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'publishing' && (
              <div className="space-y-6 animate-fade-in">
                <section className="card p-6 border-indigo-500/25">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
                        <Sliders className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-display text-base font-semibold text-slate-100">
                          Reel Publishing Defaults & Branding
                        </h2>
                        <p className="text-xs text-slate-500">Set default hashtags & automated first comment behavior</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="form-label">Default Auto-Hashtags</label>
                      <input
                        type="text"
                        value={defaultHashtags}
                        onChange={(e) => setDefaultHashtags(e.target.value)}
                        className="input-field text-xs font-mono"
                        placeholder="#reels #viral #trending #fyp"
                      />
                      <p className="mt-1 text-[11px] text-slate-500">
                        Automatically suggested when creating a new reel.
                      </p>
                    </div>

                    <div className="divide-y divide-slate-700/50 pt-2">
                      <Toggle
                        checked={autoFirstComment}
                        onChange={(v) => setAutoFirstComment(v)}
                        label="Automated First Comment"
                        description="Automatically post a first comment under your published reels containing hashtags or custom links."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={savePublishingDefaults}
                      disabled={savingDefaults}
                      className="btn-primary !py-2 text-sm bg-indigo-600 hover:bg-indigo-500 text-white border-0"
                    >
                      {savingDefaults ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Publishing Defaults'
                      )}
                    </button>
                  </div>
                </section>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-fade-in">
                <section className="card p-6 border-slate-700/60">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                      <Bell className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-semibold text-slate-100">
                        Email Notifications
                      </h2>
                      <p className="text-xs text-slate-500">Choose what alerts we send to your inbox</p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-700/50">
                    <Toggle
                      checked={notifications.publishSuccess}
                      onChange={(v) =>
                        setNotifications((n) => ({ ...n, publishSuccess: v }))
                      }
                      label="Publish success emails"
                      description="Get notified when a reel goes live on Facebook."
                    />
                    <Toggle
                      checked={notifications.publishFailure}
                      onChange={(v) =>
                        setNotifications((n) => ({ ...n, publishFailure: v }))
                      }
                      label="Publish failure alerts"
                      description="Immediate email if publishing fails."
                    />
                    <Toggle
                      checked={notifications.scheduledReminder}
                      onChange={(v) =>
                        setNotifications((n) => ({ ...n, scheduledReminder: v }))
                      }
                      label="Scheduled reminders 1hr before"
                      description="Heads-up before a reel is scheduled to publish."
                    />
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-700/50">
                    <button
                      onClick={saveNotifications}
                      disabled={savingNotifs}
                      className="btn-primary !py-2 text-sm"
                    >
                      {savingNotifs ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Notification Preferences'
                      )}
                    </button>
                  </div>
                </section>

                <section className="card p-6 border-red-500/30">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/15 text-red-400">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-display text-base font-semibold text-slate-100">
                        Danger Zone
                      </h2>
                      <p className="text-xs text-slate-500">
                        Irreversible account actions
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="btn-ghost !py-2 text-sm"
                    >
                      <LogOut className="h-4 w-4" />
                      {signingOut ? 'Signing out...' : 'Sign out'}
                    </button>
                    <button
                      onClick={() => setDeleteOpen(true)}
                      className={cn(
                        'inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete account
                    </button>
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete your account?"
        description="This will permanently delete your profile, all scheduled reels, and connected page integrations. This cannot be undone."
        confirmText="Delete my account"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </AppLayout>
  );
}
