import { useState } from 'react';
import { Users, CheckCircle2, AlertTriangle, Link2Off, Check, Video, Download } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { FacebookPage } from '@/lib/apiClient';
import { usePagesStore } from '@/store/pagesStore';
import { useToast } from '@/store/toastStore';
import ConfirmDialog from '@/components/ConfirmDialog';

interface PageCardProps {
  page: FacebookPage;
  selected?: boolean;
  onToggleSelect?: () => void;
  onFetchReels?: (page: FacebookPage) => void;
}

export default function PageCard({ page, selected, onToggleSelect, onFetchReels }: PageCardProps) {

  const { push } = useToast();
  const disconnectPage = usePagesStore((s) => s.disconnectPage);
  const getFacebookAuthUrl = usePagesStore((s) => s.getFacebookAuthUrl);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const POST_PERMISSION_TOKENS = ['pages_manage_posts', 'CREATE_CONTENT', 'MANAGE', 'PUBLISH'];
  const permList = Array.isArray(page.permissions) ? page.permissions.map((p) => String(p)) : [];
  const hasPostPermission = permList.length === 0 || permList.some((p) => POST_PERMISSION_TOKENS.includes(p));
  const isTokenExpired = page.tokenExpiresAt && new Date(page.tokenExpiresAt) < new Date();

  const handleReconnect = async () => {
    try {
      const authUrl = await getFacebookAuthUrl();
      const configured = usePagesStore.getState().facebookConfigured;
      if (configured && authUrl) {
        window.location.href = authUrl;
      } else {
        push({
          title: 'Reconnect unavailable',
          description: 'Facebook OAuth is not configured. Please add credentials or use Demo Pages.',
          variant: 'error',
        });
      }
    } catch (err) {
      push({
        title: 'Could not start reconnect',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'error',
      });
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnectPage(page.id);
      push({
        title: 'Page disconnected',
        description: `${page.name} has been removed`,
        variant: 'success',
      });
    } catch (err) {
      push({
        title: 'Failed to disconnect',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'error',
      });
    } finally {
      setDisconnecting(false);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <div className={cn(
        'card p-5 animate-fade-in relative transition-all duration-200',
        selected && 'border-blue-500/60 bg-blue-500/5 shadow-md shadow-blue-500/10'
      )}>
        <div className="flex items-start gap-3.5">
          {onToggleSelect && (
            <button
              type="button"
              onClick={onToggleSelect}
              className={cn(
                'mt-1 h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0',
                selected
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : 'border-slate-600 bg-slate-800 hover:border-slate-500 text-transparent'
              )}
              title={selected ? 'Deselect page' : 'Select page for bulk actions'}
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </button>
          )}

          <div className="shrink-0">
            {page.avatarUrl ? (
              <img
                src={page.avatarUrl}
                alt={page.name}
                className="h-12 w-12 rounded-full border-2 border-slate-700 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-slate-700 bg-slate-800 text-slate-400">
                <Users className="h-5 w-5" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-100 truncate">{page.name}</h3>
              {hasPostPermission ? (
                <span className="flex h-5 w-5 items-center justify-center text-emerald-400" title="Permissions OK">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
              ) : (
                <span className="flex h-5 w-5 items-center justify-center text-amber-400" title="Missing permissions">
                  <AlertTriangle className="h-5 w-5" />
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-slate-400">
              Connected {format(new Date(page.connectedAt), 'MMM d, yyyy')}
            </p>

            {isTokenExpired && (
              <p className="mt-2 text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Token expired — reconnect required
              </p>
            )}

            {!hasPostPermission && (
              <p className="mt-2 text-xs text-amber-400 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Missing pages_manage_posts permission
              </p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-800">
          <div>
            {onFetchReels && (
              <button
                type="button"
                onClick={() => onFetchReels(page)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all duration-200"
              >
                <Video className="h-3.5 w-3.5" />
                Fetch Reels
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {(isTokenExpired || !hasPostPermission) && (
              <button
                onClick={handleReconnect}
                className={cn(
                  'inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all duration-200'
                )}
              >
                <Link2Off className="h-3.5 w-3.5" />
                Reconnect
              </button>
            )}
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={disconnecting}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all duration-200 disabled:opacity-50'
              )}
            >
              Remove
            </button>
          </div>
        </div>
      </div>


      <ConfirmDialog
        open={confirmOpen}
        title="Disconnect Facebook Page"
        description={`Are you sure you want to disconnect "${page.name}"? Scheduled reels for this page will be paused.`}
        confirmText="Disconnect"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleDisconnect}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
