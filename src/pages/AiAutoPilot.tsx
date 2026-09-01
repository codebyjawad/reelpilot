import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
    Sparkles, Play, Pause, Trash2, RefreshCw, ImageIcon,
    Clock, CheckCircle2, XCircle, Loader2, PlusCircle, Eye, Zap,
    Edit3, Save, X, Settings2, AlertTriangle, Users, Code, Wand2,
    Check, ChevronDown, ChevronUp, Copy, Sliders, MessageSquare, Terminal
} from 'lucide-react';
import api, { pagesApi, groupsApi, FacebookGroup } from '@/lib/apiClient';
import { usePagesStore } from '@/store/pagesStore';
import AppLayout from '@/components/AppLayout';
import ConfirmDialog from '@/components/ConfirmDialog';

interface AutoPilot {
    id: number;
    topic: string;
    pageId: number;
    brandName?: string | null;
    brandRole?: string | null;
    brandHandle?: string | null;
    directorPrompt?: string | null;
    targetGroupIds?: number[] | null;
    intervalMinutes: number;
    targetPlatforms: string[];
    isActive: boolean;
    lastRunAt: string | null;
    totalPosts: number;
    recentPostCount: number;
    createdAt: string;
}

const DEFAULT_MASTER_DIRECTOR_PROMPT = `# MASTER AI IMAGE & POST PROMPT
You are an elite AI Creative Director, Visual Strategist, and Copywriter.
Your task is to invent an original visual concept and generate:
1. A production-ready FLUX/SDXL image generation prompt for Gemini.
2. An engaging social media title/hook, caption, and hashtags for {platform}.

### CONTEXT & BRANDING:
- Topic / Focus: {topic}
- Creator Name: {brand_name}
- Creator Role: {brand_role}
- Watermark Signature: {brand_handle}

### INSTRUCTIONS:
- When topic is "auto" or broad, invent a fresh, viral, high-value visual concept.
- Image Prompt: Be descriptive about subjects, composition, camera angle, cinematic lighting, colors, and 8k detail.
- Title: Punchy, scroll-stopping headline with 1-2 emojis (under 70 chars).
- Caption: High-engagement 2-3 sentences with a question that drives comments.
- Hashtags: 5-8 relevant trending hashtags.

### OUTPUT FORMAT (Strictly JSON):
{
  "title": "Viral Hook / Headline with emojis",
  "concept": "1-2 sentence description of the creative concept",
  "imagePrompt": "Full detailed FLUX/SDXL prompt (lighting, composition, style, 8k resolution)",
  "caption": "Short engaging caption with a question to drive audience comments",
  "hashtags": ["AI", "Tech", "Innovation", "CodeByJawad"]
}`;

interface PostLog {
    id: number;
    autopilotId: number;
    imagePath: string | null;
    imagePrompt: string | null;
    title: string | null;
    caption: string | null;
    hashtags: string[] | null;
    facebookPostId: string | null;
    status: 'pending' | 'posted' | 'failed';
    errorMessage: string | null;
    createdAt: string;
}

const INTERVAL_OPTIONS = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: '4 hours', value: 240 },
    { label: '6 hours', value: 360 },
    { label: '12 hours', value: 720 },
    { label: '24 hours', value: 1440 },
];

export default function AiAutoPilot() {
    const [pilots, setPilots] = useState<AutoPilot[]>([]);
    const [pages, setPages] = useState<Array<{ id: number; name: string }>>([]);
    const [groups, setGroups] = useState<FacebookGroup[]>([]);
    const [logs, setLogs] = useState<PostLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [logsLoading, setLogsLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [runningId, setRunningId] = useState<number | null>(null);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [viewLogsForId, setViewLogsForId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Form state
    const [topic, setTopic] = useState('');
    const [pageId, setPageId] = useState<number>(0);
    const [targetGroupIds, setTargetGroupIds] = useState<number[]>([]);
    const [prompt, setPrompt] = useState<string>(DEFAULT_MASTER_DIRECTOR_PROMPT);
    const [brandName, setBrandName] = useState<string>('Muhammad Jawad Iqbal Khan');
    const [brandRole, setBrandRole] = useState<string>('Full-Stack Developer & Automation Engineer');
    const [brandHandle, setBrandHandle] = useState<string>('CodeByJawad');
    const [intervalMinutes, setIntervalMinutes] = useState(60);
    const [geminiApiKey, setGeminiApiKey] = useState<string>(() => localStorage.getItem('rp_gemini_api_key') || '');
    const [platforms, setPlatforms] = useState<string[]>(['facebook']);
    const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [showPromptDetails, setShowPromptDetails] = useState(true);

    // Preview / Test state
    const [testCount, setTestCount] = useState<number>(3);
    const [previewLoading, setPreviewLoading] = useState<boolean>(false);
    const [previewVariations, setPreviewVariations] = useState<any[]>([]);
    const [selectedVariationIdx, setSelectedVariationIdx] = useState<number>(0);
    const [publishingPreview, setPublishingPreview] = useState<boolean>(false);
    const [previewPublishMsg, setPreviewPublishMsg] = useState<string | null>(null);

    // Edit modal state
    const [editingPilot, setEditingPilot] = useState<AutoPilot | null>(null);
    const [editTopic, setEditTopic] = useState('');
    const [editPageId, setEditPageId] = useState<number>(0);
    const [editTargetGroupIds, setEditTargetGroupIds] = useState<number[]>([]);
    const [editPrompt, setEditPrompt] = useState('');
    const [editBrandName, setEditBrandName] = useState('');
    const [editBrandRole, setEditBrandRole] = useState('');
    const [editBrandHandle, setEditBrandHandle] = useState('');
    const [editIntervalMinutes, setEditIntervalMinutes] = useState(60);
    const [editPlatforms, setEditPlatforms] = useState<string[]>(['facebook']);
    const [editApiKey, setEditApiKey] = useState('');
    const [editSaving, setEditSaving] = useState(false);

    const storePages = usePagesStore((s) => s.pages);
    const fetchStorePages = usePagesStore((s) => s.fetchPages);

    const fetchData = async () => {
        try {
            const [pilotsRes, pagesRes, groupsRes] = await Promise.all([
                api.get('/ai-autopilot'),
                pagesApi.list().catch(() => ({ pages: [] })),
                groupsApi.list().catch(() => []),
            ]);
            const pilotList = (pilotsRes as any)?.pilots ?? (pilotsRes as any)?.data?.pilots ?? [];
            const rawPages: any[] = pagesRes?.pages ?? (pagesRes as any)?.data?.pages ?? [];
            setPilots(pilotList);
            setPages(rawPages);
            setGroups(Array.isArray(groupsRes) ? groupsRes : []);
            if (rawPages.length > 0) {
                setPageId((prev) => (prev && rawPages.some((p: any) => p.id === prev) ? prev : rawPages[0].id));
            }
        } catch (err) {
            console.error('Failed to load AI Auto-Pilot data', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStorePages().catch(() => {});
        fetchData();
    }, []);

    useEffect(() => {
        if (storePages && storePages.length > 0 && pages.length === 0) {
            setPages(storePages);
            setPageId((prev) => (prev ? prev : storePages[0].id));
        }
    }, [storePages, pages.length]);

    const fetchLogs = async (autopilotId?: number) => {
        setLogsLoading(true);
        try {
            const url = autopilotId ? `/ai-autopilot/${autopilotId}/logs` : '/ai-autopilot/logs';
            const res: any = await api.get(url);
            const list = res?.logs ?? res?.data?.logs ?? [];
            setLogs(list);
        } catch (err) {
            console.error('Failed to fetch post logs', err);
        } finally {
            setLogsLoading(false);
        }
    };

    const handleSuggestTopics = async (targetPageId?: number) => {
        const pId = targetPageId || pageId;
        const page = pages.find((p) => p.id === pId);
        setLoadingSuggestions(true);
        try {
            const res: any = await api.post('/ai-autopilot/suggest-topics', {
                pageName: page?.name || 'Technology, AI & Full-Stack Development',
                geminiApiKey: geminiApiKey || undefined,
            });
            const topics: string[] = res?.topics ?? res?.data?.topics ?? [];
            setSuggestedTopics(topics);
        } catch (err) {
            console.error('Failed to suggest topics', err);
        } finally {
            setLoadingSuggestions(false);
        }
    };

    const toggleGroupSelection = (gId: number) => {
        setTargetGroupIds((prev) =>
            prev.includes(gId) ? prev.filter((id) => id !== gId) : [...prev, gId]
        );
    };

    const toggleEditGroupSelection = (gId: number) => {
        setEditTargetGroupIds((prev) =>
            prev.includes(gId) ? prev.filter((id) => id !== gId) : [...prev, gId]
        );
    };

    const openEditModal = (pilot: AutoPilot) => {
        setEditingPilot(pilot);
        setEditTopic(pilot.topic);
        setEditPageId(pilot.pageId);
        setEditTargetGroupIds(Array.isArray(pilot.targetGroupIds) ? pilot.targetGroupIds : []);
        setEditBrandName(pilot.brandName || 'Muhammad Jawad Iqbal Khan');
        setEditBrandRole(pilot.brandRole || 'Full-Stack Developer & Automation Engineer');
        setEditBrandHandle(pilot.brandHandle || 'CodeByJawad');
        setEditPrompt(pilot.directorPrompt || DEFAULT_MASTER_DIRECTOR_PROMPT);
        setEditIntervalMinutes(pilot.intervalMinutes);
        setEditPlatforms(pilot.targetPlatforms || ['facebook']);
        setEditApiKey('');
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPilot) return;
        if (!editTopic.trim()) { setError('Topic cannot be empty'); return; }
        setEditSaving(true);
        try {
            await api.put(`/ai-autopilot/${editingPilot.id}`, {
                topic: editTopic.trim(),
                pageId: editPageId,
                targetGroupIds: editTargetGroupIds,
                brandName: editBrandName.trim() || undefined,
                brandRole: editBrandRole.trim() || undefined,
                brandHandle: editBrandHandle.trim() || undefined,
                directorPrompt: editPrompt.trim() || DEFAULT_MASTER_DIRECTOR_PROMPT,
                intervalMinutes: editIntervalMinutes,
                targetPlatforms: editPlatforms,
                geminiApiKey: editApiKey.trim() || undefined,
            });
            showSuccess('✓ Auto-Pilot updated successfully!');
            setEditingPilot(null);
            await fetchData();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to update Auto-Pilot');
        } finally {
            setEditSaving(false);
        }
    };

    const showSuccess = (msg: string) => {
        setSuccessMsg(msg);
        setTimeout(() => setSuccessMsg(null), 4000);
    };

    const togglePlatform = (p: string) => {
        if (platforms.includes(p)) {
            if (platforms.length > 1) setPlatforms(platforms.filter((x) => x !== p));
        } else {
            setPlatforms([...platforms, p]);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!topic.trim()) { setError('Please enter a topic or select an AI suggestion.'); return; }
        if (!pageId) { setError('Please select a Facebook Page.'); return; }

        setSubmitting(true);
        try {
            await api.post('/ai-autopilot', {
                pageId,
                targetGroupIds,
                topic: topic.trim(),
                brandName: brandName.trim() || undefined,
                brandRole: brandRole.trim() || undefined,
                brandHandle: brandHandle.trim() || undefined,
                directorPrompt: prompt.trim() || DEFAULT_MASTER_DIRECTOR_PROMPT,
                intervalMinutes,
                targetPlatforms: platforms,
                geminiApiKey: geminiApiKey.trim() || undefined,
            });
            setTopic('');
            showSuccess('🚀 Auto-Pilot launched! Auto-posting to Page & Groups.');
            await fetchData();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to create Auto-Pilot');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePreviewGenerate = async (overrideCount?: number) => {
        setError(null);
        setPreviewPublishMsg(null);
        setPreviewLoading(true);
        const count = overrideCount || testCount;
        try {
            const res: any = await api.post('/ai-autopilot/preview-generate', {
                topic: topic.trim() || 'AI & Full-Stack Automation',
                brandName: brandName.trim() || 'Muhammad Jawad Iqbal Khan',
                brandRole: brandRole.trim() || 'Full-Stack Developer & Automation Engineer',
                brandHandle: brandHandle.trim() || 'CodeByJawad',
                directorPrompt: prompt.trim() || DEFAULT_MASTER_DIRECTOR_PROMPT,
                geminiApiKey: geminiApiKey.trim() || undefined,
                count,
            });
            const data = res?.data ?? res;
            const vars = Array.isArray(data?.variations) && data.variations.length > 0
                ? data.variations
                : [data];
            setPreviewVariations(vars);
            setSelectedVariationIdx(0);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to generate test variations');
        } finally {
            setPreviewLoading(false);
        }
    };

    const handlePublishPreview = async (variation: any) => {
        if (!pageId) {
            setError('Please select a Facebook Page first.');
            return;
        }
        setPublishingPreview(true);
        setPreviewPublishMsg(null);
        try {
            const res: any = await api.post('/ai-autopilot/publish-preview', {
                pageId,
                targetGroupIds,
                imagePath: variation.imagePath,
                imageUrl: variation.imageUrl,
                title: variation.title,
                caption: variation.caption,
            });
            setPreviewPublishMsg(`✓ Successfully published directly to Facebook Page (Post ID: ${res?.data?.pagePostId || 'OK'})!`);
            showSuccess('✓ Instant Post Published to Facebook Page & Groups!');
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to publish post');
        } finally {
            setPublishingPreview(false);
        }
    };

    const handleUseConcept = (variation: any) => {
        if (variation.title) {
            setTopic(variation.title.replace(/^[^\w]+/, '').trim());
        }
        showSuccess(`✓ Applied "${variation.title}" to Campaign Topic!`);
        setPreviewVariations([]);
    };

    const handleToggle = async (id: number, currentState: boolean) => {
        setTogglingId(id);
        try {
            await api.patch(`/ai-autopilot/${id}`, { isActive: !currentState });
            setPilots((prev) =>
                prev.map((p) => (p.id === id ? { ...p, isActive: !currentState } : p))
            );
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to toggle Auto-Pilot');
        } finally {
            setTogglingId(null);
        }
    };

    const confirmDelete = async () => {
        if (confirmDeleteId === null) return;
        const id = confirmDeleteId;
        setConfirmDeleteId(null);
        setDeletingId(id);
        try {
            await api.delete(`/ai-autopilot/${id}`);
            setPilots((prev) => prev.filter((p) => p.id !== id));
            if (viewLogsForId === id) setViewLogsForId(null);
            showSuccess('Auto-Pilot deleted');
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to delete Auto-Pilot');
        } finally {
            setDeletingId(null);
        }
    };

    const handleRunNow = async (id: number) => {
        setRunningId(id);
        try {
            await api.post(`/ai-autopilot/${id}/run`);
            showSuccess('⚡ Post generation triggered! Watch your Facebook Page & Groups.');
            setTimeout(() => {
                fetchLogs(id);
                fetchData();
            }, 3000);
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to trigger run');
        } finally {
            setRunningId(null);
        }
    };

    const handleViewLogs = (id: number) => {
        if (viewLogsForId === id) {
            setViewLogsForId(null);
        } else {
            setViewLogsForId(id);
            fetchLogs(id);
        }
    };

    const insertToken = (token: string, isEdit: boolean = false) => {
        if (isEdit) {
            setEditPrompt((prev) => prev + token);
        } else {
            setPrompt((prev) => prev + token);
        }
    };

    const formatInterval = (mins: number) => {
        if (mins < 60) return `${mins}m`;
        const hrs = mins / 60;
        return hrs === 1 ? '1 hr' : `${hrs} hrs`;
    };

    const getImageSrc = (log: PostLog) => {
        if (!log.imagePath) return null;
        const filename = log.imagePath.split(/[\\/]/).pop();
        return `/uploads/ai-images/${filename}`;
    };

    return (
        <AppLayout>
            <div className="space-y-6 max-w-5xl mx-auto pb-16">

                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
                            <Sparkles className="h-6 w-6 text-violet-400" />
                            AI Image Pilot
                        </h1>
                        <p className="text-slate-400 text-sm mt-0.5">
                            Send master prompts to Gemini to generate AI images, captions, and hashtags, auto-publishing to Facebook Pages &amp; Groups.
                        </p>
                    </div>
                </div>

                {/* ── Alerts ──────────────────────────────────────────────────── */}
                {successMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" /> {successMsg}
                    </div>
                )}
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                        <XCircle className="h-4 w-4 shrink-0" /> {error}
                    </div>
                )}
                {!loading && pages.length === 0 && (
                    <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                            <div>
                                <p className="text-sm font-semibold text-amber-300">No Facebook Pages connected</p>
                                <p className="text-xs text-slate-400">Connect a page to enable automated publishing.</p>
                            </div>
                        </div>
                        <Link to="/pages" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors">
                            Connect Page →
                        </Link>
                    </div>
                )}

                {/* ── Creation Form ────────────────────────────────────────────── */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-fuchsia-400" />
                        <h2 className="text-sm font-bold text-slate-200">Configure AI Image Campaign</h2>
                        <span className="ml-auto text-xs px-2.5 py-0.5 rounded-full bg-violet-600/20 border border-violet-500/30 text-violet-300 font-medium">Prompt + Auto-Publish</span>
                    </div>

                    <form onSubmit={handleCreate} className="p-5 space-y-5">

                        {/* 1. Topic / Niche */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Topic / Niche
                                </label>
                                <button
                                    type="button"
                                    onClick={() => handleSuggestTopics()}
                                    disabled={loadingSuggestions || pages.length === 0}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 border border-violet-500/30 transition-all disabled:opacity-50"
                                >
                                    {loadingSuggestions ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                    AI Suggest Topics
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder='e.g. "AI & Automation in Modern Software Architecture" or leave blank for Auto'
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500 placeholder:text-slate-600"
                            />
                            {suggestedTopics.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {suggestedTopics.map((s, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setTopic(s)}
                                            className={`px-2.5 py-1 rounded-md text-xs border transition-all ${
                                                topic === s ? 'bg-violet-600/30 border-violet-400 text-white font-medium' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-violet-500/50'
                                            }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                    <button
                                        type="button"
                                        onClick={() => setTopic(`Auto (AI generates fresh viral post for ${pages.find((p) => p.id === pageId)?.name || 'page'})`)}
                                        className="px-2.5 py-1 rounded-md text-xs border border-dashed border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300 hover:bg-fuchsia-500/20 font-medium"
                                    >
                                        🤖 Auto (Fresh Topic Every Post)
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* 2. Master Prompt Input */}
                        <div className="p-4 rounded-xl border border-slate-700 bg-slate-950/60 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Terminal className="h-4 w-4 text-fuchsia-400" />
                                    <label className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                                        Master Prompt / AI Instructions
                                    </label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setPrompt(DEFAULT_MASTER_DIRECTOR_PROMPT)}
                                        className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                                    >
                                        Reset to Default
                                    </button>
                                </div>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                                This prompt is sent to Gemini to generate the creative concept, visual image prompt, title, social caption, and hashtags.
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                                <span>Insert variables:</span>
                                {['{topic}', '{brand_name}', '{brand_role}', '{brand_handle}', '{platform}'].map((tok) => (
                                    <button
                                        key={tok}
                                        type="button"
                                        onClick={() => insertToken(tok, false)}
                                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-fuchsia-300 font-mono border border-slate-700 transition-colors"
                                    >
                                        {tok}
                                    </button>
                                ))}
                            </div>
                            <textarea
                                rows={8}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-fuchsia-500"
                                placeholder="Enter master prompt instructions..."
                            />
                        </div>

                        {/* 3. Target Page & Frequency */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Facebook Page
                                </label>
                                <select
                                    value={pageId}
                                    onChange={(e) => { setPageId(Number(e.target.value)); setSuggestedTopics([]); }}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                                >
                                    {pages.length === 0 && <option value={0}>No pages — connect one first</option>}
                                    {pages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Post Frequency
                                </label>
                                <select
                                    value={intervalMinutes}
                                    onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                                >
                                    {INTERVAL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>Every {opt.label}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* 4. Facebook Groups */}
                        {groups.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5 text-indigo-400" />
                                        Also Broadcast to Facebook Groups ({targetGroupIds.length} selected)
                                    </label>
                                    <Link to="/groups" className="text-xs text-indigo-400 hover:underline">Manage Groups →</Link>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
                                    {groups.map((g) => {
                                        const isSelected = targetGroupIds.includes(g.id);
                                        return (
                                            <div
                                                key={g.id}
                                                onClick={() => toggleGroupSelection(g.id)}
                                                className={`p-2.5 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                                                    isSelected ? 'bg-indigo-600/15 border-indigo-500 text-slate-200' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600'
                                                }`}
                                            >
                                                <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 bg-slate-800'}`}>
                                                    {isSelected && <Check className="h-3 w-3" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold truncate">{g.name}</p>
                                                    <p className="text-[10px] text-slate-500">{g.privacy || 'PUBLIC'}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 5. Creator Branding Profile */}
                        <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/30 space-y-3">
                            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-violet-400" /> Optional Branding & Watermark
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-[11px] text-slate-400 mb-1">Creator Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Muhammad Jawad Iqbal Khan"
                                        value={brandName}
                                        onChange={(e) => setBrandName(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-400 mb-1">Role / Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Full-Stack Developer"
                                        value={brandRole}
                                        onChange={(e) => setBrandRole(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] text-slate-400 mb-1">Signature / Handle</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CodeByJawad"
                                        value={brandHandle}
                                        onChange={(e) => setBrandHandle(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono focus:outline-none focus:border-violet-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 6. Channels & Gemini Key */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Target Channels</label>
                                <div className="flex items-center gap-2">
                                    {['facebook', 'instagram'].map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => togglePlatform(p)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                                platforms.includes(p) ? 'bg-violet-600/20 border-violet-500 text-violet-300' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                            }`}
                                        >
                                            {platforms.includes(p) ? '✓ ' : ''}{p.charAt(0).toUpperCase() + p.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                                    Gemini API Key{' '}
                                    {geminiApiKey ? <span className="text-emerald-400 normal-case font-normal">✓ loaded</span> : <span className="text-slate-600 normal-case font-normal">(optional)</span>}
                                </label>
                                <input
                                    type="password"
                                    placeholder={geminiApiKey ? '••••••••••••• (from Settings)' : 'AIza... (uses server key if blank)'}
                                    value={geminiApiKey}
                                    onChange={(e) => setGeminiApiKey(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-mono focus:outline-none focus:border-violet-500 placeholder:text-slate-600"
                                />
                            </div>
                        </div>

                        {/* 7. Action Toolbar with Test Feature */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                            {/* Test Variations Controls */}
                            <div className="flex items-center gap-2">
                                <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700">
                                    {[1, 3, 5].map((cnt) => (
                                        <button
                                            key={cnt}
                                            type="button"
                                            onClick={() => setTestCount(cnt)}
                                            className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                                testCount === cnt ? 'bg-fuchsia-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                                            }`}
                                        >
                                            {cnt} {cnt === 1 ? 'Test' : 'Variations'}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handlePreviewGenerate(testCount)}
                                    disabled={previewLoading}
                                    className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-750 text-fuchsia-300 border border-fuchsia-500/40 hover:border-fuchsia-400 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-md shadow-fuchsia-950/20"
                                >
                                    {previewLoading ? (
                                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating Test Result{testCount > 1 ? 's' : ''}...</>
                                    ) : (
                                        <><Zap className="h-3.5 w-3.5 text-yellow-300" /> Test &amp; Preview Prompt Result{testCount > 1 ? 's' : ''}</>
                                    )}
                                </button>
                            </div>

                            {/* Launch Button */}
                            <button
                                type="submit"
                                disabled={submitting || pages.length === 0}
                                className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white shadow-lg shadow-violet-500/25 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {submitting ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Launching Auto-Pilot...</>
                                ) : (
                                    <><Sparkles className="h-4 w-4" /> Launch AI Image Auto-Pilot</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* ── Active Auto-Pilots ────────────────────────────────────────────── */}
                <div className="space-y-3">
                    <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-400" />
                        Active Auto-Pilots
                        <span className="text-xs font-normal text-slate-500">({pilots.length})</span>
                    </h2>

                    {loading ? (
                        <div className="text-slate-400 text-sm flex items-center gap-2 py-4">
                            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                        </div>
                    ) : pilots.length === 0 ? (
                        <div className="bg-slate-900/50 border border-dashed border-slate-700 rounded-xl p-10 text-center text-slate-500">
                            <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-25" />
                            <p className="font-medium text-sm">No auto-pilots running yet</p>
                            <p className="text-xs mt-1">Configure your master prompt and launch above.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {pilots.map((pilot) => {
                                const targetGroupsCount = Array.isArray(pilot.targetGroupIds) ? pilot.targetGroupIds.length : 0;
                                return (
                                    <div
                                        key={pilot.id}
                                        className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between gap-3 transition-all ${
                                            pilot.isActive ? 'border-violet-500/30 shadow-md shadow-violet-950/20' : 'border-slate-800 opacity-60'
                                        }`}
                                    >
                                        {/* Pilot Header */}
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    {pilot.brandName && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 truncate inline-block mb-1">
                                                            {pilot.brandName}
                                                        </span>
                                                    )}
                                                    <p className="font-semibold text-sm text-slate-100 truncate">🎯 {pilot.topic}</p>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
                                                        <span>Page: <strong className="text-slate-300">{pages.find((p) => p.id === pilot.pageId)?.name || pilot.pageId}</strong></span>
                                                        {targetGroupsCount > 0 && (
                                                            <span className="px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-[10px] font-semibold">
                                                                +{targetGroupsCount} Group{targetGroupsCount > 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
                                                    pilot.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-700/30 text-slate-500 border-slate-700'
                                                }`}>
                                                    {pilot.isActive ? '● Live' : '⏸ Paused'}
                                                </span>
                                            </div>

                                            {/* Stats row */}
                                            <div className="flex items-center gap-3 text-xs text-slate-500">
                                                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Every {formatInterval(pilot.intervalMinutes)}</span>
                                                <span>·</span>
                                                <span><strong className="text-slate-300">{pilot.totalPosts}</strong> posts</span>
                                                <span>·</span>
                                                <span>Last: <strong className="text-slate-300">{pilot.lastRunAt ? new Date(pilot.lastRunAt).toLocaleTimeString() : 'Never'}</strong></span>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800 flex-wrap">
                                            <button
                                                onClick={() => handleRunNow(pilot.id)}
                                                disabled={runningId === pilot.id}
                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-violet-600/15 hover:bg-violet-600/30 text-violet-300 border border-violet-600/30 transition-colors disabled:opacity-50"
                                            >
                                                {runningId === pilot.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                                Run Now
                                            </button>
                                            <button
                                                onClick={() => handleToggle(pilot.id, pilot.isActive)}
                                                disabled={togglingId === pilot.id}
                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-700/40 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors disabled:opacity-50"
                                            >
                                                {togglingId === pilot.id ? <Loader2 className="h-3 w-3 animate-spin" /> : pilot.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                                                {pilot.isActive ? 'Pause' : 'Resume'}
                                            </button>
                                            <button
                                                onClick={() => handleViewLogs(pilot.id)}
                                                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                                    viewLogsForId === pilot.id ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-slate-700/30 border-slate-600 text-slate-400 hover:bg-slate-700'
                                                }`}
                                            >
                                                <Eye className="h-3 w-3" /> Logs
                                            </button>
                                            <button
                                                onClick={() => openEditModal(pilot)}
                                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-700/40 hover:bg-slate-700 text-slate-300 border border-slate-600 transition-colors"
                                            >
                                                <Edit3 className="h-3 w-3 text-cyan-400" /> Edit
                                            </button>
                                            <button
                                                onClick={() => setConfirmDeleteId(pilot.id)}
                                                disabled={deletingId === pilot.id}
                                                className="ml-auto flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20 transition-colors disabled:opacity-50"
                                            >
                                                {deletingId === pilot.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                                Delete
                                            </button>
                                        </div>

                                        {/* Logs Drawer */}
                                        {viewLogsForId === pilot.id && (
                                            <div className="border-t border-slate-800 pt-3 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Post History</span>
                                                    {logsLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />}
                                                </div>
                                                {logs.length === 0 && !logsLoading && (
                                                    <p className="text-xs text-slate-500 text-center py-3">No posts yet. Click "Run Now" to start.</p>
                                                )}
                                                <div className="space-y-2 max-h-72 overflow-y-auto">
                                                    {logs.map((log) => {
                                                        const imgSrc = getImageSrc(log);
                                                        return (
                                                            <div key={log.id} className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex gap-3 items-start">
                                                                <div className="shrink-0 h-14 w-14 rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-700">
                                                                    {imgSrc ? <img src={imgSrc} alt="AI post" className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-slate-600" />}
                                                                </div>
                                                                <div className="flex-1 min-w-0 space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        {log.status === 'posted' && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20"><CheckCircle2 className="h-2.5 w-2.5" /> Posted</span>}
                                                                        {log.status === 'failed' && <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded-full border border-rose-500/20"><XCircle className="h-2.5 w-2.5" /> Failed</span>}
                                                                        {log.status === 'pending' && <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20"><Loader2 className="h-2.5 w-2.5 animate-spin" /> Pending</span>}
                                                                        <span className="text-[10px] text-slate-500 ml-auto">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                                                    </div>
                                                                    <p className="text-xs font-semibold text-slate-200 truncate">{log.title || 'AI Image Post'}</p>
                                                                    {log.caption && <p className="text-[11px] text-slate-400 line-clamp-2">{log.caption}</p>}
                                                                    {log.facebookPostId && <p className="text-[10px] text-emerald-400 font-mono">✓ Post ID: {log.facebookPostId}</p>}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Edit Modal ───────────────────────────────────────────────────── */}
            {editingPilot && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 my-8">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Settings2 className="h-4 w-4 text-violet-400" />
                                <h3 className="text-base font-bold text-slate-100">Edit Auto-Pilot #{editingPilot.id}</h3>
                            </div>
                            <button onClick={() => setEditingPilot(null)} className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800">
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
                            {/* Topic */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Topic</label>
                                <input
                                    type="text"
                                    value={editTopic}
                                    onChange={(e) => setEditTopic(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-violet-500"
                                />
                            </div>

                            {/* Master Prompt */}
                            <div className="p-3.5 rounded-xl border border-slate-700 bg-slate-950/50 space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-fuchsia-300 flex items-center gap-1.5">
                                        <Terminal className="h-3.5 w-3.5" /> Master Prompt
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setEditPrompt(DEFAULT_MASTER_DIRECTOR_PROMPT)}
                                        className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                                    >
                                        Reset to Default
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-1 text-[10px]">
                                    {['{topic}', '{brand_name}', '{brand_role}', '{brand_handle}', '{platform}'].map((tok) => (
                                        <button
                                            key={tok}
                                            type="button"
                                            onClick={() => insertToken(tok, true)}
                                            className="px-1.5 py-0.5 rounded bg-slate-800 text-fuchsia-300 font-mono border border-slate-700"
                                        >
                                            {tok}
                                        </button>
                                    ))}
                                </div>
                                <textarea
                                    rows={6}
                                    value={editPrompt}
                                    onChange={(e) => setEditPrompt(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-fuchsia-500"
                                />
                            </div>

                            {/* Branding */}
                            <div className="p-3.5 rounded-xl border border-slate-700 bg-slate-800/30 space-y-2.5">
                                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Branding Profile</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">Name</label>
                                        <input type="text" value={editBrandName} onChange={(e) => setEditBrandName(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-violet-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">Role</label>
                                        <input type="text" value={editBrandRole} onChange={(e) => setEditBrandRole(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs focus:outline-none focus:border-violet-500" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">Handle</label>
                                        <input type="text" value={editBrandHandle} onChange={(e) => setEditBrandHandle(e.target.value)}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-xs font-mono focus:outline-none focus:border-violet-500" />
                                    </div>
                                </div>
                            </div>

                            {/* Target Groups */}
                            {groups.length > 0 && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5 text-indigo-400" /> Groups ({editTargetGroupIds.length} selected)
                                    </label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                                        {groups.map((g) => {
                                            const isSel = editTargetGroupIds.includes(g.id);
                                            return (
                                                <div
                                                    key={g.id}
                                                    onClick={() => toggleEditGroupSelection(g.id)}
                                                    className={`p-2 rounded-lg border cursor-pointer flex items-center gap-2 transition-all ${
                                                        isSel ? 'bg-indigo-600/15 border-indigo-500 text-slate-200' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                                    }`}
                                                >
                                                    <div className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${isSel ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-600 bg-slate-800'}`}>
                                                        {isSel && <Check className="h-2.5 w-2.5" />}
                                                    </div>
                                                    <span className="text-xs font-medium truncate">{g.name}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Frequency */}
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Posting Frequency</label>
                                <select
                                    value={editIntervalMinutes}
                                    onChange={(e) => setEditIntervalMinutes(Number(e.target.value))}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-violet-500"
                                >
                                    {INTERVAL_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>Every {opt.label}</option>)}
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setEditingPilot(null)}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={editSaving}
                                    className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-500/20 disabled:opacity-50"
                                >
                                    {editSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Multi-Variation Test Studio Modal ─────────────────────────────── */}
            {previewVariations.length > 0 && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
                    <div className="bg-slate-900 border border-violet-500/40 rounded-2xl w-full max-w-3xl p-6 shadow-2xl space-y-4 my-8">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2.5">
                                <Sparkles className="h-5 w-5 text-fuchsia-400" />
                                <div>
                                    <h3 className="text-base font-bold text-slate-100">
                                        AI Prompt Test Results
                                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-fuchsia-950/80 border border-fuchsia-500/40 text-fuchsia-300 font-semibold">
                                            {previewVariations.length} Result{previewVariations.length > 1 ? 's' : ''}
                                        </span>
                                    </h3>
                                    <p className="text-xs text-slate-400">Review generated images and copy before launching your automated schedule.</p>
                                </div>
                            </div>
                            <button onClick={() => setPreviewVariations([])} className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {previewPublishMsg && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /> {previewPublishMsg}
                            </div>
                        )}

                        {previewVariations.length > 1 && (
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                <span className="text-xs text-slate-400 shrink-0 font-medium">Select Result:</span>
                                {previewVariations.map((_, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => { setSelectedVariationIdx(idx); setPreviewPublishMsg(null); }}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                                            selectedVariationIdx === idx ? 'bg-violet-600 text-white shadow-md' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                        }`}
                                    >
                                        <Zap className={`h-3 w-3 ${selectedVariationIdx === idx ? 'text-yellow-300' : 'text-slate-500'}`} />
                                        Variation #{idx + 1}
                                    </button>
                                ))}
                            </div>
                        )}

                        {(() => {
                            const currentVar = previewVariations[selectedVariationIdx] || previewVariations[0];
                            if (!currentVar) return null;
                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[65vh] overflow-y-auto pr-1">
                                    {/* Generated Image Preview */}
                                    <div className="space-y-2">
                                        <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-800 relative group">
                                            <img src={currentVar.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-4 flex items-end justify-between">
                                                <span className="text-[10px] text-slate-300 font-mono">Gemini Generated</span>
                                                <a
                                                    href={currentVar.imageUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-[10px] px-2 py-1 rounded bg-slate-900/80 text-slate-200 border border-slate-700 hover:bg-slate-800"
                                                >
                                                    Open Full
                                                </a>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {(currentVar.hashtags || []).slice(0, 6).map((tag: string, i: number) => (
                                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-950/60 text-violet-300 border border-violet-500/20 font-mono">#{tag.replace(/^#/, '')}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Generated Text & Copy Spec */}
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Hook / Title</span>
                                            <h4 className="text-sm font-bold text-slate-100 mt-0.5">{currentVar.title}</h4>
                                        </div>
                                        {currentVar.concept && (
                                            <div>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Creative Concept</span>
                                                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{currentVar.concept}</p>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Social Caption</span>
                                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{currentVar.caption}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Image Prompt Spec</span>
                                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-3 bg-slate-950/70 p-2 rounded-lg border border-slate-800 font-mono leading-relaxed">{currentVar.imagePrompt}</p>
                                        </div>

                                        <div className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                                            <span>Page: <strong className="text-slate-200">{pages.find((p) => p.id === pageId)?.name || '—'}</strong></span>
                                            <span>Groups: <strong className="text-indigo-300">{targetGroupIds.length} selected</strong></span>
                                        </div>

                                        <div className="flex items-center gap-2 flex-wrap justify-end pt-1 border-t border-slate-800">
                                            <button
                                                type="button"
                                                onClick={() => handleUseConcept(currentVar)}
                                                className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                                            >
                                                ✓ Use as Topic
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handlePublishPreview(currentVar)}
                                                disabled={publishingPreview || !pageId}
                                                className="px-4 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5"
                                            >
                                                {publishingPreview ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Publishing...</> : <><Zap className="h-3.5 w-3.5 text-yellow-300" /> Post Now</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>,
                document.body
            )}

            {/* ── Delete Confirm ───────────────────────────────────────────────── */}
            <ConfirmDialog
                open={confirmDeleteId !== null}
                title="Delete Auto-Pilot"
                description="Are you sure? Automated posting will stop immediately."
                confirmText="Delete"
                confirmVariant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setConfirmDeleteId(null)}
            />
        </AppLayout>
    );
}