import React, { useEffect, useState } from 'react';
import { RssFeed, TargetPlatform } from '../../shared/types';
import api from '@/lib/apiClient';
import AppLayout from '@/components/AppLayout';

export const RssAutoPilot: React.FC = () => {
    const [feeds, setFeeds] = useState<RssFeed[]>([]);
    const [pages, setPages] = useState<Array<{ id: number; name: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [syncingId, setSyncingId] = useState<number | null>(null);

    // New feed form state
    const [name, setName] = useState('');
    const [feedUrl, setFeedUrl] = useState('');
    const [pageId, setPageId] = useState<number>(0);
    const [intervalHours, setIntervalHours] = useState(3);
    const [targetPlatforms, setTargetPlatforms] = useState<TargetPlatform[]>(['facebook', 'instagram']);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [feedsRes, pagesRes] = await Promise.all([
                api.get('/rss-feeds'),
                api.get('/pages'),
            ]);
            setFeeds(feedsRes.data?.data?.feeds || []);
            const pageList = pagesRes.data?.data?.pages || [];
            setPages(pageList);
            if (pageList.length > 0 && !pageId) {
                setPageId(pageList[0].id);
            }
        } catch (err: any) {
            console.error('Failed to load RSS feeds', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const togglePlatform = (p: TargetPlatform) => {
        if (targetPlatforms.includes(p)) {
            if (targetPlatforms.length > 1) {
                setTargetPlatforms(targetPlatforms.filter((item) => item !== p));
            }
        } else {
            setTargetPlatforms([...targetPlatforms, p]);
        }
    };

    const handleCreateFeed = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name || !feedUrl) {
            setError('Please enter a Feed Name and YouTube Channel / RSS URL.');
            return;
        }

        setSubmitting(true);
        try {
            await api.post('/rss-feeds', {
                pageId: pageId || pages[0]?.id,
                name,
                feedUrl,
                targetPlatforms,
                intervalHours: Number(intervalHours),
            });
            setName('');
            setFeedUrl('');
            fetchData();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Failed to add RSS feed.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSyncNow = async (id: number) => {
        setSyncingId(id);
        try {
            await api.post(`/rss-feeds/${id}/sync`);
            await fetchData();
        } catch (err) {
            console.error('Failed to sync feed', err);
        } finally {
            setSyncingId(null);
        }
    };

    const handleDeleteFeed = async (id: number) => {
        if (!confirm('Are you sure you want to delete this RSS Auto-Pilot feed?')) return;
        try {
            await api.delete(`/rss-feeds/${id}`);
            await fetchData();
        } catch (err) {
            console.error('Failed to delete feed', err);
        }
    };

    return (
        <AppLayout>
            <div className="space-y-8 max-w-6xl mx-auto p-4 sm:p-6 text-slate-100">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        🤖 RSS Auto-Pilot
                    </h1>
                    <p className="text-slate-400 text-sm mt-1">
                        Connect YouTube Channels & RSS feeds to automatically fetch new Shorts and queue them for cross-posting!
                    </p>
                </div>

                {/* Form */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                    <h2 className="text-lg font-bold text-slate-200">Connect New YouTube Channel or RSS Feed</h2>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleCreateFeed} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                Feed / Channel Name
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. AI Tech Shorts Channel"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                Target Facebook Page
                            </label>
                            <select
                                value={pageId}
                                onChange={(e) => setPageId(Number(e.target.value))}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            >
                                {pages.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                YouTube Channel URL or RSS Feed Link
                            </label>
                            <input
                                type="text"
                                placeholder="https://www.youtube.com/feeds/videos.xml?channel_id=UC..."
                                value={feedUrl}
                                onChange={(e) => setFeedUrl(e.target.value)}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                Schedule Interval Between Auto-Queued Videos (Hours)
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="24"
                                value={intervalHours}
                                onChange={(e) => setIntervalHours(Number(e.target.value))}
                                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                Auto Cross-Posting Platforms
                            </label>
                            <div className="flex items-center gap-2 pt-1">
                                {[
                                    { id: 'facebook', label: 'Facebook' },
                                    { id: 'instagram', label: 'Instagram' },
                                    { id: 'tiktok', label: 'TikTok' },
                                ].map((item) => (
                                    <button
                                        type="button"
                                        key={item.id}
                                        onClick={() => togglePlatform(item.id as TargetPlatform)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${targetPlatforms.includes(item.id as TargetPlatform)
                                                ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                                                : 'bg-slate-800 border-slate-700 text-slate-400'
                                            }`}
                                    >
                                        {targetPlatforms.includes(item.id as TargetPlatform) ? '✓ ' : ''}{item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="md:col-span-2 flex justify-end">
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg transition-all disabled:opacity-50"
                            >
                                {submitting ? 'Connecting...' : '🚀 Connect RSS Auto-Pilot'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-bold text-slate-200">Active Auto-Pilot Feeds ({feeds.length})</h2>

                    {loading ? (
                        <div className="text-slate-400 text-sm">Loading RSS feeds...</div>
                    ) : feeds.length === 0 ? (
                        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                            No RSS Auto-Pilot feeds connected yet. Connect a YouTube channel above to begin auto-scheduling!
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {feeds.map((feed) => (
                                <div
                                    key={feed.id}
                                    className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between space-y-4"
                                >
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-bold text-slate-100 text-lg">{feed.name}</h3>
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                ACTIVE
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-400 font-mono truncate">{feed.feedUrl}</p>

                                        <div className="flex items-center gap-3 text-xs text-slate-400 pt-1">
                                            <span>Page: <strong className="text-slate-200">{feed.page?.name || feed.pageId}</strong></span>
                                            <span>•</span>
                                            <span>Interval: <strong className="text-slate-200">{feed.intervalHours}h</strong></span>
                                            <span>•</span>
                                            <span>Imported: <strong className="text-slate-200">{feed.importedCount} reels</strong></span>
                                        </div>

                                        <div className="flex items-center gap-1.5 pt-2">
                                            {(feed.targetPlatforms || ['facebook']).map((plat) => (
                                                <span key={plat} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-indigo-300 uppercase border border-slate-700">
                                                    {plat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
                                        <span className="text-slate-500">
                                            Last sync: {feed.lastPolledAt ? new Date(feed.lastPolledAt).toLocaleString() : 'Never'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleSyncNow(feed.id)}
                                                disabled={syncingId === feed.id}
                                                className="px-3 py-1 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 font-medium transition-colors disabled:opacity-50"
                                            >
                                                {syncingId === feed.id ? 'Syncing...' : '🔄 Sync Now'}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFeed(feed.id)}
                                                className="px-3 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium transition-colors"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
};
