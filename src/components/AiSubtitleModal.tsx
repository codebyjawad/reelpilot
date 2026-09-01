import React, { useState } from 'react';
import { Type, Loader2, Sparkles, Check, Copy } from 'lucide-react';
import api from '@/lib/apiClient';

interface SubtitleCue {
    id: number;
    startTime: string;
    endTime: string;
    text: string;
    highlightWord: string;
}

interface AiSubtitleModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialText?: string;
    onApplySubtitles: (formattedSubtitlesText: string) => void;
}

export const AiSubtitleModal: React.FC<AiSubtitleModalProps> = ({
    isOpen,
    onClose,
    initialText = '',
    onApplySubtitles,
}) => {
    const [scriptText, setScriptText] = useState(initialText);
    const [loading, setLoading] = useState(false);
    const [cues, setCues] = useState<SubtitleCue[]>([]);
    const [preset, setPreset] = useState('hormozi-yellow-bold');
    const [copied, setCopied] = useState(false);

    if (!isOpen) return null;

    const handleGenerateSubtitles = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scriptText.trim()) return;

        setLoading(true);

        try {
            const res = await api.post('/reels/ai-subtitles', {
                text: scriptText.trim(),
            });

            const data = res?.data ?? res;
            if (data?.subtitles) {
                setCues(data.subtitles);
                if (data.stylePreset) setPreset(data.stylePreset);
            }
        } catch (err: any) {
            console.error('Subtitle generation error:', err);
        } finally {
            setLoading(false);
        }
    };

    const getFormattedOutput = () => {
        return cues
            .map((c) => `[${c.startTime} - ${c.endTime}] ${c.text.replace(new RegExp(c.highlightWord, 'gi'), `🔥${c.highlightWord.toUpperCase()}🔥`)}`)
            .join('\n');
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(getFormattedOutput());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleApply = () => {
        onApplySubtitles(getFormattedOutput());
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-5 text-slate-100 animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-rose-400 bg-clip-text text-transparent">
                        <Type className="h-5 w-5 text-yellow-400" />
                        AI Auto-Subtitle Generator
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl font-bold">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleGenerateSubtitles} className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Video Script / Voiceover Text
                        </label>
                        <textarea
                            rows={3}
                            value={scriptText}
                            onChange={(e) => setScriptText(e.target.value)}
                            placeholder="Enter script text or speech caption to auto-subtitle with kinetic word highlights..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !scriptText.trim()}
                        className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-yellow-500 via-amber-500 to-rose-500 hover:from-yellow-400 hover:to-rose-400 text-slate-950 shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing Speech & Captions...
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4" />
                                Generate Alex Hormozi-Style Captions
                            </>
                        )}
                    </button>
                </form>

                {cues.length > 0 && (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                Subtitle Preview ({cues.length} Cues)
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                {preset.toUpperCase()}
                            </span>
                        </div>

                        {/* Kinetic Subtitle Box Preview */}
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[120px] relative overflow-hidden">
                            <div className="absolute top-2 left-3 text-[10px] font-mono text-slate-500 uppercase">
                                9:16 Video Frame Center Overlay
                            </div>
                            <div className="text-center px-4 py-2 mt-3">
                                {cues.slice(0, 3).map((cue, idx) => (
                                    <div key={cue.id} className={`my-1 text-base font-extrabold uppercase tracking-tight ${idx === 0 ? 'text-yellow-400 text-lg scale-105 transition-transform' : 'text-slate-400 opacity-60'}`}>
                                        {cue.text.split(' ').map((w, wIdx) => {
                                            const isHighlight = w.toUpperCase().replace(/[^A-Z0-9]/g, '') === cue.highlightWord;
                                            return (
                                                <span
                                                    key={wIdx}
                                                    className={isHighlight ? 'bg-yellow-400 text-slate-950 px-1.5 py-0.5 rounded mx-0.5 shadow-md font-black animate-pulse' : 'mx-0.5'}
                                                >
                                                    {w}{' '}
                                                </span>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleCopy}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-2"
                            >
                                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                                {copied ? 'Copied Subtitles!' : 'Copy Timings'}
                            </button>
                            <button
                                onClick={handleApply}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg flex items-center justify-center gap-2"
                            >
                                <Check className="h-4 w-4" />
                                Apply to Reel Caption
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
