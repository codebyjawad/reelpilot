import React, { useEffect, useState } from 'react';
import { MessageSquare, Sparkles, Send, Bot, Loader2, CheckCircle, ThumbsUp, RefreshCw } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { reelsApi, commentsApi, type Reel, type ReelComment } from '@/lib/apiClient';
import { useToast } from '@/store/toastStore';

export default function Comments() {
    const { push } = useToast();
    const [reels, setReels] = useState<Reel[]>([]);
    const [selectedReel, setSelectedReel] = useState<Reel | null>(null);
    const [comments, setComments] = useState<ReelComment[]>([]);
    const [loadingReels, setLoadingReels] = useState(true);
    const [loadingComments, setLoadingComments] = useState(false);

    // AI Reply Generator state per comment
    const [generatingId, setGeneratingId] = useState<string | null>(null);
    const [postingId, setPostingId] = useState<string | null>(null);
    const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
    const [selectedTone, setSelectedTone] = useState('Viral Creator');

    // Auto Bot state
    const [runningBot, setRunningBot] = useState(false);

    const loadReels = async () => {
        try {
            const res = await reelsApi.list({ status: 'published' });
            const list = res.reels || [];
            setReels(list);
            if (list.length > 0) {
                setSelectedReel(list[0]);
            }
        } catch (_err) {
            push({ title: 'Failed to load published Reels', variant: 'error' });
        } finally {
            setLoadingReels(false);
        }
    };

    const loadComments = async (reel: Reel) => {
        setLoadingComments(true);
        try {
            const data = await commentsApi.getReelComments(reel.id);
            setComments(data.comments || []);
        } catch (_err) {
            push({ title: 'Failed to load comments for this Reel', variant: 'error' });
        } finally {
            setLoadingComments(false);
        }
    };

    useEffect(() => {
        loadReels();
    }, []);

    useEffect(() => {
        if (selectedReel) {
            loadComments(selectedReel);
        }
    }, [selectedReel]);

    const handleGenerateAiReply = async (comment: ReelComment) => {
        if (!selectedReel) return;

        setGeneratingId(comment.id);
        try {
            const savedGeminiKey = localStorage.getItem('rp_gemini_api_key') || undefined;
            const res = await commentsApi.generateAiReply({
                commentMessage: comment.message,
                reelTitle: selectedReel.title,
                tone: selectedTone,
                geminiApiKey: savedGeminiKey,
            });
            setReplyInputs((prev) => ({ ...prev, [comment.id]: res.reply }));
            push({ title: '✨ AI Reply Generated!', variant: 'success' });
        } catch (err: any) {
            push({ title: 'AI Reply Generation Failed', description: err.message, variant: 'error' });
        } finally {
            setGeneratingId(null);
        }
    };

    const handlePostReply = async (comment: ReelComment) => {
        const replyText = replyInputs[comment.id];
        if (!replyText || !replyText.trim() || !selectedReel) return;

        setPostingId(comment.id);
        try {
            await commentsApi.postReply({
                commentId: comment.id,
                replyText: replyText.trim(),
                pageId: selectedReel.pageId,
            });
            push({ title: 'Reply posted to Facebook!', variant: 'success' });

            // Mark comment as replied
            setComments((prev) =>
                prev.map((c) => (c.id === comment.id ? { ...c, hasReplied: true } : c))
            );
            setReplyInputs((prev) => ({ ...prev, [comment.id]: '' }));
        } catch (err: any) {
            push({ title: 'Post Reply Failed', description: err.message, variant: 'error' });
        } finally {
            setPostingId(null);
        }
    };

    const handleRunAutoBot = async () => {
        if (!selectedReel) return;

        setRunningBot(true);
        try {
            const res = await commentsApi.runAutoBot(selectedReel.id, selectedTone);
            push({
                title: `🤖 Auto-Bot finished!`,
                description: `Replied to ${res.repliedCount} new comment(s).`,
                variant: 'success',
            });
            loadComments(selectedReel);
        } catch (err: any) {
            push({ title: 'Auto-Bot Failed', description: err.message, variant: 'error' });
        } finally {
            setRunningBot(false);
        }
    };

    return (
        <AppLayout>
            <div className="animate-fade-in space-y-6 pb-12">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="section-title flex items-center gap-2">
                            <MessageSquare className="h-6 w-6 text-indigo-400" />
                            AI Comment Auto-Responder
                        </h1>
                        <p className="section-subtitle">
                            Auto-monitor viewer comments on published Reels and post AI-powered viral engagement replies
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <select
                            value={selectedTone}
                            onChange={(e) => setSelectedTone(e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold px-3 py-2 text-slate-200"
                        >
                            <option value="Viral Creator">Tone: Viral Creator 🔥</option>
                            <option value="Helpful Assistant">Tone: Helpful & Warm 😊</option>
                            <option value="Hyped Fan">Tone: Hype & Energetic 🎉</option>
                            <option value="Witty & Funny">Tone: Witty & Humorous 😂</option>
                        </select>

                        {selectedReel && (
                            <button
                                onClick={handleRunAutoBot}
                                disabled={runningBot}
                                className="btn-primary flex items-center gap-2 text-xs !py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 font-bold"
                            >
                                {runningBot ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Auto-Bot Running...
                                    </>
                                ) : (
                                    <>
                                        <Bot className="h-4 w-4" />
                                        ⚡ Run Auto-Bot for Reel
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {loadingReels ? (
                    <div className="card p-6 text-center text-slate-400">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                        Loading published Reels...
                    </div>
                ) : reels.length === 0 ? (
                    <div className="card p-12 text-center space-y-3 border-dashed border-slate-700 max-w-md mx-auto">
                        <MessageSquare className="h-10 w-10 text-slate-500 mx-auto" />
                        <h3 className="font-bold text-slate-200">No Published Reels Found</h3>
                        <p className="text-xs text-slate-400">
                            Publish your first Reel to start receiving comments and automated AI replies!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Reel Selector Sidebar */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                                Select Published Reel ({reels.length})
                            </h3>
                            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                                {reels.map((reel) => {
                                    const isSelected = selectedReel?.id === reel.id;
                                    return (
                                        <button
                                            key={reel.id}
                                            onClick={() => setSelectedReel(reel)}
                                            className={`w-full p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                                                isSelected
                                                    ? 'bg-indigo-500/10 border-indigo-500 text-indigo-200'
                                                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0 text-slate-400">
                                                #{reel.id}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-xs truncate text-slate-100">{reel.title}</h4>
                                                <p className="text-[10px] text-slate-400 mt-0.5">
                                                    Page ID: {reel.pageId}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Comments Feed Area */}
                        <div className="lg:col-span-2 space-y-4">
                            {selectedReel && (
                                <div className="card p-5 space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                                                Reel Title
                                            </span>
                                            <h2 className="font-bold text-slate-100 text-base">{selectedReel.title}</h2>
                                        </div>
                                        <button
                                            onClick={() => loadComments(selectedReel)}
                                            disabled={loadingComments}
                                            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 p-1.5 rounded-lg bg-slate-800 border border-slate-700"
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 ${loadingComments ? 'animate-spin' : ''}`} />
                                            Refresh
                                        </button>
                                    </div>

                                    {loadingComments ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                                            Fetching live Meta Graph API comments...
                                        </div>
                                    ) : comments.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400 space-y-2">
                                            <MessageSquare className="h-8 w-8 text-slate-500 mx-auto" />
                                            <p className="text-sm font-semibold">No comments on this Reel yet</p>
                                            <p className="text-xs text-slate-500">
                                                New viewer comments will appear here automatically.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {comments.map((c) => (
                                                <div
                                                    key={c.id}
                                                    className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center">
                                                                {c.fromName.charAt(0)}
                                                            </div>
                                                            <span className="font-bold text-xs text-slate-200">{c.fromName}</span>
                                                            <span className="text-[10px] text-slate-500">
                                                                {new Date(c.createdTime).toLocaleString()}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2">
                                                            {c.likeCount ? (
                                                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                    <ThumbsUp className="h-3 w-3 text-amber-400" />
                                                                    {c.likeCount}
                                                                </span>
                                                            ) : null}
                                                            {c.hasReplied ? (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                                                    <CheckCircle className="h-3 w-3" />
                                                                    Replied
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                                    Pending Reply
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <p className="text-xs text-slate-300 font-medium pl-9 leading-relaxed">
                                                        "{c.message}"
                                                    </p>

                                                    {/* Reply Box */}
                                                    <div className="pl-9 space-y-2 pt-1">
                                                        <div className="flex gap-2">
                                                            <input
                                                                type="text"
                                                                value={replyInputs[c.id] || ''}
                                                                onChange={(e) =>
                                                                    setReplyInputs((prev) => ({ ...prev, [c.id]: e.target.value }))
                                                                }
                                                                placeholder="Type a reply or click ✨ AI Reply..."
                                                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                                                            />

                                                            <button
                                                                type="button"
                                                                disabled={generatingId === c.id}
                                                                onClick={() => handleGenerateAiReply(c)}
                                                                className="px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-300 transition-all flex items-center gap-1.5 shrink-0"
                                                            >
                                                                {generatingId === c.id ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                                                                )}
                                                                <span>AI Reply</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                disabled={postingId === c.id || !replyInputs[c.id]?.trim()}
                                                                onClick={() => handlePostReply(c)}
                                                                className="btn-primary text-xs !py-1.5 !px-3 flex items-center gap-1 shrink-0"
                                                            >
                                                                {postingId === c.id ? (
                                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                                ) : (
                                                                    <Send className="h-3.5 w-3.5" />
                                                                )}
                                                                <span>Post</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
