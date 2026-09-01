import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    UploadCloud,
    Link as LinkIcon,
    Hash,
    CalendarDays,
    Users,
    Save,
    SendHorizontal,
    FileVideo,
    Loader2,
    ClipboardPaste,
    X,
    Sparkles,
    Type,
    Image,
} from 'lucide-react';
import { formatISO } from 'date-fns';
import AppLayout from '@/components/AppLayout';
import FileUploader from '@/components/FileUploader';
import { AiGeneratorModal } from '@/components/AiGeneratorModal';
import { AiSubtitleModal } from '@/components/AiSubtitleModal';
import { AiThumbnailModal } from '@/components/AiThumbnailModal';
import { PeakTimePicker } from '@/components/PeakTimePicker';
import { useReelsStore } from '@/store/reelsStore';
import { usePagesStore } from '@/store/pagesStore';
import { useToast } from '@/store/toastStore';
import { groupsApi } from '@/lib/apiClient';
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-400/15 text-accent-400">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <h2 className="font-display text-base font-semibold text-slate-100">{title}</h2>
                <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
        </div>
    );
}

export default function NewReel() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { push } = useToast();
    const createReel = useReelsStore((s) => s.createReel);
    const publishNow = useReelsStore((s) => s.publishNow);
    const actionLoading = useReelsStore((s) => s.actionLoading);
    const { pages, fetchPages } = usePagesStore();

    const [videoSource, setVideoSource] = useState<VideoSource>('url');
    const [targetPlatforms, setTargetPlatforms] = useState<TargetPlatform[]>(['facebook', 'instagram']);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [pasting, setPasting] = useState(false);
    const [aiModalOpen, setAiModalOpen] = useState(false);
    const [aiSubtitleModalOpen, setAiSubtitleModalOpen] = useState(false);
    const [aiThumbnailModalOpen, setAiThumbnailModalOpen] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
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

    const [groupsList, setGroupsList] = useState<any[]>([]);

    useEffect(() => {
        fetchPages();
        groupsApi.getGroups().then((res) => setGroupsList(res || [])).catch(() => {});
    }, [fetchPages]);

    useEffect(() => {
        register('videoSource', { required: true });
    }, [register]);

    useEffect(() => {
        const dt = searchParams.get('datetime');
        if (dt) {
            try {
                const d = new Date(dt);
                const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
                setValue('scheduledAt', local, { shouldValidate: true });
                push({ title: 'Peak time pre-filled!', description: `Scheduled for ${d.toLocaleString()}`, variant: 'success' });
            } catch {
                // ignore invalid datetime
            }
        }
    }, [searchParams, setValue, push]);

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

    const submitForm = async (values: FormValues, mode: 'draft' | 'submit') => {
        if (!values.pageId) {
            push({
                title: 'Missing page',
                description: 'Select a Facebook Page first',
                variant: 'error',
            });
            return;
        }
        if (values.videoSource === 'url' && !values.videoUrl) {
            push({
                title: 'Missing video',
                description: 'Enter a video URL or switch to upload',
                variant: 'error',
            });
            return;
        }
        if (values.videoSource === 'upload' && !uploadedFile) {
            push({
                title: 'Missing video',
                description: 'Upload a video file first',
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
            videoSource: values.videoSource,
            videoUrl: values.videoSource === 'url' ? values.videoUrl || undefined : undefined,
            targetPlatforms,
            scheduledAt: undefined as string | undefined,
        };

        const publishImmediately = mode === 'submit' && !values.scheduledAt;
        if (mode === 'submit' && values.scheduledAt) {
            payload.scheduledAt = formatISO(new Date(values.scheduledAt));
        }

        try {
            const reel = await createReel(payload, uploadedFile ?? undefined);
            if (publishImmediately && reel && typeof (reel as any).id === 'number') {
                try {
                    await publishNow((reel as any).id);
                } catch (publishErr) {
                    push({
                        title: 'Reel saved, but publish failed',
                        description: publishErr instanceof Error ? publishErr.message : 'You can retry from the Queue screen.',
                        variant: 'error',
                    });
                    navigate('/queue', { replace: true });
                    return;
                }
            }
            push({
                title: mode === 'submit'
                    ? (values.scheduledAt ? 'Reel scheduled' : (publishImmediately ? 'Publishing started' : 'Draft saved'))
                    : 'Draft saved',
                description: values.title,
                variant: 'success',
            });
            navigate('/queue', { replace: true });
        } catch (err) {
            push({
                title: 'Failed to save reel',
                description: err instanceof Error ? err.message : 'Please try again',
                variant: 'error',
            });
        }
    };

    const onSubmit = (v: FormValues) => submitForm(v, 'submit');
    const onSaveDraft = (v: FormValues) => {
        const vals = { ...v, scheduledAt: '' };
        setValue('scheduledAt', '');
        submitForm(vals, 'draft');
    };

    return (
        <AppLayout>
            <div className="animate-fade-in pb-32 lg:pb-6">
                <div className="mb-8">
                    <h1 className="section-title">Create New Reel</h1>
                    <p className="section-subtitle">
                        Configure source, details, and publishing schedule
                    </p>
                </div>

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
                                    {s === 'url' ? <LinkIcon className="h-4 w-4" /> : <FileVideo className="h-4 w-4" />}
                                    {s === 'url' ? 'From URL' : 'Upload Video'}
                                </button>
                            ))}
                        </div>

                        {videoSource === 'url' ? (
                            <div>
                                <label className="form-label">Video URL</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
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
                            </div>
                        ) : (
                            <div>
                                <label className="form-label">Video file</label>
                                <FileUploader
                                    onFileSelected={(f) => setUploadedFile(f)}
                                    onClear={() => setUploadedFile(null)}
                                    accept="video/*"
                                    maxSizeMB={500}
                                />
                            </div>
                        )}
                    </section>

                    <section className="card p-6">
                        <div className="flex items-center justify-between">
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
                                <p className="text-xs text-slate-500 mb-3">Select a Facebook Page or Group destination</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {pages.map((p) => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setValue('pageId', p.id, { shouldValidate: true })}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                                pageIdVal === p.id
                                                    ? 'bg-indigo-500/15 border-indigo-500 shadow-sm ring-1 ring-indigo-500/30'
                                                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                                            }`}
                                        >
                                            {p.avatarUrl ? (
                                                <img src={p.avatarUrl} alt={p.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-bold shrink-0">
                                                    {p.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-sm font-semibold truncate ${pageIdVal === p.id ? 'text-indigo-300' : 'text-slate-200'}`}>
                                                    {p.name}
                                                </p>
                                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                                    Facebook Page
                                                </p>
                                            </div>
                                            {pageIdVal === p.id && (
                                                <div className="h-5 w-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                    {groupsList.map((g) => (
                                        <button
                                            key={`group-${g.id}`}
                                            type="button"
                                            onClick={() => setValue('pageId', pages[0]?.id || 1, { shouldValidate: true })}
                                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                                                pageIdVal === (pages[0]?.id || 1)
                                                    ? 'bg-cyan-500/15 border-cyan-500 shadow-sm ring-1 ring-cyan-500/30'
                                                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                                            }`}
                                        >
                                            {g.avatarUrl ? (
                                                <img src={g.avatarUrl} alt={g.name} className="h-10 w-10 rounded-full object-cover shrink-0" />
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-sm font-bold shrink-0">
                                                    {g.name.charAt(0)}
                                                </div>
                                            )}
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-slate-200 truncate">{g.name}</p>
                                                <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                                                    Facebook Group
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                {errors.pageId && <p className="form-error">{errors.pageId.message}</p>}
                                {pages.length === 0 && groupsList.length === 0 && (
                                    <p className="mt-2 text-xs text-amber-400">
                                        No pages or groups connected. Add one from the Pages tab first.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="form-label">Target Platforms (Cross-Posting)</label>
                                <div className="flex items-center gap-2 pt-1">
                                    {[
                                        { id: 'facebook', label: 'Facebook Reels' },
                                        { id: 'instagram', label: 'Instagram Reels' },
                                        { id: 'tiktok', label: 'TikTok' },
                                        { id: 'youtube', label: 'YouTube Shorts' },
                                    ].map((item) => (
                                        <button
                                            type="button"
                                            key={item.id}
                                            onClick={() => {
                                                if (targetPlatforms.includes(item.id as TargetPlatform)) {
                                                    if (targetPlatforms.length > 1) {
                                                        setTargetPlatforms(targetPlatforms.filter(p => p !== item.id));
                                                    }
                                                } else {
                                                    setTargetPlatforms([...targetPlatforms, item.id as TargetPlatform]);
                                                }
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${targetPlatforms.includes(item.id as TargetPlatform)
                                                    ? item.id === 'youtube' ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-accent-400/20 border-accent-400 text-accent-300'
                                                    : 'bg-bg-surface border-slate-700 text-slate-400 hover:border-slate-600'
                                                }`}
                                        >
                                            {targetPlatforms.includes(item.id as TargetPlatform) ? '✓ ' : ''}{item.label}
                                        </button>
                                    ))}
                                </div>
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
                                                className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 px-2.5 py-0.5 text-xs text-cyan-300"
                                            >
                                                #{tag}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newArr = hashtagArr.filter((_, idx) => idx !== i);
                                                        setValue('hashtags', newArr.join(', '));
                                                    }}
                                                    className="hover:text-cyan-200"
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

                            <PeakTimePicker
                                currentValue={scheduledAtVal}
                                onSelectSlot={(slotTime) => {
                                    setValue('scheduledAt', slotTime, { shouldValidate: true });
                                    push({ title: '⚡ Peak Time Selected!', variant: 'success' });
                                }}
                            />

                            <p className="mt-2 text-xs text-slate-500">
                                {scheduledAtVal
                                    ? `Will schedule for ${new Date(scheduledAtVal).toLocaleString()}`
                                    : 'If you don\u2019t set a time, reel saves as draft unless you click Publish immediately.'}
                            </p>
                        </div>
                    </section>
                </form>

                <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-800 bg-[#0A1628]/95 backdrop-blur-md p-4 sm:px-6 lg:static lg:mt-8 lg:border-0 lg:bg-transparent lg:p-0">
                    <div className="mx-auto max-w-3xl flex items-center justify-end gap-3">
                        <button
                            onClick={handleSubmit(onSaveDraft)}
                            disabled={actionLoading}
                            className="btn-ghost"
                        >
                            <Save className="h-4 w-4" />
                            Save as Draft
                        </button>
                        <button
                            onClick={handleSubmit(onSubmit)}
                            disabled={actionLoading}
                            className="btn-primary"
                        >
                            {actionLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : scheduledAtVal ? (
                                <CalendarDays className="h-4 w-4" />
                            ) : (
                                <SendHorizontal className="h-4 w-4" />
                            )}
                            {scheduledAtVal ? 'Schedule' : 'Publish Now'}
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
