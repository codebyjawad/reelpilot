import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { MessageSquare, Plus, Trash2, Bot, Sparkles, Send, Tag, Smile, AlertCircle } from 'lucide-react';
import { useToast } from '@/store/toastStore';
import { api } from '@/lib/apiClient';

export default function EngagementAutomation() {
    const { push } = useToast();
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState('Keyword DM Lead Magnet');
    const [triggerType, setTriggerType] = useState<'keyword' | 'ai_all' | 'sentiment_negative' | 'sentiment_question'>('keyword');
    const [keywordsInput, setKeywordsInput] = useState('link, guide, info, send');
    const [replyType, setReplyType] = useState<'template' | 'ai_persona' | 'dm_link'>('dm_link');
    const [replyTemplate, setReplyTemplate] = useState('Hey {{name}}! Thanks for commenting!');
    const [aiPersonaTone, setAiPersonaTone] = useState<'friendly' | 'professional' | 'witty' | 'enthusiastic'>('friendly');
    const [ctaLink, setCtaLink] = useState('https://reelpilot.app/download');
    const [dmMessage, setDmMessage] = useState('Here is your private access link!');

    // Test box state
    const [testComment, setTestComment] = useState('Can you send me the link to this guide?');
    const [testResult, setTestResult] = useState<any>(null);
    const [testing, setTesting] = useState(false);

    const fetchRules = async () => {
        try {
            const data = await api.get<any[]>('/engagement');
            setRules(data || []);
        } catch {
            setRules([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const handleCreateRule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const keywords = keywordsInput.split(',').map((k) => k.trim()).filter(Boolean);
            await api.post('/engagement', {
                name,
                triggerType,
                keywords,
                replyType,
                replyTemplate,
                aiPersonaTone,
                ctaLink,
                dmMessage,
            });
            push({ title: 'Engagement rule created!', variant: 'success' });
            fetchRules();
        } catch (err: any) {
            push({ title: err.message || 'Failed to create rule', variant: 'error' });
        }
    };

    const handleDeleteRule = async (id: number) => {
        try {
            await api.delete(`/engagement/${id}`);
            push({ title: 'Rule deleted', variant: 'info' });
            fetchRules();
        } catch {
            push({ title: 'Delete failed', variant: 'error' });
        }
    };

    const handleTestComment = async () => {
        if (!testComment.trim()) return;
        setTesting(true);
        try {
            const data = await api.post('/engagement/evaluate', { commentText: testComment, authorName: 'Alex' });
            setTestResult(data);
        } catch (err: any) {
            push({ title: err.message || 'Test failed', variant: 'error' });
        } finally {
            setTesting(false);
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                        <Bot className="h-7 w-7 text-cyan-400" />
                        Community & Engagement Automation
                    </h1>
                    <p className="text-sm text-slate-400">
                        Set up automated comment replies, keyword DM triggers, and sentiment analysis for your reel audience.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Rule Creation Form */}
                    <div className="lg:col-span-7 space-y-6">
                        <form onSubmit={handleCreateRule} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-xl">
                            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
                                <Plus className="h-4 w-4 text-accent-400" />
                                Create Auto-Reply Rule
                            </h3>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Rule Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Trigger Type</label>
                                    <select
                                        value={triggerType}
                                        onChange={(e) => setTriggerType(e.target.value as any)}
                                        className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-400"
                                    >
                                        <option value="keyword">Keywords Match</option>
                                        <option value="ai_all">All Comments (AI Responder)</option>
                                        <option value="sentiment_question">Questions Only</option>
                                        <option value="sentiment_negative">Negative Comments</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Reply Strategy</label>
                                    <select
                                        value={replyType}
                                        onChange={(e) => setReplyType(e.target.value as any)}
                                        className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-400"
                                    >
                                        <option value="dm_link">Keyword DM Trigger + Auto Reply</option>
                                        <option value="ai_persona">AI Persona Generated Reply</option>
                                        <option value="template">Fixed Template Reply</option>
                                    </select>
                                </div>
                            </div>

                            {triggerType === 'keyword' && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                                        <Tag className="h-3.5 w-3.5 text-yellow-400" />
                                        Trigger Keywords (comma separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={keywordsInput}
                                        onChange={(e) => setKeywordsInput(e.target.value)}
                                        placeholder="e.g. link, guide, info, details"
                                        className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                                    />
                                </div>
                            )}

                            {replyType === 'ai_persona' && (
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
                                        <Smile className="h-3.5 w-3.5 text-cyan-400" />
                                        AI Persona Tone
                                    </label>
                                    <select
                                        value={aiPersonaTone}
                                        onChange={(e) => setAiPersonaTone(e.target.value as any)}
                                        className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent-400"
                                    >
                                        <option value="friendly">Friendly & Warm</option>
                                        <option value="professional">Professional & Authoritative</option>
                                        <option value="witty">Witty & Humorous</option>
                                        <option value="enthusiastic">Enthusiastic & High Energy</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">CTA Link (Optional)</label>
                                <input
                                    type="text"
                                    value={ctaLink}
                                    onChange={(e) => setCtaLink(e.target.value)}
                                    placeholder="https://yourbrand.com/link"
                                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:brightness-110 font-bold text-white text-sm flex items-center justify-center gap-2 transition-all shadow-glow"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Save Automation Rule</span>
                            </button>
                        </form>
                    </div>

                    {/* Right Live Testing & Rules */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Interactive Comment Sandbox */}
                        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-yellow-400" />
                                Comment Auto-Reply Sandbox
                            </h3>

                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={testComment}
                                    onChange={(e) => setTestComment(e.target.value)}
                                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                                />
                                <button
                                    type="button"
                                    onClick={handleTestComment}
                                    disabled={testing}
                                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center gap-2"
                                >
                                    <Send className="h-3.5 w-3.5" />
                                    <span>Test Auto-Reply Output</span>
                                </button>
                            </div>

                            {testResult && (
                                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 animate-fade-in">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-slate-400">Detected Sentiment:</span>
                                        <span className="font-bold text-cyan-400 uppercase">{testResult.sentiment}</span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-800">
                                        <p className="text-slate-400 text-[10px]">Generated Public Reply:</p>
                                        <p className="font-semibold text-slate-200 mt-0.5">{testResult.replyText}</p>
                                    </div>
                                    {testResult.dmTriggered && (
                                        <div className="p-2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] flex items-center gap-1.5">
                                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                            <span>DM Triggered: "{testResult.dmMessage}"</span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Active Rules List */}
                        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                            <h3 className="font-bold text-slate-200 text-sm">Active Rules ({rules.length})</h3>
                            {loading ? (
                                <p className="text-xs text-slate-500">Loading rules...</p>
                            ) : rules.length === 0 ? (
                                <p className="text-xs text-slate-500">No active rules configured yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {rules.map((r) => (
                                        <div key={r.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                                    <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                                                    {r.name}
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                    Replies triggered: <strong className="text-emerald-400">{r.repliesCount || 0}</strong>
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteRule(r.id)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
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
