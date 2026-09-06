import { useEffect, useMemo, useState } from 'react';
import {
    Flame,
    Search,
    Loader2,
    CalendarDays,
    Sparkles,
    Youtube,
    Eye,
    Clock,
    TrendingUp,
    Save,
    RefreshCw,
    Trash2,
    CheckCircle2,
    Play,
    X,
    Pencil,
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { usePagesStore } from '@/store/pagesStore';
import { useToast } from '@/store/toastStore';
import { viralShortsApi, type TargetPlatform, type ViralShortCandidate, type ViralPeakSlot, type ViralShortSource } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import { formatSlotTime, formatSlotsIn } from '@/lib/time';

const SUGGESTED_TOPICS = ['motivation', 'farm animal', 'cooking', 'money', 'fitness', 'ai tool', 'travel', 'coding'];

const formatCount = (n?: number): string => {
    if (!n || n <= 0) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
};

const scoreColor = (level: string): string => {
    switch (level) {
        case 'superviral': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
        case 'viral': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
        case 'hot': return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
        default: return 'bg-slate-700/40 text-slate-300 border-slate-600';
    }
};

export default function ViralShorts() {
    const { push } = useToast();
    const { pages, fetchPages } = usePagesStore();

    const [topics, setTopics] = useState('motivation');
    const [pageId, setPageId] = useState<number>(0);
    const [minViews, setMinViews] = useState(10000);
    const [publishedWithinDays, setPublishedWithinDays] = useState(7);
    const [resultCount, setResultCount] = useState(8);
    const [targetPlatforms, setTargetPlatforms] = useState<TargetPlatform[]>(['facebook', 'instagram']);
    const [useAiCaptions, setUseAiCaptions] = useState(true);
    const [saveSourceName, setSaveSourceName] = useState('');
    const [autoImport, setAutoImport] = useState(true);
    const [intervalHours, setIntervalHours] = useState(6);

    const [discovering, setDiscovering] = useState(false);
    const [candidates, setCandidates] = useState<ViralShortCandidate[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [importing, setImporting] = useState(false);
    const [peakSlots, setPeakSlots] = useState<ViralPeakSlot[]>([]);
    const [playingId, setPlayingId] = useState<string | null>(null);

    const [sources, setSources] = useState<ViralShortSource[]>([]);
    const [sourcesLoading, setSourcesLoading] = useState(true);
    const [syncingId, setSyncingId] = useState<number | null>(null);
    const [togglingId, setTogglingId] = useState<number | null>(null);
    const [editingSource, setEditingSource] = useState<ViralShortSource | null>(null);
    const [editForm, setEditForm] = useState<{
        name: string;
        keywords: string;
        pageId: number;
        minViews: number;
        publishedWithinDays: number;
        resultCount: number;
        targetPlatforms: TargetPlatform[];
        useAiCaptions: boolean;
        autoImport: boolean;
        intervalHours: number;
    } | null>(null);
    const [savingSource, setSavingSource] = useState(false);

    const [lastPeakInfo, setLastPeakInfo] = useState('');

    const selectedCandidates = useMemo(
        () => candidates.filter((c) => selected.has(c.candidateId)),
        [candidates, selected]
    );

    // Slot a selected candidate will get is its position among the selected (matches backend import order)
    const slotForCandidate = (c: ViralShortCandidate): ViralPeakSlot | undefined => {
        const idx = selectedCandidates.findIndex((x) => x.candidateId === c.candidateId);
        if (idx === -1) return undefined;
        return peakSlots[idx];
    };

    const keywordList = useMemo(() => topics.split(',').map((t) => t.trim()).filter(Boolean), [topics]);

    const loadSources = async () => {
        try {
            const res = await viralShortsApi.list();
            setSources(res?.sources || []);
        } catch {
            setSources([]);
        } finally {
            setSourcesLoading(false);
        }
    };

    useEffect(() => {
        fetchPages();
        loadSources();
    }, [fetchPages]);

    useEffect(() => {
        if (pages.length > 0 && !pageId) setPageId(pages[0].id);
    }, [pages, pageId]);

    const togglePlatform = (p: TargetPlatform) => {
        setTargetPlatforms((prev) => {
            if (prev.includes(p)) return prev.length > 1 ? prev.filter((x) => x !== p) : prev;
            return [...prev, p];
        });
    };

    const handleDiscover = async () => {
        if (keywordList.length === 0) {
            push({ title: 'Add keywords first', description: 'Enter at least one topic to research.', variant: 'error' });
            return;
        }
        setDiscovering(true);
        setCandidates([]);
        setSelected(new Set());
        setLastPeakInfo('');
        setPeakSlots([]);
        try {
            const res = await viralShortsApi.discover({
                keywords: keywordList,
                minViews,
                publishedWithinDays,
                resultCount,
            });
            const found = res?.candidates || [];
            setCandidates(found);
            if (found.length > 0) {
                setSelected(new Set(found.map((c) => c.candidateId)));
                const top = found
                    .filter((c) => !c.demo)
                    .slice()
                    .sort((a, b) => b.viralScore - a.viralScore)[0] || found[0];
                setLastPeakInfo(
                    found.some((c) => c.demo)
                        ? '⚠️ No live YouTube data was reachable — showing demo candidates. Scheduling & AI captions still work normally.'
                        : `Top find: "${top.title.slice(0, 60)}" (score ${top.viralScore}). Results will be scheduled on your next best heat-map peak slots.`
                );
            }
            viralShortsApi
                .getPeakSlots(Math.max(1, Math.min(15, found.length)), undefined, pageId || pages[0]?.id)
                .then((peakRes) => setPeakSlots(peakRes?.slots || []))
                .catch(() => setPeakSlots([]));
            push({
                title: `🔎 ${found.length} viral shorts found`,
                description: found.length ? 'Preview each short, then queue the best picks.' : 'Try broader keywords.',
                variant: found.length ? 'success' : 'info',
            });
        } catch (err) {
            push({ title: 'Discovery failed', description: err instanceof Error ? err.message : 'Please try again', variant: 'error' });
        } finally {
            setDiscovering(false);
        }
    };

    const handleImport = async (withSourceId?: number) => {
        if (selectedCandidates.length === 0) {
            push({ title: 'Nothing selected', description: 'Select at least one viral short to queue.', variant: 'error' });
            return;
        }
        const targetPageId = pageId || pages[0]?.id;
        if (!targetPageId) {
            push({ title: 'No page connected', description: 'Connect a Facebook Page first (Pages tab).', variant: 'error' });
            return;
        }
        if (!withSourceId && saveSourceName.trim()) {
            try {
                await viralShortsApi.create({
                    pageId: targetPageId,
                    name: saveSourceName.trim(),
                    keywords: keywordList,
                    minViews,
                    publishedWithinDays,
                    resultCount,
                    targetPlatforms,
                    useAiCaptions,
                    autoImport,
                    intervalHours,
                });
                loadSources();
            } catch (err: any) {
                push({ title: 'Could not save auto-pilot', description: err?.message || 'Try again', variant: 'error' });
            }
        }

        setImporting(true);
        try {
            const res = await viralShortsApi.importCandidates({
                pageId: targetPageId,
                candidates: selectedCandidates,
                targetPlatforms,
                useAiCaptions,
            });
            const times = (res?.reels || [])
                .map((r) => (r.scheduledAt ? formatSlotTime(r.scheduledAt) : ''))
                .filter(Boolean);
            const descParts: string[] = [];
            if (times.length) descParts.push(`Scheduled: ${times.slice(0, 3).join('  •  ')}`);
            if (res.skippedExistingCount > 0) descParts.push(`${res.skippedExistingCount} already queued`);
            push({
                title: `📅 ${res.scheduledCount} reels scheduled on peak slots`,
                description: descParts.join(' · ') || 'Check the Queue tab.',
                variant: 'success',
            });
            setCandidates([]);
            setSelected(new Set());
        } catch (err) {
            push({ title: 'Scheduling failed', description: err instanceof Error ? err.message : 'Please try again', variant: 'error' });
        } finally {
            setImporting(false);
        }
    };

    const handleSync = async (id: number) => {
        setSyncingId(id);
        try {
            const res = await viralShortsApi.sync(id);
            push({
                title: `🔁 Synced — ${res.scheduledCount} scheduled`,
                description: `${res.candidateCount} candidates found, ${res.skippedExistingCount} skipped (already queued).`,
                variant: 'success',
            });
            loadSources();
        } catch (err) {
            push({ title: 'Sync failed', description: err instanceof Error ? err.message : 'Try again', variant: 'error' });
        } finally {
            setSyncingId(null);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this Viral Shorts auto-pilot source?')) return;
        try {
            await viralShortsApi.remove(id);
            loadSources();
            push({ title: 'Auto-pilot removed', variant: 'info' });
        } catch (err) {
            push({ title: 'Delete failed', description: err instanceof Error ? err.message : 'Try again', variant: 'error' });
        }
    };

    const handleToggle = async (id: number) => {
        setTogglingId(id);
        try {
            const res = await viralShortsApi.toggle(id);
            loadSources();
            push({
                title: res.source.isActive ? '▶ Auto-pilot resumed' : '⏸ Auto-pilot paused',
                description: res.source.isActive
                    ? 'This source will be scanned again on its next interval.'
                    : 'Scheduler will skip this source until resumed.',
                variant: res.source.isActive ? 'success' : 'info',
            });
        } catch (err) {
            push({ title: 'Toggle failed', description: err instanceof Error ? err.message : 'Try again', variant: 'error' });
        } finally {
            setTogglingId(null);
        }
    };

    const openEdit = (s: ViralShortSource) => {
        setEditingSource(s);
        setEditForm({
            name: s.name,
            keywords: s.keywords.join(', '),
            pageId: s.pageId,
            minViews: s.minViews,
            publishedWithinDays: s.publishedWithinDays,
            resultCount: s.resultCount,
            targetPlatforms: s.targetPlatforms,
            useAiCaptions: s.useAiCaptions,
            autoImport: s.autoImport,
            intervalHours: s.intervalHours,
        });
    };

    const toggleEditPlatform = (p: TargetPlatform) => {
        setEditForm((f) => {
            if (!f) return f;
            if (f.targetPlatforms.includes(p)) {
                return f.targetPlatforms.length > 1 ? { ...f, targetPlatforms: f.targetPlatforms.filter((x) => x !== p) } : f;
            }
            return { ...f, targetPlatforms: [...f.targetPlatforms, p] };
        });
    };

    const handleSaveSource = async () => {
        if (!editingSource || !editForm) return;
        const kw = editForm.keywords.split(',').map((t) => t.trim()).filter(Boolean);
        if (kw.length === 0) {
            push({ title: 'Add keywords first', description: 'The source needs at least one keyword.', variant: 'error' });
            return;
        }
        if (editForm.targetPlatforms.length === 0) {
            push({ title: 'Pick a platform', description: 'Select at least one target platform.', variant: 'error' });
            return;
        }
        setSavingSource(true);
        try {
            await viralShortsApi.update(editingSource.id, {
                name: editForm.name,
                keywords: kw,
                pageId: editForm.pageId,
                minViews: editForm.minViews,
                publishedWithinDays: editForm.publishedWithinDays,
                resultCount: editForm.resultCount,
                targetPlatforms: editForm.targetPlatforms,
                useAiCaptions: editForm.useAiCaptions,
                autoImport: editForm.autoImport,
                intervalHours: editForm.intervalHours,
            });
            setEditingSource(null);
            setEditForm(null);
            loadSources();
            push({ title: 'Auto-pilot updated', description: 'Changes will apply from the next scan.', variant: 'success' });
        } catch (err) {
            push({ title: 'Update failed', description: err instanceof Error ? err.message : 'Try again', variant: 'error' });
        } finally {
            setSavingSource(false);
        }
    };

    const toggleSelect = (candidateId: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(candidateId)) next.delete(candidateId);
            else next.add(candidateId);
            return next;
        });
    };

    return (
        <AppLayout>
            <div className="animate-fade-in space-y-8 pb-32 lg:pb-6">
                <div>
                    <h1 className="section-title flex items-center gap-2">
                        <Flame className="h-7 w-7 text-rose-400" />
                        Viral Shorts Auto-Pilot
                    </h1>
                    <p className="section-subtitle">
                        Research viral YouTube Shorts, auto-write AI captions & tags, and schedule them on your post heat-map peak times.
                    </p>
                </div>

                {/* Discovery form */}
                <section className="card p-6">
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                                <Youtube className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="font-display text-base font-semibold text-slate-100">Research Viral Shorts</h2>
                                <p className="text-xs text-slate-500">Search trending short-form content on YouTube and queue the best picks</p>
                            </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                            🔥 Scored by viral potential
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="form-label">Keywords / Topic to research</label>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="motivation, money, farm animal, cooking"
                                value={topics}
                                onChange={(e) => setTopics(e.target.value)}
                            />
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {SUGGESTED_TOPICS.map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setTopics((prev) => (keywordList.includes(t) ? prev : [prev, t].filter(Boolean).join(', ')))}
                                        className="px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:border-rose-500/40 hover:text-rose-300"
                                    >
                                        + {t}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="form-label">Facebook Page / Group destination</label>
                            <select
                                className="input-field"
                                value={pageId}
                                onChange={(e) => setPageId(Number(e.target.value))}
                            >
                                <option value={0}>Select a page…</option>
                                {pages.map((p) => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="form-label">Minimum views</label>
                            <select className="input-field" value={minViews} onChange={(e) => setMinViews(Number(e.target.value))}>
                                <option value={0}>Any</option>
                                <option value={5000}>5K+</option>
                                <option value={10000}>10K+</option>
                                <option value={50000}>50K+</option>
                                <option value={100000}>100K+</option>
                                <option value={1000000}>1M+</option>
                            </select>
                        </div>

                        <div>
                            <label className="form-label">Published within (days)</label>
                            <select className="input-field" value={publishedWithinDays} onChange={(e) => setPublishedWithinDays(Number(e.target.value))}>
                                <option value={1}>24 hours</option>
                                <option value={3}>3 days</option>
                                <option value={7}>7 days</option>
                                <option value={30}>30 days</option>
                                <option value={0}>Any time</option>
                            </select>
                        </div>

                        <div>
                            <label className="form-label">Results per scan</label>
                            <select className="input-field" value={resultCount} onChange={(e) => setResultCount(Number(e.target.value))}>
                                {[4, 6, 8, 10, 12].map((n) => (
                                    <option key={n} value={n}>{n} shorts</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="form-label">Target platforms (cross-posting)</label>
                            <div className="flex flex-wrap items-center gap-2">
                                {(['facebook', 'instagram', 'tiktok', 'youtube'] as TargetPlatform[]).map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => togglePlatform(p)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize',
                                            targetPlatforms.includes(p)
                                                ? p === 'youtube' ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-accent-400/20 border-accent-400 text-accent-300'
                                                : 'bg-bg-surface border-slate-700 text-slate-400 hover:border-slate-600'
                                        )}
                                    >
                                        {targetPlatforms.includes(p) ? '✓ ' : ''}{p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="md:col-span-2 flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useAiCaptions}
                                    onChange={(e) => setUseAiCaptions(e.target.checked)}
                                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-indigo-500"
                                />
                                <span className="text-sm text-slate-300 flex items-center gap-1.5">
                                    <Sparkles className="h-4 w-4 text-amber-400" />
                                    AI writes caption, title & hashtags (like the AI Content button)
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={saveSourceName !== ''}
                                    onChange={(e) => {
                                        setSaveSourceName(e.target.checked ? (keywordList[0] || 'Viral') + ' research' : '');
                                        setAutoImport(true);
                                    }}
                                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
                                />
                                <span className="text-sm text-slate-300 flex items-center gap-1.5">
                                    <RefreshCw className="h-4 w-4 text-emerald-400" />
                                    Save as recurring auto-pilot
                                </span>
                            </label>
                        </div>

                        {saveSourceName && (
                            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="form-label">Source name</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={saveSourceName}
                                        onChange={(e) => setSaveSourceName(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="form-label">Scan every (hours)</label>
                                    <select className="input-field" value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))}>
                                        {[3, 6, 12, 24].map((n) => (
                                            <option key={n} value={n}>{n} hours</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-end pb-1">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={autoImport}
                                            onChange={(e) => setAutoImport(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
                                        />
                                        <span className="text-sm text-slate-300">Auto-import new finds</span>
                                    </label>
                                </div>
                            </div>
                        )}

                        <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleDiscover}
                                disabled={discovering}
                                className="btn-primary"
                            >
                                {discovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                                {discovering ? 'Researching viral shorts…' : '🔎 Discover Viral Shorts'}
                            </button>
                            {candidates.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => handleImport()}
                                    disabled={importing || selectedCandidates.length === 0}
                                    className="btn-ghost"
                                >
                                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                                    {importing ? 'Scheduling…' : `Queue Selected on Peak Slots (${selectedCandidates.length})`}
                                </button>
                            )}
                        </div>
                    </div>

                    {lastPeakInfo && (
                        <p className="mt-4 text-xs text-slate-400 flex items-center gap-1.5">
                            <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                            {lastPeakInfo}
                        </p>
                    )}

                    {peakSlots.length > 0 && (
                        <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            Next best peak slots:
                            <span className="flex flex-wrap gap-1.5">
                                {peakSlots.slice(0, 6).map((p, i) => (
                                    <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                                        {formatSlotTime(p.datetimeISO)}
                                    </span>
                                ))}
                                {peakSlots.length > 6 && <span className="text-slate-500">+{peakSlots.length - 6} more</span>}
                            </span>
                        </p>
                    )}
                </section>

                {/* Discovery results */}
                {candidates.length > 0 && (
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-slate-100">
                                Results ({candidates.length}) — <span className="text-indigo-400">{selectedCandidates.length} selected</span>
                            </h2>
                            <button
                                type="button"
                                onClick={() => {
                                    if (selected.size === candidates.length) setSelected(new Set());
                                    else setSelected(new Set(candidates.map((c) => c.candidateId)));
                                }}
                                className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                            >
                                {selected.size === candidates.length ? 'Deselect all' : 'Select all'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {candidates.map((c) => {
                                const isSelected = selected.has(c.candidateId);
                                const assignedSlot = slotForCandidate(c);
                                return (
                                    <div
                                        key={c.candidateId}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => toggleSelect(c.candidateId)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') toggleSelect(c.candidateId);
                                        }}
                                        className={cn(
                                            'group text-left rounded-xl border bg-slate-900/60 overflow-hidden transition-all cursor-pointer',
                                            isSelected
                                                ? 'border-indigo-500 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-500/10'
                                                : 'border-slate-800 hover:border-slate-700'
                                        )}
                                    >
                                        <div className="relative aspect-video bg-slate-800 overflow-hidden">
                                            {c.demo ? (
                                                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                                    <Youtube className="h-8 w-8 text-slate-600" />
                                                </div>
                                            ) : playingId === c.candidateId ? (
                                                <>
                                                    <iframe
                                                        src={`https://www.youtube-nocookie.com/embed/${c.videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&color=white`}
                                                        title={c.title}
                                                        className="h-full w-full absolute inset-0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                        allowFullScreen
                                                    />
                                                    <span className="absolute top-2 right-2 z-10">
                                                        <button
                                                            type="button"
                                                            title="Close player"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPlayingId(null);
                                                            }}
                                                            className="h-7 w-7 rounded-full bg-slate-900/85 border border-slate-600 text-slate-200 flex items-center justify-center hover:bg-slate-800"
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </span>
                                                    <span className="absolute bottom-2 left-2 z-10 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-slate-200 flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> {c.durationSec ? `${c.durationSec}s` : 'Short'}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    {c.thumbnailUrl ? (
                                                        <img src={c.thumbnailUrl} alt={c.title} className="h-full w-full object-cover" loading="lazy" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                                                            <Youtube className="h-8 w-8 text-slate-600" />
                                                        </div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="Play this short"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPlayingId(c.candidateId);
                                                        }}
                                                        className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors"
                                                    >
                                                        <span className="h-12 w-12 rounded-full bg-slate-900/85 border border-slate-600 text-white flex items-center justify-center shadow-xl transition-transform group-hover:scale-110 group-hover:bg-rose-500 group-hover:border-rose-400">
                                                            <Play className="h-5 w-5 ml-0.5 fill-current" />
                                                        </span>
                                                    </button>
                                                </>
                                            )}
                                            <span className={cn('absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold border', scoreColor(c.viralLevel))}>
                                                {c.viralLevel.toUpperCase()} · {c.viralScore}
                                            </span>
                                            {c.demo && (
                                                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 border border-slate-700 text-slate-300">
                                                    DEMO
                                                </span>
                                            )}
                                            {isSelected && (
                                                <span className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow-lg">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                </span>
                                            )}
                                            <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-slate-200 flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {c.durationSec ? `${c.durationSec}s` : 'Short'}
                                            </span>
                                        </div>
                                        <div className="p-3 space-y-2">
                                            <p className="text-sm font-semibold text-slate-100 leading-snug line-clamp-2">{c.title}</p>
                                            <div className="flex items-center justify-between text-[11px] text-slate-500">
                                                <span className="truncate pr-2">{c.channelName || 'YouTube'}</span>
                                                <span className="flex items-center gap-1 shrink-0">
                                                    <Eye className="h-3 w-3 text-emerald-400" />
                                                    {formatCount(c.viewCount)} views
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {(c.keywords || []).slice(0, 3).map((k, i) => (
                                                    <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-400">#{k.replace(/[^a-z0-9]/gi, '')}</span>
                                                ))}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="px-3 pb-3 -mt-1 flex items-center justify-between border-t border-slate-800 pt-2">
                                                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300">
                                                    <CalendarDays className="h-3.5 w-3.5" />
                                                    {assignedSlot ? formatSlotTime(assignedSlot.datetimeISO) : 'Peak slot…'}
                                                </span>
                                                {assignedSlot && (
                                                    <span className="text-[10px] text-slate-500">{formatSlotsIn(assignedSlot.datetimeISO)}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Saved auto-pilot sources */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-100">Recurring Auto-Pilot Sources ({sources.length})</h2>
                        <span className="text-xs text-slate-500 flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5 text-indigo-400" />
                            Every scan schedules new finds on your top heat-map peak slots
                        </span>
                    </div>

                    {sourcesLoading ? (
                        <p className="text-sm text-slate-400">Loading sources…</p>
                    ) : sources.length === 0 ? (
                        <div className="card p-8 text-center text-slate-400 text-sm">
                            No auto-pilot sources yet. Toggle “Save as recurring auto-pilot” when scheduling to research & queue on a recurring cadence.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sources.map((s) => (
                                <div key={s.id} className="card p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-100 truncate">{s.name}</h3>
                                            <p className="text-xs text-slate-500 truncate font-mono">{s.keywords.join(', ')}</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleToggle(s.id)}
                                            disabled={togglingId === s.id}
                                            title={s.isActive ? 'Pause auto-pilot (scheduler will skip this source)' : 'Resume auto-pilot'}
                                            className={cn(
                                                'flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border shrink-0 transition-colors',
                                                s.isActive
                                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700/60'
                                            )}
                                        >
                                            <span className="relative inline-flex h-4 w-7 items-center rounded-full bg-slate-700 px-0.5">
                                                <span
                                                    className={cn(
                                                        'h-3 w-3 transform rounded-full bg-white transition-transform',
                                                        s.isActive ? 'translate-x-3 bg-emerald-400' : 'translate-x-0'
                                                    )}
                                                />
                                            </span>
                                            {togglingId === s.id ? '…' : s.isActive ? 'AUTO-PILOT ON' : 'PAUSED'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                        <div className="rounded-lg bg-slate-800/60 py-2">
                                            <p className="text-slate-500 text-[10px] uppercase">Discovered</p>
                                            <p className="font-bold text-slate-100">{s.discoveredCount}</p>
                                        </div>
                                        <div className="rounded-lg bg-slate-800/60 py-2">
                                            <p className="text-slate-500 text-[10px] uppercase">Queued</p>
                                            <p className="font-bold text-indigo-300">{s.importedCount}</p>
                                        </div>
                                        <div className="rounded-lg bg-slate-800/60 py-2">
                                            <p className="text-slate-500 text-[10px] uppercase">Scan</p>
                                            <p className="font-bold text-slate-100">every {s.intervalHours}h</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
                                        <span className="text-slate-500">
                                            Last scan: {s.lastPolledAt ? new Date(s.lastPolledAt).toLocaleString() : 'Never'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => openEdit(s)}
                                                title="Edit source settings"
                                                className="px-3 py-1 rounded bg-slate-700/40 hover:bg-slate-600/40 text-slate-300 font-medium transition-colors flex items-center gap-1.5"
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleSync(s.id)}
                                                disabled={syncingId === s.id}
                                                className="px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                                            >
                                                {syncingId === s.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                                Sync Now
                                            </button>
                                            <button
                                                onClick={() => handleDelete(s.id)}
                                                title="Delete source"
                                                className="px-3 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium transition-colors"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {editingSource && editForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setEditingSource(null)}>
                    <div className="card w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-100">Edit auto-pilot source</h3>
                            <button
                                onClick={() => setEditingSource(null)}
                                className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        <div>
                            <label className="form-label">Source name</label>
                            <input
                                type="text"
                                className="input-field"
                                value={editForm.name}
                                onChange={(e) => setEditForm((f) => (f ? { ...f, name: e.target.value } : f))}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <label className="form-label">Keywords / Topic to research</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={editForm.keywords}
                                    onChange={(e) => setEditForm((f) => (f ? { ...f, keywords: e.target.value } : f))}
                                />
                            </div>

                            <div>
                                <label className="form-label">Facebook Page / Group destination</label>
                                <select
                                    className="input-field"
                                    value={editForm.pageId}
                                    onChange={(e) => setEditForm((f) => (f ? { ...f, pageId: Number(e.target.value) } : f))}
                                >
                                    <option value={0}>Select a page…</option>
                                    {pages.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="form-label">Minimum views</label>
                                <select
                                    className="input-field"
                                    value={editForm.minViews}
                                    onChange={(e) => setEditForm((f) => (f ? { ...f, minViews: Number(e.target.value) } : f))}
                                >
                                    <option value={0}>Any</option>
                                    <option value={5000}>5K+</option>
                                    <option value={10000}>10K+</option>
                                    <option value={50000}>50K+</option>
                                    <option value={100000}>100K+</option>
                                    <option value={1000000}>1M+</option>
                                </select>
                            </div>

                            <div>
                                <label className="form-label">Published within (days)</label>
                                <select
                                    className="input-field"
                                    value={editForm.publishedWithinDays}
                                    onChange={(e) => setEditForm((f) => (f ? { ...f, publishedWithinDays: Number(e.target.value) } : f))}
                                >
                                    <option value={1}>24 hours</option>
                                    <option value={3}>3 days</option>
                                    <option value={7}>7 days</option>
                                    <option value={30}>30 days</option>
                                    <option value={0}>Any time</option>
                                </select>
                            </div>

                            <div>
                                <label className="form-label">Results per scan</label>
                                <select
                                    className="input-field"
                                    value={editForm.resultCount}
                                    onChange={(e) => setEditForm((f) => (f ? { ...f, resultCount: Number(e.target.value) } : f))}
                                >
                                    {[4, 6, 8, 10, 12].map((n) => (
                                        <option key={n} value={n}>{n} shorts</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="form-label">Scan every (hours)</label>
                                <select
                                    className="input-field"
                                    value={editForm.intervalHours}
                                    onChange={(e) => setEditForm((f) => (f ? { ...f, intervalHours: Number(e.target.value) } : f))}
                                >
                                    {[3, 6, 12, 24].map((n) => (
                                        <option key={n} value={n}>{n} hours</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="form-label">Target platforms (cross-posting)</label>
                            <div className="flex flex-wrap items-center gap-2">
                                {(['facebook', 'instagram', 'tiktok', 'youtube'] as TargetPlatform[]).map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => toggleEditPlatform(p)}
                                        className={cn(
                                            'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize',
                                            editForm.targetPlatforms.includes(p)
                                                ? p === 'youtube' ? 'bg-red-500/20 border-red-500 text-red-300' : 'bg-accent-400/20 border-accent-400 text-accent-300'
                                                : 'bg-bg-surface border-slate-700 text-slate-400 hover:border-slate-600'
                                        )}
                                    >
                                        {editForm.targetPlatforms.includes(p) ? '✓ ' : ''}{p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editForm.useAiCaptions}
                                    onChange={(e) => setEditForm((f) => (f ? { ...f, useAiCaptions: e.target.checked } : f))}
                                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-indigo-500"
                                />
                                <span className="text-sm text-slate-300 flex items-center gap-1.5">
                                    <Sparkles className="h-4 w-4 text-amber-400" />
                                    AI writes caption, title & hashtags
                                </span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={editForm.autoImport}
                                    onChange={(e) => setEditForm((f) => (f ? { ...f, autoImport: e.target.checked } : f))}
                                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
                                />
                                <span className="text-sm text-slate-300 flex items-center gap-1.5">
                                    <RefreshCw className="h-4 w-4 text-emerald-400" />
                                    Auto-import new finds on each scan
                                </span>
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                            <button
                                onClick={() => setEditingSource(null)}
                                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveSource}
                                disabled={savingSource}
                                className="px-4 py-2 rounded-lg bg-accent-400 hover:bg-accent-500 text-accent-foreground text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {savingSource && <Loader2 className="h-4 w-4 animate-spin" />}
                                Save changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}