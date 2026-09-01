import React, { useState } from 'react';
import { Image, Loader2, Sparkles, Check } from 'lucide-react';
import api from '@/lib/apiClient';

interface ThumbnailConcept {
    headline: string;
    subhead: string;
    badgeText: string;
    bgGradient: string;
    textColor: string;
    accentColor: string;
}

interface AiThumbnailModalProps {
    isOpen: boolean;
    onClose: () => void;
    reelTitle: string;
    reelCaption?: string;
    onApplyThumbnail: (thumbnailUrlOrData: string) => void;
}

export const AiThumbnailModal: React.FC<AiThumbnailModalProps> = ({
    isOpen,
    onClose,
    reelTitle,
    reelCaption = '',
    onApplyThumbnail,
}) => {
    const [title, setTitle] = useState(reelTitle);
    const [loading, setLoading] = useState(false);
    const [concept, setConcept] = useState<ThumbnailConcept | null>(null);

    if (!isOpen) return null;

    const handleGenerateThumbnail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) return;

        setLoading(true);

        try {
            const res = await api.post('/reels/ai-thumbnail', {
                title: title.trim(),
                caption: reelCaption,
            });

            const data = res?.data ?? res;
            if (data) {
                setConcept(data);
            }
        } catch (err: any) {
            console.error('Thumbnail generation error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (concept) {
            onApplyThumbnail(`AI_COVER:${concept.headline}|${concept.bgGradient}`);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-5 text-slate-100 animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-rose-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
                        <Image className="h-5 w-5 text-rose-400" />
                        AI 9:16 Vertical Thumbnail Builder
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl font-bold">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleGenerateThumbnail} className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Thumbnail Headline / Hook
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter main topic or reel title..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-rose-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !title.trim()}
                        className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-rose-500 via-pink-500 to-indigo-500 hover:from-rose-400 hover:to-indigo-400 text-white shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Generating High-CTR Cover Concept...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Generate Vertical Cover Concept
                            </>
                        )}
                    </button>
                </form>

                {concept && (
                    <div className="space-y-4 pt-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 block">
                            9:16 Vertical Cover Layout Preview
                        </span>

                        {/* 9:16 Aspect Ratio Canvas Card */}
                        <div className="flex justify-center">
                            <div
                                className={`w-48 h-80 rounded-2xl bg-gradient-to-b ${concept.bgGradient} border-2 border-slate-700/60 p-4 shadow-2xl flex flex-col justify-between items-center text-center relative overflow-hidden transform hover:scale-105 transition-all`}
                            >
                                <div className="mt-2">
                                    <span
                                        className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 border border-white/20 shadow"
                                        style={{ color: concept.accentColor }}
                                    >
                                        {concept.badgeText}
                                    </span>
                                </div>

                                <div className="space-y-2 my-auto">
                                    <h4
                                        className="text-lg font-black uppercase leading-tight drop-shadow-md tracking-tight"
                                        style={{ color: concept.textColor }}
                                    >
                                        {concept.headline}
                                    </h4>
                                    <p
                                        className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-black/50 border border-white/10"
                                        style={{ color: concept.accentColor }}
                                    >
                                        {concept.subhead}
                                    </p>
                                </div>

                                <div className="mb-2 text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                                    ReelPilot Cover
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleApply}
                            className="w-full py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Check className="h-4 w-4" />
                            Apply Cover Concept to Reel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
