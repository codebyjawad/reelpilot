import React, { useState } from 'react';
import { RotateCcw, Sparkles, Loader2, Check, CalendarDays, Hash } from 'lucide-react';
import { recyclingApi, type RecyclableReel, type TargetPlatform } from '@/lib/apiClient';
import { useToast } from '@/store/toastStore';

interface RecycleModalProps {
    isOpen: boolean;
    onClose: () => void;
    reel: RecyclableReel | null;
    onRecycled?: () => void;
}

export const RecycleModal: React.FC<RecycleModalProps> = ({
    isOpen,
    onClose,
    reel,
    onRecycled,
}) => {
    const { push } = useToast();
    const [title, setTitle] = useState(reel?.title || '');
    const [spinCaption, setSpinCaption] = useState(true);
    const [scheduledAt, setScheduledAt] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [targetPlatforms, setTargetPlatforms] = useState<TargetPlatform[]>(['facebook', 'instagram']);

    React.useEffect(() => {
        if (reel) {
            setTitle(reel.title);
        }
    }, [reel]);

    if (!isOpen || !reel) return null;

    const handleRecycle = async (e: React.FormEvent) => {
        e.preventDefault();

        setSubmitting(true);
        try {
            await recyclingApi.recycleReel(reel.id, {
                customTitle: title.trim() || undefined,
                scheduledAt: scheduledAt || undefined,
                targetPlatforms,
                spinCaptionWithAi: spinCaption,
            });

            push({
                title: '♻️ Reel Recycled Successfully!',
                description: `Created new scheduled version of "${title}" with AI caption spin.`,
                variant: 'success',
            });

            if (onRecycled) onRecycled();
            onClose();
        } catch (err: any) {
            push({
                title: 'Recycling failed',
                description: err?.message || 'Please try again',
                variant: 'error',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 text-slate-100 animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                        <RotateCcw className="h-5 w-5 text-emerald-400" />
                        Recycle Evergreen Favorite
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl font-bold">
                        ✕
                    </button>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 truncate max-w-[260px]">{reel.title}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            {reel.daysAgo} Days Old
                        </span>
                    </div>
                    <p className="text-slate-400 line-clamp-2 mt-1">{reel.caption || 'No caption'}</p>
                </div>

                <form onSubmit={handleRecycle} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Recycled Reel Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Title..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                        />
                    </div>

                    <div className="flex items-center gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                        <input
                            type="checkbox"
                            id="spinCaptionCheck"
                            checked={spinCaption}
                            onChange={(e) => setSpinCaption(e.target.checked)}
                            className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                        />
                        <label htmlFor="spinCaptionCheck" className="text-xs text-slate-200 cursor-pointer">
                            <span className="font-bold text-amber-400 flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5" />
                                Auto-Spin Caption & Hooks with AI
                            </span>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Generates a new viral hook caption and hashtags to pass algorithm duplicate filters.
                            </p>
                        </label>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Schedule Date & Time (Leave blank for Peak Time slot)
                        </label>
                        <div className="relative">
                            <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />
                            <input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 pl-9 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Target Platforms
                        </label>
                        <div className="flex items-center gap-2 pt-1">
                            {[
                                { id: 'facebook', label: 'Facebook' },
                                { id: 'instagram', label: 'Instagram' },
                                { id: 'tiktok', label: 'TikTok' },
                                { id: 'youtube', label: 'YouTube Shorts' },
                            ].map((item) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    onClick={() => {
                                        if (targetPlatforms.includes(item.id as TargetPlatform)) {
                                            if (targetPlatforms.length > 1) {
                                                setTargetPlatforms(targetPlatforms.filter((p) => p !== item.id));
                                            }
                                        } else {
                                            setTargetPlatforms([...targetPlatforms, item.id as TargetPlatform]);
                                        }
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                                        targetPlatforms.includes(item.id as TargetPlatform)
                                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                            : 'bg-slate-800 border-slate-700 text-slate-400'
                                    }`}
                                >
                                    {targetPlatforms.includes(item.id as TargetPlatform) ? '✓ ' : ''}{item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Spinning AI Caption & Scheduling...
                            </>
                        ) : (
                            <>
                                <RotateCcw className="h-4 w-4" />
                                Recycle & Re-Queue Reel
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
