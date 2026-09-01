import React, { useEffect, useState } from 'react';
import { Users, Send, Loader2, Check, ExternalLink, Share2, Globe, Shield } from 'lucide-react';
import { groupsApi, type FacebookGroup, type ReelWithPage } from '@/lib/apiClient';
import { useToast } from '@/store/toastStore';

interface ShareToGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    reel: ReelWithPage | null;
}

export const ShareToGroupModal: React.FC<ShareToGroupModalProps> = ({
    isOpen,
    onClose,
    reel,
}) => {
    const { push } = useToast();
    const [groups, setGroups] = useState<FacebookGroup[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(true);
    const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        if (isOpen && reel) {
            setTitle(reel.title || '');
            setDescription(reel.caption || '');
            setLoadingGroups(true);

            groupsApi.getGroups()
                .then((data) => setGroups(data || []))
                .catch(() => push({ title: 'Failed to load Facebook Groups', variant: 'error' }))
                .finally(() => setLoadingGroups(false));
        }
    }, [isOpen, reel]);

    if (!isOpen || !reel) return null;

    const reelVideoUrl = reel.videoUrl || reel.facebookPostUrl || '';

    const handleToggleGroup = (groupId: number) => {
        if (selectedGroupIds.includes(groupId)) {
            setSelectedGroupIds(selectedGroupIds.filter((id) => id !== groupId));
        } else {
            setSelectedGroupIds([...selectedGroupIds, groupId]);
        }
    };

    const handleShareToSelectedGroups = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedGroupIds.length === 0) {
            push({ title: 'Select at least one group to share to', variant: 'error' });
            return;
        }
        if (!reelVideoUrl) {
            push({ title: 'No valid video URL available for sharing', variant: 'error' });
            return;
        }

        setSharing(true);
        let successCount = 0;
        let webShareTriggered = false;

        for (const groupId of selectedGroupIds) {
            const groupObj = groups.find((g) => g.id === groupId);
            try {
                const targetUrl = reel.facebookPostUrl || reelVideoUrl;
                const res = await groupsApi.publishToGroup(groupId, {
                    videoUrl: targetUrl,
                    title: title.trim() || reel.title,
                    description: description.trim() || undefined,
                });

                if (res.success) {
                    successCount++;
                } else if (res.requiresWebShare && res.sharerUrl) {
                    window.open(res.sharerUrl, '_blank');
                    webShareTriggered = true;
                }
            } catch (err: any) {
                // If API rejects direct graph posting, open Facebook Web Sharer window
                const fallbackUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reel.facebookPostUrl || reelVideoUrl)}`;
                window.open(fallbackUrl, '_blank');
                webShareTriggered = true;
            }
        }

        setSharing(false);

        if (successCount > 0) {
            push({
                title: '🎉 Reel Shared to Facebook Groups!',
                description: `Successfully shared "${reel.title}" to ${successCount} Facebook Group(s).`,
                variant: 'success',
            });
            onClose();
        } else if (webShareTriggered) {
            push({
                title: '🌐 Facebook Share Window Opened',
                description: `Opened Facebook's Group Share dialog for "${reel.title}". Simply click Post in the popup!`,
                variant: 'info',
            });
            onClose();
        }
    };

    const fbSharerUrl = reel.facebookPostUrl
        ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reel.facebookPostUrl)}`
        : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(reel.videoUrl || '')}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 text-slate-100 animate-fade-in max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-bold flex items-center gap-2 bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
                        <Share2 className="h-5 w-5 text-indigo-400" />
                        Share Published Reel to Groups
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl font-bold">
                        ✕
                    </button>
                </div>

                <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">Selected Reel</span>
                        <h4 className="font-bold text-slate-200 truncate mt-0.5">{reel.title}</h4>
                    </div>
                    {reel.facebookPostUrl && (
                        <a
                            href={fbSharerUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 transition-all flex items-center gap-1 shrink-0"
                            title="Open Facebook Share Dialog"
                        >
                            Open FB Web Share <ExternalLink className="h-3 w-3" />
                        </a>
                    )}
                </div>

                <form onSubmit={handleShareToSelectedGroups} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Group Post Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                            Group Post Caption / Description
                        </label>
                        <textarea
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
                            <span>Select Target Facebook Groups ({selectedGroupIds.length} selected)</span>
                        </label>

                        {loadingGroups ? (
                            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                                Loading Connected Facebook Groups...
                            </div>
                        ) : groups.length === 0 ? (
                            <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-center text-xs text-slate-400 space-y-2">
                                <p>No Facebook Groups connected yet.</p>
                                <a href="/groups" className="inline-block text-indigo-400 font-bold hover:underline">
                                    Go to Groups Manager to Sync or Connect Groups →
                                </a>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                {groups.map((group) => {
                                    const isSelected = selectedGroupIds.includes(group.id);
                                    return (
                                        <div
                                            key={group.id}
                                            onClick={() => handleToggleGroup(group.id)}
                                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                                isSelected
                                                    ? 'bg-indigo-500/15 border-indigo-500 text-slate-100 shadow-sm'
                                                    : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:border-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-7 w-7 rounded-lg bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                                                    {group.avatarUrl ? (
                                                        <img src={group.avatarUrl} alt={group.name} className="h-full w-full object-cover" />
                                                    ) : (
                                                        group.name.charAt(0)
                                                    )}
                                                </div>
                                                <div>
                                                    <h5 className="text-xs font-bold truncate max-w-[220px]">{group.name}</h5>
                                                    <span className="text-[10px] text-slate-400 capitalize flex items-center gap-1">
                                                        {group.privacy === 'PUBLIC' ? <Globe className="h-3 w-3 text-emerald-400" /> : <Shield className="h-3 w-3 text-amber-400" />}
                                                        {group.privacy.toLowerCase()} group
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={`h-5 w-5 rounded-md flex items-center justify-center border transition-all ${
                                                isSelected ? 'bg-indigo-500 border-indigo-400 text-slate-950 font-bold' : 'border-slate-600'
                                            }`}>
                                                {isSelected && <Check className="h-3.5 w-3.5" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={sharing || selectedGroupIds.length === 0 || loadingGroups}
                        className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-indigo-500 via-cyan-500 to-teal-500 hover:from-indigo-400 hover:to-teal-400 text-slate-950 shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {sharing ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Cross-Posting to Selected Groups...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Share Reel to {selectedGroupIds.length} Group(s)
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
