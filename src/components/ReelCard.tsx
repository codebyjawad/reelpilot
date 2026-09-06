import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pencil, SendHorizontal, RefreshCw, Trash2, Clock, Users, ExternalLink, Share2, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatScheduledAt } from '@/lib/time';
import type { ReelWithPage } from '@/lib/apiClient';
import { useReelsStore } from '@/store/reelsStore';
import { useToast } from '@/store/toastStore';
import StatusBadge from '@/components/StatusBadge';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ShareToGroupModal } from '@/components/ShareToGroupModal';
import { VideoPreviewModal, resolvePlayableVideoUrl, isYoutubeUrl } from '@/components/VideoPreviewModal';

interface ReelCardProps {
  reel: ReelWithPage;
  variant?: 'grid' | 'list';
}

export default function ReelCard({ reel, variant = 'grid' }: ReelCardProps) {
  const { push } = useToast();
  const publishNow = useReelsStore((s) => s.publishNow);
  const retry = useReelsStore((s) => s.retry);
  const deleteReel = useReelsStore((s) => s.deleteReel);
  const actionLoading = useReelsStore((s) => s.actionLoading);

  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [videoPreviewOpen, setVideoPreviewOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [actionType, setActionType] = useState<'publish' | 'retry'>('publish');

  const playableVideoUrl = resolvePlayableVideoUrl(reel);
  const isYoutubeHover = isYoutubeUrl(playableVideoUrl);
  const isList = variant === 'list';
  const displayDate = reel.publishedAt || reel.scheduledAt;
  const dateLabel = reel.publishedAt
    ? `Published ${formatDistanceToNow(new Date(reel.publishedAt), { addSuffix: true })}`
    : reel.scheduledAt
      ? `Scheduled for ${formatScheduledAt(reel.scheduledAt)}`
      : 'No schedule set';

  const handlePublishAction = async () => {
    try {
      if (actionType === 'publish') {
        await publishNow(reel.id);
        push({
          title: 'Publishing started',
          description: `${reel.title} is being published now`,
          variant: 'info',
        });
      } else {
        await retry(reel.id);
        push({
          title: 'Retrying publication',
          description: `${reel.title} is being retried`,
          variant: 'info',
        });
      }
    } catch (err) {
      push({
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'error',
      });
    } finally {
      setConfirmPublish(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteReel(reel.id);
      push({
        title: 'Reel deleted',
        description: `${reel.title} has been removed`,
        variant: 'success',
      });
    } catch (err) {
      push({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'error',
      });
    } finally {
      setConfirmDelete(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'card group animate-fade-in transition-all duration-300',
          isList ? 'p-2.5' : 'p-4 hover:shadow-card-hover'
        )}
      >
        <div className={cn(isList ? 'flex items-center gap-3' : 'flex gap-4')}>
          <div className="relative shrink-0">
            <div
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onClick={() => setVideoPreviewOpen(true)}
              className={cn(
                'relative overflow-hidden rounded-lg bg-slate-800 cursor-pointer group/thumb border border-slate-700/50 shadow-md',
                isList ? 'h-14 w-14 rounded-md' : 'aspect-[9/16] w-24'
              )}
              title="Click to Preview Video Player"
            >
              {isHovering && playableVideoUrl && !isYoutubeHover ? (
                <video
                  src={playableVideoUrl}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : reel.thumbnailUrl ? (
                <img
                  src={reel.thumbnailUrl}
                  alt={reel.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-2 text-center">
                  <Play className="h-6 w-6 text-indigo-400 mb-1 group-hover/thumb:scale-110 transition-transform" fill="currentColor" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Preview</span>
                </div>
              )}

              {/* Hover Badge Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                <span className="px-2 py-1 rounded bg-indigo-600/90 text-white font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-lg backdrop-blur-sm">
                  <Play className="h-3 w-3 fill-white" /> Preview
                </span>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-semibold text-slate-100">{reel.title}</h3>
              <StatusBadge status={reel.status} />
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-slate-800/50 px-2 py-0.5">
                {reel.page.avatarUrl ? (
                  <img
                    src={reel.page.avatarUrl}
                    alt={reel.page.name}
                    className="h-4 w-4 rounded-full object-cover"
                  />
                ) : (
                  <Users className="h-3 w-3 text-slate-400" />
                )}
                <span className="text-xs text-slate-300 truncate max-w-[120px]">
                  {reel.page.name}
                </span>
              </div>

              {displayDate && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="h-3 w-3" />
                  <span className="truncate">{dateLabel}</span>
                </div>
              )}
            </div>

            {Array.isArray(reel.targetPlatforms) && reel.targetPlatforms.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {reel.targetPlatforms.map((platform) => (
                  <span
                    key={platform}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                      platform === 'youtube'
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : platform === 'instagram'
                        ? 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                        : platform === 'tiktok'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}
                  >
                    {platform === 'youtube' ? 'YouTube Shorts' : platform.toUpperCase()}
                  </span>
                ))}
              </div>
            )}

            {reel.caption && !isList && (
              <p className="mt-2 line-clamp-1 text-sm text-slate-400">
                {reel.caption}
              </p>
            )}

            <div className="mt-auto pt-3">
              <div className={cn('flex items-center gap-1 transition-opacity', isList ? 'opacity-100' : 'opacity-70 group-hover:opacity-100')}>
                {reel.status === 'published' && reel.facebookPostUrl && (
                  <a
                    href={reel.facebookPostUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md p-1.5 text-slate-400 hover:bg-sky-500/10 hover:text-sky-400 transition-colors"
                    title="View on Facebook"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}

                <Link
                  to={`/reels/${reel.id}/edit`}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition-colors"
                  title="Edit reel"
                >
                  <Pencil className="h-4 w-4" />
                </Link>

                {reel.status !== 'uploading' && reel.status !== 'publishing' && (
                  <button
                    onClick={() => {
                      setActionType('publish');
                      setConfirmPublish(true);
                    }}
                    disabled={actionLoading}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700/50 hover:text-emerald-400 transition-colors disabled:opacity-50"
                    title={reel.status === 'published' ? "Re-publish to Page" : "Publish now"}
                  >
                    <SendHorizontal className="h-4 w-4" />
                  </button>
                )}

                {reel.status === 'failed' && (
                  <button
                    onClick={() => {
                      setActionType('retry');
                      setConfirmPublish(true);
                    }}
                    disabled={actionLoading}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-700/50 hover:text-amber-400 transition-colors disabled:opacity-50"
                    title="Retry publication"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}

                <button
                  onClick={() => setVideoPreviewOpen(true)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-400 transition-colors"
                  title="Preview Reel Player"
                >
                  <Eye className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setShareModalOpen(true)}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors"
                  title="Share Reel to Facebook Group"
                >
                  <Share2 className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setConfirmDelete(true)}
                  disabled={actionLoading}
                  className="rounded-md p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-50"
                  title="Delete reel"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <VideoPreviewModal
        isOpen={videoPreviewOpen}
        onClose={() => setVideoPreviewOpen(false)}
        reel={reel}
      />

      <ShareToGroupModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        reel={reel}
      />

      <ConfirmDialog
        open={confirmPublish}
        title={actionType === 'publish' ? 'Publish now?' : 'Retry publication?'}
        description={
          actionType === 'publish'
            ? `"${reel.title}" will be published to ${reel.page.name} immediately. Continue?`
            : `Retry publishing "${reel.title}" to ${reel.page.name}?`
        }
        confirmText={actionType === 'publish' ? 'Publish now' : 'Retry'}
        cancelText="Cancel"
        onConfirm={handlePublishAction}
        onCancel={() => setConfirmPublish(false)}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete reel?"
        description={`This will permanently delete "${reel.title}". This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
