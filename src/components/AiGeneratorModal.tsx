import React, { useState } from 'react';
import { Sparkles, Loader2, Check } from 'lucide-react';
import api from '@/lib/apiClient';

interface AiGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTopic?: string;
    onApply: (data: { title: string; caption: string; hashtags: string[] }) => void;
}

export const AiGeneratorModal: React.FC<AiGeneratorModalProps> = ({
    isOpen,
    onClose,
    initialTopic = '',
    onApply,
}) => {
    const [topic, setTopic] = useState(initialTopic);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ title: string; caption: string; hashtags: string[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const savedGeminiKey = localStorage.getItem('rp_gemini_api_key') || undefined;
            const savedOpenAiKey = localStorage.getItem('rp_openai_api_key') || undefined;
            const res = await api.post('/reels/ai-generate', {
                topic: topic.trim(),
                geminiApiKey: savedGeminiKey,
                openAiKey: savedOpenAiKey,
            });

            const content = res?.data ?? res;
            if (content && typeof content === 'object') {
                setResult({
                    title: content.title || topic.trim(),
                    caption: content.caption || '',
                    hashtags: Array.isArray(content.hashtags) ? content.hashtags : ['viral', 'reels', 'trending'],
                });
            } else {
                setError('Received empty AI response. Please try again.');
            }
        } catch (err: any) {
            setError(err?.response?.data?.error || err?.message || 'AI Generation failed. Please check your API key.');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = () => {
        if (result) {
            onApply(result);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 text-slate-100 animate-fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400 bg-clip-text text-transparent">
                        <Sparkles className="h-5 w-5 text-amber-400" />
                        Magic AI Content Generator
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-200 text-xl font-bold"
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleGenerate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Topic, Keyword, or Video Description
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g. AI Robot Dog test, Cooking pasta tip..."
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                            />
                            <button
                                type="submit"
                                disabled={loading || !topic.trim()}
                                className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        Generate
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>

                {result && (
                    <div className="space-y-4 bg-slate-800/40 border border-slate-800 p-4 rounded-xl">
                        <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                                AI Title
                            </span>
                            <p className="text-sm font-bold text-slate-100 mt-0.5">{result.title}</p>
                        </div>

                        <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                                AI Hook Caption
                            </span>
                            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{result.caption}</p>
                        </div>

                        <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
                                Trending Hashtags
                            </span>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                                {result.hashtags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                    >
                                        #{tag.replace(/^#/, '')}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={handleApply}
                            className="w-full mt-2 py-2.5 rounded-lg text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Check className="h-4 w-4" />
                            Apply AI Content to Reel
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
