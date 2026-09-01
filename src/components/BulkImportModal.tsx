import React, { useState } from 'react';
import { TargetPlatform } from '../../shared/types';
import api from '@/lib/apiClient';

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    pages: Array<{ id: number; name: string }>;
    onSuccess: () => void;
}

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, pages, onSuccess }) => {
    const [selectedPageId, setSelectedPageId] = useState<number>(pages[0]?.id || 0);
    const [urlsText, setUrlsText] = useState('');
    const [intervalHours, setIntervalHours] = useState(3);
    const [targetPlatforms, setTargetPlatforms] = useState<TargetPlatform[]>(['facebook', 'instagram']);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const togglePlatform = (p: TargetPlatform) => {
        if (targetPlatforms.includes(p)) {
            if (targetPlatforms.length > 1) {
                setTargetPlatforms(targetPlatforms.filter((item) => item !== p));
            }
        } else {
            setTargetPlatforms([...targetPlatforms, p]);
        }
    };

    const handleImport = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const lines = urlsText
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        if (lines.length === 0) {
            setError('Please enter at least one video URL.');
            return;
        }

        const items = lines.map((url, idx) => ({
            title: `Bulk Reel #${idx + 1}`,
            videoUrl: url,
            caption: `Viral Video #${idx + 1} #reels #viral`,
            hashtags: ['viral', 'trending', 'shorts'],
        }));

        setLoading(true);
        try {
            await api.post('/reels/bulk-import', {
                pageId: selectedPageId || pages[0]?.id,
                targetPlatforms,
                intervalHours: Number(intervalHours),
                items,
            });
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.error || 'Bulk import failed. Please check URLs and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-xl shadow-2xl space-y-5 text-slate-100">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                        ⚡ Bulk Reel Importer & Scheduler
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

                <form onSubmit={handleImport} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Target Facebook Page
                        </label>
                        <select
                            value={selectedPageId}
                            onChange={(e) => setSelectedPageId(Number(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                        >
                            {pages.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Target Platforms (Cross-Posting)
                        </label>
                        <div className="flex items-center gap-3">
                            {[
                                { id: 'facebook', label: 'Facebook Reels' },
                                { id: 'instagram', label: 'Instagram Reels' },
                                { id: 'tiktok', label: 'TikTok' },
                            ].map((item) => (
                                <button
                                    type="button"
                                    key={item.id}
                                    onClick={() => togglePlatform(item.id as TargetPlatform)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${targetPlatforms.includes(item.id as TargetPlatform)
                                            ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                                        }`}
                                >
                                    {targetPlatforms.includes(item.id as TargetPlatform) ? '✓ ' : ''}{item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Video URLs (One link per line — YouTube Shorts / Direct MP4s)
                        </label>
                        <textarea
                            rows={5}
                            value={urlsText}
                            onChange={(e) => setUrlsText(e.target.value)}
                            placeholder="https://www.youtube.com/shorts/GYZJsM7sOKU&#10;https://www.youtube.com/shorts/TjS6YXkKR-o"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Schedule Interval Between Reels (Hours)
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="24"
                            value={intervalHours}
                            onChange={(e) => setIntervalHours(Number(e.target.value))}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-slate-800 pt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg transition-all disabled:opacity-50"
                        >
                            {loading ? 'Importing & Scheduling...' : 'Start Bulk Import'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
