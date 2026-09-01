import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Split, Plus, Award, BarChart2, CheckCircle2, Eye, ThumbsUp, MessageSquare, Share2 } from 'lucide-react';
import { useToast } from '@/store/toastStore';
import { api } from '@/lib/apiClient';

export default function AbTesting() {
    const { push } = useToast();
    const [tests, setTests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [title, setTitle] = useState('Caption Hook Experiment #1');
    const [testType, setTestType] = useState<'caption' | 'hook' | 'posting_time' | 'thumbnail'>('caption');
    const [captionA, setCaptionA] = useState('🔥 3 Secret AI Websites You Didn\'t Know Existed!');
    const [captionB, setCaptionB] = useState('Stop wasting time! Use these 3 AI tools today 🚀');
    const [videoUrl, setVideoUrl] = useState('https://assets.mixkit.co/videos/preview/mixkit-vertical-view-of-a-neon-lit-city-street-41563-large.mp4');

    const fetchTests = async () => {
        try {
            const data = await api.get<any[]>('/ab-testing');
            setTests(data || []);
        } catch {
            setTests([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTests();
    }, []);

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/ab-testing', {
                title,
                testType,
                videoUrl,
                variantA: { caption: captionA, videoUrl },
                variantB: { caption: captionB, videoUrl },
                durationHours: 48,
                minViewsThreshold: 1000,
            });

            push({ title: 'A/B Test Campaign Launched!', variant: 'success' });
            fetchTests();
        } catch (err: any) {
            push({ title: err.message || 'Failed to create A/B test', variant: 'error' });
        }
    };

    const handleEvaluateWinner = async (id: number) => {
        try {
            const data = await api.post<any>(`/ab-testing/${id}/evaluate`);
            push({ title: `Winner declared: Variant ${data.winner}!`, variant: 'success' });
            fetchTests();
        } catch {
            push({ title: 'Evaluation failed', variant: 'error' });
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                        <Split className="h-7 w-7 text-indigo-400" />
                        A/B Testing Engine
                    </h1>
                    <p className="text-sm text-slate-400">
                        Schedule variant reels with different captions, hooks, or posting times to evaluate audience engagement and auto-select winning formulas.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Campaign Setup */}
                    <div className="lg:col-span-6 space-y-6">
                        <form onSubmit={handleCreateCampaign} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-xl">
                            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
                                <Plus className="h-4 w-4 text-accent-400" />
                                Launch New A/B Experiment
                            </h3>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Experiment Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Test Type</label>
                                <select
                                    value={testType}
                                    onChange={(e) => setTestType(e.target.value as any)}
                                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-400"
                                >
                                    <option value="caption">Caption & Hook Comparison</option>
                                    <option value="posting_time">Posting Time Comparison (9 AM vs 6 PM)</option>
                                    <option value="thumbnail">Thumbnail Cover Comparison</option>
                                </select>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Variant A (Control)</h4>
                                <textarea
                                    value={captionA}
                                    onChange={(e) => setCaptionA(e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                />
                            </div>

                            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Variant B (Challenger)</h4>
                                <textarea
                                    value={captionB}
                                    onChange={(e) => setCaptionB(e.target.value)}
                                    rows={2}
                                    className="w-full rounded-lg bg-slate-900 border border-slate-700 p-2.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:brightness-110 font-bold text-white text-sm flex items-center justify-center gap-2 transition-all shadow-glow"
                            >
                                <Split className="h-4 w-4" />
                                <span>Launch A/B Campaign</span>
                            </button>
                        </form>
                    </div>

                    {/* Right Active & Past Experiments */}
                    <div className="lg:col-span-6 space-y-6">
                        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                                <BarChart2 className="h-4 w-4 text-accent-400" />
                                Active Experiments & Winners ({tests.length})
                            </h3>

                            {loading ? (
                                <p className="text-xs text-slate-500">Loading experiments...</p>
                            ) : tests.length === 0 ? (
                                <p className="text-xs text-slate-500">No A/B experiments running yet.</p>
                            ) : (
                                <div className="space-y-4">
                                    {tests.map((t) => (
                                        <div key={t.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-slate-100 text-sm">{t.title}</h4>
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                                                    {t.status}
                                                </span>
                                            </div>

                                            {/* Metrics Comparison Grid */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${t.winnerVariant === 'A' ? 'border-emerald-400 bg-emerald-950/20' : 'border-slate-800 bg-slate-900/50'}`}>
                                                    <div className="flex items-center justify-between font-bold text-indigo-400">
                                                        <span>Variant A</span>
                                                        {t.winnerVariant === 'A' && <Award className="h-4 w-4 text-yellow-400" />}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                                                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {t.variantAMetrics?.views || 0}</span>
                                                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {t.variantAMetrics?.likes || 0}</span>
                                                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {t.variantAMetrics?.comments || 0}</span>
                                                        <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {t.variantAMetrics?.shares || 0}</span>
                                                    </div>
                                                </div>

                                                <div className={`p-3 rounded-lg border text-xs space-y-1.5 ${t.winnerVariant === 'B' ? 'border-emerald-400 bg-emerald-950/20' : 'border-slate-800 bg-slate-900/50'}`}>
                                                    <div className="flex items-center justify-between font-bold text-cyan-400">
                                                        <span>Variant B</span>
                                                        {t.winnerVariant === 'B' && <Award className="h-4 w-4 text-yellow-400" />}
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                                                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {t.variantBMetrics?.views || 0}</span>
                                                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {t.variantBMetrics?.likes || 0}</span>
                                                        <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {t.variantBMetrics?.comments || 0}</span>
                                                        <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> {t.variantBMetrics?.shares || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {t.status !== 'completed' && (
                                                <button
                                                    onClick={() => handleEvaluateWinner(t.id)}
                                                    className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5"
                                                >
                                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                                    <span>Evaluate Metrics & Declare Winner</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
