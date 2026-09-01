import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  UploadCloud,
  Link,
  Hash,
  CalendarDays,
  Users,
  Save,
  SendHorizontal,
  FileVideo,
  Loader2,
  ClipboardPaste,
  X,
  ArrowLeft,
  Sparkles,
  Type,
  Image,
} from 'lucide-react';
import { format, formatISO, parseISO } from 'date-fns';
import AppLayout from '@/components/AppLayout';
import FileUploader from '@/components/FileUploader';
import EmptyState from '@/components/EmptyState';
import { AiGeneratorModal } from '@/components/AiGeneratorModal';
import { AiSubtitleModal } from '@/components/AiSubtitleModal';
import { AiThumbnailModal } from '@/components/AiThumbnailModal';
import { useReelsStore } from '@/store/reelsStore';
import { usePagesStore } from '@/store/pagesStore';
import { useToast } from '@/store/toastStore';
import type { VideoSource, TargetPlatform } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

const schema = z.object({
  pageId: z.number({ required_error: 'Select a page to publish to' }),
  title: z.string().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  caption: z.string().max(2200, 'Caption must be under 2200 characters').optional().or(z.literal('')),
  hashtags: z.string().optional().or(z.literal('')),
  videoSource: z.enum(['url', 'upload']),
  videoUrl: z.string().url('Enter a valid video URL').optional().or(z.literal('')),
  scheduledAt: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/15 text-violet-400">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="font-display text-base font-semibold text-slate-100">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function toLocalInputValue(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = parseISO(dateStr);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return '';
  }
}

export default function EditReel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { push } = useToast();

  const updateReel = useReelsStore((s) => s.updateReel);
  const publishNow = useReelsStore((s) => s.publishNow);
  const fetchReel = useReelsStore((s) => s.fetchReel);
  const clearCurrentReel = useReelsStore((s) => s.clearCurrentReel);
  const currentReel = useReelsStore((s) => s.currentReel);
  const loading = useReelsStore((s) => s.loading);
  const actionLoading = useReelsStore((s) => s.actionLoading);
  const { pages, fetchPages } = usePagesStore();

  const reelId = Number(id);

  const [videoSource, setVideoSource] = useState<VideoSource>('url');
  const [targetPlatforms, setTargetPlatforms] = useState<TargetPlatform[]>(['facebook', 'instagram']);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pasting, setPasting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiSubtitleModalOpen, setAiSubtitleModalOpen] = useState(false);
  const [aiThumbnailModalOpen, setAiThumbnailModalOpen] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      videoSource: 'url',
      title: '',
      caption: '',
      hashtags: '',
      videoUrl: '',
      scheduledAt: '',
    },
  });

  useEffect(() => {
    if (!reelId) return;
    fetchReel(reelId);
    fetchPages();
    return () => clearCurrentReel();
  }, [reelId, fetchReel, fetchPages, clearCurrentReel]);

  useEffect(() => {
    if (currentReel && !loaded) {
      setVideoSource(currentReel.videoSource);
      reset({
        pageId: currentReel.pageId,
        title: currentReel.title,
        caption: currentReel.caption ?? '',
        hashtags: (currentReel.hashtags ?? []).join(', '),
        videoSource: currentReel.videoSource,
        videoUrl: currentReel.videoUrl ?? '',
        scheduledAt: toLocalInputValue(currentReel.scheduledAt),
      });
      setLoaded(true);
    }
  }, [currentReel, reset, loaded]);

  const captionVal = watch('caption') || '';
  const hashtagVal = watch('hashtags') || '';
  const pageIdVal = watch('pageId');
  const scheduledAtVal = watch('scheduledAt');

  const hashtagArr = hashtagVal
    .split(',')
    .map((h) => h.trim().replace(/^#/, ''))
    .filter(Boolean);

  const handleSourceChange = (s: VideoSource) => {
    setVideoSource(s);
    setValue('videoSource', s);
    if (s === 'url') {
      setUploadedFile(null);
    } else {
      setValue('videoUrl', '');
    }
  };

  const handlePaste = async () => {
    setPasting(true);
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setValue('videoUrl', text);
        push({ title: 'Pasted from clipboard', variant: 'success' });
      }
    } catch {
      push({
        title: 'Clipboard unavailable',
        description: 'Please paste manually (Ctrl/Cmd + V)',
        variant: 'info',
      });
    } finally {
      setPasting(false);
    }
  };

  if (!loading && !currentReel && reelId) {
    return (
      <AppLayout>
        <div className="max-w-md mx-auto">
          <button
            onClick={() => navigate('/queue')}
            className="btn-ghost !py-1.5 text-sm mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Queue
          </button>
          <EmptyState
            icon={<FileVideo className="h-12 w-12" />}
            title="Reel not found"
            description="This reel may have been deleted or you don't have access."
            ctaText="Go to Queue"
            onCta={() => navigate('/queue')}
          />
        </div>
      </AppLayout>
    );
  }

  const submitUpdate = async (values: FormValues, mode: 'draft' | 'submit') => {
    if (!values.pageId) {
      push({
        title: 'Missing page',
        description: 'Select a Facebook Page first',
        variant: 'error',
      });
      return;
    }

    const hashtagsArr = hashtagArr.length > 0 ? hashtagArr : undefined;

    const payload = {
      pageId: values.pageId,
      title: values.title,
      caption: values.caption || undefined,
      hashtags: hashtagsArr,
      videoUrl: values.videoSource === 'url' ? values.videoUrl || undefined : undefined,
      scheduledAt: undefined as string | undefined,
    };

    if (mode === 'submit' && values.scheduledAt) {
      payload.scheduledAt = formatISO(new Date(values.scheduledAt));
    } else if (mode === 'draft') {
      payload.scheduledAt = undefined;
    }

    try {
      await updateReel(reelId, payload);

      if (mode === 'submit' && !values.scheduledAt) {
        await publishNow(reelId);
        push({
          title: 'Publishing started',
          description: values.title,
          variant: 'info',
        });
      } else {
        push({
          title: mode === 'submit'
            ? (values.scheduledAt ? 'Reel rescheduled' : 'Reel updated')
            : 'Draft saved',
          description: values.title,
          variant: 'success',
        });
      }
      navigate('/queue', { replace: true });
    } catch (err) {
      push({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Please try again',
        variant: 'error',
      });
    }
  };

  const onSubmit = (v: FormValues) => submitUpdate(v, 'submit');
  const onSaveDraft = (v: FormValues) => {
    const vals = { ...v, scheduledAt: '' };
    setValue('scheduledAt', '');
    submitUpdate(vals, 'draft');
  };

  return (
    <AppLayout>
      <div className="animate-fade-in pb-32 lg:pb-6">
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/queue')}
            className="btn-ghost !p-2"
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="section-title">Edit Reel</h1>
            <p className="section-subtitle">
              {currentReel ? `Updating "${currentReel.title}"` : 'Loading reel...'}
              {currentReel?.scheduledAt && (
                <span className="ml-2 text-cyan-400">
                  · currently scheduled for {format(parseISO(currentReel.scheduledAt), 'MMM d, h:mm a')}
                </span>
              )}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="max-w-3xl space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-6">
                <div className="space-y-3">
                  <div className="shimmer-bg h-6 w-40" />
                  <div className="shimmer-bg h-10 w-full" />
                  <div className="shimmer-bg h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
            <section className="card p-6">
              <SectionHeader
                icon={UploadCloud}
                title="Source"
                subtitle="Where your video file lives"
              />
              <div className="inline-flex rounded-lg bg-bg-surface p-1 mb-5">
                {(['url', 'upload'] as VideoSource[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSourceChange(s)}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200',
                      videoSource === s
                        ? 'bg-bg-card text-slate-100 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    )}
                  >
                    {s === 'url' ? <Link className="h-4 w-4" /> : <FileVideo className="h-4 w-4" />}
                    {s === 'url' ? 'From URL' : 'Upload Video'}
                  </button>
                ))}
              </div>

              {videoSource === 'url' ? (
                <div>
                  <label className="form-label">Video URL</label>
                  <div className="relative">
                    <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      className="input-field !pl-9 !pr-24"
                      placeholder="https://..."
                      {...register('videoUrl')}
                    />
                    <button
                      type="button"
                      onClick={handlePaste}
                      disabled={pasting}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-700/60 transition-colors"
                    >
                      <ClipboardPaste className="h-3.5 w-3.5" />
                      {pasting ? '...' : 'Paste'}
                    </button>
                  </div>
                  {errors.videoUrl && (
                    <p className="form-error">{errors.videoUrl.message}</p>
                  )}
                  {currentReel?.videoFilePath && !uploadedFile && (
                    <p className="mt-2 text-xs text-slate-500">
                      Current file: {currentReel.videoFilePath}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="form-label">Video file</label>
                  <FileUploader
                    onFileSelected={(f) => setUploadedFile(f)}
                    onClear={() => setUploadedFile(null)}
                    existingFile={currentReel?.videoFilePath ?? currentReel?.videoUrl ?? null}
                    accept="video/*"
                    maxSizeMB={500}
                  />
                </div>
              )}
            </section>

            <section className="card p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <SectionHeader
                  icon={Hash}
                  title="Details"
                  subtitle="Caption, hashtags and destination"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAiModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-300 transition-all flex items-center gap-1.5"
                  >
                    <Sparkles className="h-4 w-4 text-amber-400" />
                    <span>AI Content</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiSubtitleModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 text-xs font-bold text-yellow-300 transition-all flex items-center gap-1.5"
                  >
                    <Type className="h-4 w-4 text-yellow-400" />
                    <span>AI Subtitles</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAiThumbnailModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-bold text-rose-300 transition-all flex items-center gap-1.5"
                  >
                    <Image className="h-4 w-4 text-rose-400" />
                    <span>AI Thumbnail</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="form-label">Publish to</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                    <select
                      className="input-field !pl-9 appearance-none pr-9"
                      value={pageIdVal ?? ''}
                      onChange={(e) =>
                        setValue('pageId', e.target.value ? Number(e.target.value) : 0, {
                          shouldValidate: true,
                        })
                      }
                    >
                      <option value="" disabled>
                        Select a Facebook Page
                      </option>
                      {pages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {errors.pageId && <p className="form-error">{errors.pageId.message}</p>}
                </div>

                <div>
                  <label className="form-label">Title</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="My awesome Reel title"
                    {...register('title')}
                  />
                  {errors.title && <p className="form-error">{errors.title.message}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="form-label !mb-0">Caption</label>
                    <span
                      className={cn(
                        'text-[11px]',
                        captionVal.length > 2100 ? 'text-amber-400' : 'text-slate-500',
                        captionVal.length > 2200 && 'text-red-400'
                      )}
                    >
                      {captionVal.length}/2200
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    className="input-field resize-y"
                    placeholder="Tell a story with your Reel..."
                    {...register('caption')}
                  />
                  {errors.caption && <p className="form-error">{errors.caption.message}</p>}
                </div>

                <div>
                  <label className="form-label">Hashtags (comma separated)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="reels, fyp, trending"
                    {...register('hashtags')}
                  />
                  {hashtagArr.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {hashtagArr.map((tag, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-400/20 px-2.5 py-0.5 text-xs text-violet-300"
                        >
                          #{tag}
                          <button
                            type="button"
                            onClick={() => {
                              const newArr = hashtagArr.filter((_, idx) => idx !== i);
                              setValue('hashtags', newArr.join(', '));
                            }}
                            className="hover:text-violet-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="card p-6">
              <SectionHeader
                icon={CalendarDays}
                title="Schedule"
                subtitle="When to publish this Reel"
              />
              <div>
                <label className="form-label">Publish date & time</label>
                <div className="relative">
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                  <input
                    type="datetime-local"
                    className="input-field !pl-9"
                    {...register('scheduledAt')}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {scheduledAtVal
                    ? `Will schedule for ${new Date(scheduledAtVal).toLocaleString()}`
                    : 'If you don\u2019t set a time, reel saves as draft unless you click Publish immediately.'}
                </p>
              </div>
            </section>
          </form>
        )}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-[#0A1628]/95 backdrop-blur-md p-4 sm:px-6 lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto max-w-3xl flex items-center justify-end gap-3">
            <button
              onClick={handleSubmit(onSaveDraft)}
              disabled={actionLoading || loading}
              className="btn-ghost"
            >
              <Save className="h-4 w-4" />
              Save as Draft
            </button>
            <button
              onClick={handleSubmit(onSubmit)}
              disabled={actionLoading || loading}
              className="btn-primary"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : scheduledAtVal ? (
                <CalendarDays className="h-4 w-4" />
              ) : (
                <SendHorizontal className="h-4 w-4" />
              )}
              {scheduledAtVal ? 'Update Schedule' : 'Save & Publish'}
            </button>
          </div>
        </div>

        <AiGeneratorModal
          isOpen={aiModalOpen}
          onClose={() => setAiModalOpen(false)}
          initialTopic={watch('title') || watch('videoUrl') || ''}
          onApply={(data) => {
            setValue('title', data.title || '', { shouldValidate: true });
            setValue('caption', data.caption || '', { shouldValidate: true });
            const tagsStr = Array.isArray(data.hashtags) ? data.hashtags.join(', ') : '';
            setValue('hashtags', tagsStr, { shouldValidate: true });
            push({ title: '✨ AI Content applied!', variant: 'success' });
          }}
        />

        <AiSubtitleModal
          isOpen={aiSubtitleModalOpen}
          onClose={() => setAiSubtitleModalOpen(false)}
          initialText={watch('caption') || watch('title') || ''}
          onApplySubtitles={(subsText) => {
            const currentCap = watch('caption') || '';
            setValue('caption', currentCap ? `${currentCap}\n\n${subsText}` : subsText, { shouldValidate: true });
            push({ title: '📝 AI Subtitles added to caption!', variant: 'success' });
          }}
        />

        <AiThumbnailModal
          isOpen={aiThumbnailModalOpen}
          onClose={() => setAiThumbnailModalOpen(false)}
          reelTitle={watch('title') || 'VIRAL REEL'}
          reelCaption={watch('caption') || ''}
          onApplyThumbnail={(thumbData) => {
            push({ title: '🖼️ AI Thumbnail cover design applied!', variant: 'success' });
          }}
        />
      </div>
    </AppLayout>
  );
}
