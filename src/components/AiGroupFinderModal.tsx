import React, { useState } from 'react';
import { Flame, Search, Sparkles, Loader2, ExternalLink, Copy, Check, ShieldAlert } from 'lucide-react';
import { growthApi, type GroupDiscoveryResponse } from '@/lib/apiClient';
import { useToast } from '@/store/toastStore';

interface AiGroupFinderModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialTopic?: string;
}

export const AiGroupFinderModal: React.FC<AiGroupFinderModalProps> = ({
    isOpen,
    onClose,
    initialTopic = '',
}) => {
    const { push } = useToast();
    const [topic, setTopic] = useState(initialTopic);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<GroupDiscoveryResponse | null>(null);

    // Copy Hook state
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [hookText, setHookText] = useState<string | null>(null);
    const [loadingHook, setLoadingHook] = useState(false);

    if (!isOpen) return null;

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setLoading(true);
        try {
            const savedGeminiKey = localStorage.getItem('rp_gemini_api_key') || undefined;
            const res = await growthApi.findViralGroups(topic.trim(), savedGeminiKey);
            setData(res);
        } catch (err: any) {
            push({ title: 'AI Group Finder failed', description: err.message, variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateHook = async (groupName: string) => {
        setLoadingHook(true);
        try {
            const savedGeminiKey = localStorage.getItem('rp_gemini_api_key') || undefined;
            const res = await growthApi.generateViralHook(topic.trim(), groupName, savedGeminiKey);
            setHookText(`${res.hookText}\n\n${res.callToAction}`);
        } catch (_err) {
            push({ title: 'Failed to generate viral hook', variant: 'error' });
        } finally {
            setLoadingHook(false);
        }
    };

    const handleCopyHook = (idx: number, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        push({ title: '📋 Group Post Hook copied to clipboard!', variant: 'success' });
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-5 text-slate-100 animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400 bg-clip-text text-transparent">
                        <Flame className="h-6 w-6 text-amber-400" />
                        AI Viral Group Finder & Traffic Accelerator
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl font-bold">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSearch} className="space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Enter Reel Topic or Niche Keyword
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. AI Robot Dog, Crypto Trading, Cooking Pasta..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                            type="submit"
                            disabled={loading || !topic.trim()}
                            className="px-4 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            Find High-Traffic Groups
                        </button>
                    </div>
                </form>

                {data && (
                    <div className="space-y-4 pt-2">
                        {data.viralStrategyTip && (
                            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
                                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-bold">AI Growth Strategy:</span> {data.viralStrategyTip}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                                Recommended High-Engagement Group Niches
                            </h4>
                            <div className="space-y-3">
                                {data.recommendations.map((rec, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/80 space-y-3"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-100 text-sm">{rec.category}</span>
                                                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                    Target: {rec.targetDemographic}
                                                </span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded text-xs font-extrabold bg-amber-400/20 text-amber-300 flex items-center gap-1">
                                                <Flame className="h-3 w-3" />
                                                {rec.viralMatchScore}% Match
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-300">{rec.rationale}</p>

                                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/50">
                                            <a
                                                href={`https://www.facebook.com/search/groups/?q=${encodeURIComponent(rec.searchKeyword)}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                            >
                                                Search "{rec.searchKeyword}" Groups on Facebook <ExternalLink className="h-3 w-3" />
                                            </a>

                                            <button
                                                type="button"
                                                disabled={loadingHook}
                                                onClick={() => handleGenerateHook(rec.suggestedGroupNames[0] || rec.category)}
                                                className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs font-semibold text-slate-200 flex items-center gap-1"
                                            >
                                                <Sparkles className="h-3 w-3 text-amber-400" />
                                                Generate Anti-Spam Hook
                                            </button>
                                        </div>

                                        {rec.suggestedGroupNames?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {rec.suggestedGroupNames.map((gName, gIdx) => (
                                                    <span key={gIdx} className="text-[11px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                                        👥 {gName}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {hookText && (
                            <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        Generated High-Traffic Group Hook Post
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopyHook(99, hookText)}
                                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                    >
                                        {copiedIndex === 99 ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                        Copy Post Text
                                    </button>
                                </div>
                                <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-mono bg-slate-900 p-3 rounded-lg border border-slate-800">
                                    {hookText}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
