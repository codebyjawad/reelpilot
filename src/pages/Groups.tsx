import React, { useEffect, useState } from 'react';
import { Users, Plus, Trash2, ExternalLink, Loader2, Globe, Shield, Send, Flame, RefreshCw, History, CheckCircle2, Pencil } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import { AiGroupFinderModal } from '@/components/AiGroupFinderModal';
import { groupsApi, type FacebookGroup, type GroupActivityLog } from '@/lib/apiClient';
import { useToast } from '@/store/toastStore';

export default function Groups() {
    const { push } = useToast();
    const [groups, setGroups] = useState<FacebookGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    // Connect Group Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [finderModalOpen, setFinderModalOpen] = useState(false);
    const [fbGroupId, setFbGroupId] = useState('');
    const [groupName, setGroupName] = useState('');
    const [privacy, setPrivacy] = useState('PUBLIC');
    const [submitting, setSubmitting] = useState(false);

    // Edit Group Modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<FacebookGroup | null>(null);
    const [editName, setEditName] = useState('');
    const [editPrivacy, setEditPrivacy] = useState('PUBLIC');
    const [editFbGroupId, setEditFbGroupId] = useState('');
    const [updating, setUpdating] = useState(false);

    // Direct Group Post state
    const [postModalOpen, setPostModalOpen] = useState(false);
    const [targetGroup, setTargetGroup] = useState<FacebookGroup | null>(null);
    const [postTitle, setPostTitle] = useState('');
    const [postVideoUrl, setPostVideoUrl] = useState('');
    const [postDescription, setPostDescription] = useState('');
    const [posting, setPosting] = useState(false);
    const [activityLogs, setActivityLogs] = useState<GroupActivityLog[]>([]);

    const loadGroups = async () => {
        try {
            const data = await groupsApi.getGroups();
            if (Array.isArray(data) && data.length > 0) {
                setGroups(data);
            } else {
                // If local database has 0 groups, auto-trigger Graph API sync from connected pages
                const synced = await groupsApi.syncGroups().catch(() => []);
                setGroups(synced || []);
            }
            const logs = await groupsApi.getActivityLogs().catch(() => []);
            setActivityLogs(logs || []);
        } catch (_err) {
            push({ title: 'Failed to load Facebook Groups', variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSyncGroups = async () => {
        setSyncing(true);
        try {
            const synced = await groupsApi.syncGroups();
            setGroups(synced || []);
            push({
                title: '🔄 Facebook Groups Synced!',
                description: `Discovered and connected ${synced.length} Facebook Groups via connected Pages.`,
                variant: 'success',
            });
        } catch (err: any) {
            push({ title: 'Group Sync Failed', description: err.message || 'Make sure your Facebook Page is connected.', variant: 'error' });
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        loadGroups();
    }, []);

    const handleConnectGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fbGroupId.trim()) return;

        setSubmitting(true);
        try {
            await groupsApi.connectGroup({
                fbGroupId: fbGroupId.trim(),
                name: groupName.trim() || undefined,
                privacy,
            });
            push({ title: 'Facebook Group connected!', variant: 'success' });
            setModalOpen(false);
            setFbGroupId('');
            setGroupName('');
            loadGroups();
        } catch (err: any) {
            push({ title: 'Connection failed', description: err.message, variant: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenEditModal = (group: FacebookGroup) => {
        setEditingGroup(group);
        setEditName(group.name);
        setEditPrivacy(group.privacy || 'PUBLIC');
        setEditFbGroupId(group.fbGroupId);
        setEditModalOpen(true);
    };

    const handleUpdateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingGroup) return;

        setUpdating(true);
        try {
            const updated = await groupsApi.updateGroup(editingGroup.id, {
                name: editName.trim(),
                privacy: editPrivacy,
                fbGroupId: editFbGroupId.trim(),
            });
            setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
            push({ title: 'Facebook Group updated!', variant: 'success' });
            setEditModalOpen(false);
            setEditingGroup(null);
        } catch (err: any) {
            push({ title: 'Failed to update group', description: err.message, variant: 'error' });
        } finally {
            setUpdating(false);
        }
    };

    const handleDeleteGroup = async (id: number) => {
        try {
            await groupsApi.deleteGroup(id);
            setGroups((prev) => prev.filter((g) => g.id !== id));
            push({ title: 'Facebook Group disconnected', variant: 'info' });
        } catch (_err) {
            push({ title: 'Failed to disconnect group', variant: 'error' });
        }
    };

    const handlePublishToGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetGroup || !postVideoUrl.trim() || !postTitle.trim()) return;

        setPosting(true);
        try {
            await groupsApi.publishToGroup(targetGroup.id, {
                videoUrl: postVideoUrl.trim(),
                title: postTitle.trim(),
                description: postDescription.trim() || undefined,
            });
            push({ title: `Published Reel to ${targetGroup.name}!`, variant: 'success' });
            setPostModalOpen(false);
            setPostVideoUrl('');
            setPostTitle('');
            setPostDescription('');
        } catch (err: any) {
            push({ title: 'Group Post Failed', description: err.message, variant: 'error' });
        } finally {
            setPosting(false);
        }
    };

    return (
        <AppLayout>
            <div className="animate-fade-in space-y-6 pb-12">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="section-title flex items-center gap-2">
                            <Users className="h-6 w-6 text-indigo-400" />
                            Facebook Groups Manager
                        </h1>
                        <p className="section-subtitle">
                            Connect Facebook Groups and cross-post viral Reels directly to group audiences
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={handleSyncGroups}
                            disabled={syncing}
                            className="px-3.5 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition-all disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 text-cyan-400 ${syncing ? 'animate-spin' : ''}`} />
                            <span>{syncing ? 'Syncing...' : 'Sync Joined Groups'}</span>
                        </button>
                        <button
                            onClick={() => setFinderModalOpen(true)}
                            className="px-4 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-slate-950 shadow-md transition-all flex items-center gap-1.5"
                        >
                            <Flame className="h-4 w-4" />
                            ⚡ AI Find High-Traffic Groups
                        </button>
                        <button
                            onClick={() => setModalOpen(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            Connect Group
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="card p-5 space-y-3">
                                <div className="shimmer-bg h-10 w-10 rounded-full" />
                                <div className="shimmer-bg h-4 w-32" />
                            </div>
                        ))}
                    </div>
                ) : groups.length === 0 ? (
                    <div className="card p-12 text-center space-y-4 max-w-lg mx-auto border-dashed border-slate-700">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                            <Users className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-100">No Facebook Groups Displayed Yet</h3>
                            <p className="text-xs text-slate-400 mt-1">
                                Click Sync Joined Groups to automatically pull your managed Facebook Groups, or paste any Group ID / URL manually.
                            </p>
                        </div>
                        <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                                onClick={handleSyncGroups}
                                disabled={syncing}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 flex items-center gap-2"
                            >
                                <RefreshCw className={`h-4 w-4 text-cyan-400 ${syncing ? 'animate-spin' : ''}`} />
                                {syncing ? 'Syncing...' : 'Sync Joined Groups'}
                            </button>
                            <button
                                onClick={() => setModalOpen(true)}
                                className="btn-primary text-xs !py-2.5 flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Connect Group ID/URL
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groups.map((group) => (
                            <div key={group.id} className="card p-5 flex flex-col justify-between space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
                                            {group.avatarUrl ? (
                                                <img src={group.avatarUrl} alt={group.name} className="h-full w-full object-cover" />
                                            ) : (
                                                group.name.charAt(0)
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-100 text-sm truncate">{group.name}</h3>
                                            <p className="text-[11px] text-slate-400 font-mono">ID: {group.fbGroupId}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleOpenEditModal(group)}
                                            className="text-slate-500 hover:text-indigo-400 transition-colors p-1"
                                            title="Edit Group"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteGroup(group.id)}
                                            className="text-slate-500 hover:text-red-400 transition-colors p-1"
                                            title="Disconnect Group"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-800">
                                    <span className="flex items-center gap-1.5 text-slate-300">
                                        {group.privacy === 'PUBLIC' ? <Globe className="h-3.5 w-3.5 text-emerald-400" /> : <Shield className="h-3.5 w-3.5 text-amber-400" />}
                                        <span className="capitalize">{group.privacy.toLowerCase()} Group</span>
                                    </span>
                                    <a
                                        href={`https://www.facebook.com/groups/${group.fbGroupId}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-slate-400 hover:text-indigo-400 flex items-center gap-1 font-semibold"
                                    >
                                        Visit Group <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>

                                <button
                                    onClick={() => {
                                        setTargetGroup(group);
                                        setPostModalOpen(true);
                                    }}
                                    className="w-full btn-secondary text-xs !py-2 flex items-center justify-center gap-2"
                                >
                                    <Send className="h-3.5 w-3.5 text-indigo-400" />
                                    Publish Reel to Group
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Recent Group Cross-Posts & Activity Log Section */}
                <div className="card p-6 space-y-4 border border-slate-800 bg-slate-900/60">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2">
                            <History className="h-5 w-5 text-indigo-400" />
                            <h3 className="font-bold text-slate-100 text-base">Recent Group Shared Reels & Activity</h3>
                        </div>
                        <span className="text-xs text-slate-400 font-medium">
                            {activityLogs.length} total shared activity record(s)
                        </span>
                    </div>

                    {activityLogs.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 space-y-1">
                            <p>No Reels shared to Facebook Groups yet.</p>
                            <p className="text-slate-600">Click "Publish Reel to Group" above or use the Share icon on any Reel card to cross-post.</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                            {activityLogs.map((log) => (
                                <div
                                    key={log.id}
                                    className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-bold text-slate-200 truncate">{log.title}</h4>
                                            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                <span>Shared to <strong className="text-slate-300">{log.groupName}</strong></span>
                                                <span>•</span>
                                                <span>{new Date(log.sharedAt).toLocaleString()}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                            log.status === 'published'
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                        }`}>
                                            {log.status === 'published' ? 'Graph API Shared' : 'Web Share Dialog'}
                                        </span>

                                        <a
                                            href={log.postUrl || `https://www.facebook.com/groups/${log.fbGroupId}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 flex items-center gap-1 transition-all"
                                        >
                                            View on Facebook <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Connect Group Modal */}
                {modalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 text-slate-100 animate-fade-in">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Users className="h-5 w-5 text-indigo-400" />
                                    Connect Facebook Group
                                </h3>
                                <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
                            </div>

                             <form onSubmit={handleConnectGroup} className="space-y-4">
                                <div>
                                    <label className="form-label">Facebook Group ID or Full URL *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. https://www.facebook.com/groups/1234567890/"
                                        value={fbGroupId}
                                        onChange={(e) => setFbGroupId(e.target.value)}
                                        className="input-field"
                                    />
                                    <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                                        <span>⚡ ReelPilot will auto-fetch the Group Name, Cover Avatar, and Privacy settings from Facebook!</span>
                                    </p>
                                </div>

                                <div>
                                    <label className="form-label">Custom Group Name Alias (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Leave blank to auto-fetch official Facebook name"
                                        value={groupName}
                                        onChange={(e) => setGroupName(e.target.value)}
                                        className="input-field"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting || !fbGroupId.trim()}
                                    className="w-full btn-primary text-sm !py-2.5 flex items-center justify-center gap-2"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Auto-Fetching Group Info...
                                        </>
                                    ) : (
                                        'Connect & Auto-Fetch Group'
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit Group Modal */}
                {editModalOpen && editingGroup && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 text-slate-100 animate-fade-in">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Pencil className="h-5 w-5 text-indigo-400" />
                                    Edit Facebook Group
                                </h3>
                                <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
                            </div>

                            <form onSubmit={handleUpdateGroup} className="space-y-4">
                                <div>
                                    <label className="form-label">Group Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="input-field"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Facebook Group ID or URL Slug *</label>
                                    <input
                                        type="text"
                                        required
                                        value={editFbGroupId}
                                        onChange={(e) => setEditFbGroupId(e.target.value)}
                                        className="input-field"
                                    />
                                    <p className="text-[11px] text-slate-500 mt-1">Facebook Group ID or URL handle</p>
                                </div>

                                <div>
                                    <label className="form-label">Privacy Setting</label>
                                    <select
                                        value={editPrivacy}
                                        onChange={(e) => setEditPrivacy(e.target.value)}
                                        className="input-field"
                                    >
                                        <option value="PUBLIC">Public Group</option>
                                        <option value="CLOSED">Private Group</option>
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={updating || !editName.trim() || !editFbGroupId.trim()}
                                    className="w-full btn-primary text-sm !py-2.5 flex items-center justify-center gap-2"
                                >
                                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Publish to Group Modal */}
                {postModalOpen && targetGroup && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 text-slate-100 animate-fade-in">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <h3 className="font-bold text-lg flex items-center gap-2">
                                    <Send className="h-5 w-5 text-indigo-400" />
                                    Publish Reel to {targetGroup.name}
                                </h3>
                                <button onClick={() => setPostModalOpen(false)} className="text-slate-400 hover:text-slate-200">✕</button>
                            </div>

                            <form onSubmit={handlePublishToGroup} className="space-y-4">
                                <div>
                                    <label className="form-label">Video URL *</label>
                                    <input
                                        type="url"
                                        required
                                        placeholder="https://..."
                                        value={postVideoUrl}
                                        onChange={(e) => setPostVideoUrl(e.target.value)}
                                        className="input-field"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Reel Title *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Catchy video title"
                                        value={postTitle}
                                        onChange={(e) => setPostTitle(e.target.value)}
                                        className="input-field"
                                    />
                                </div>

                                <div>
                                    <label className="form-label">Description / Post Text</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Post description and hashtags..."
                                        value={postDescription}
                                        onChange={(e) => setPostDescription(e.target.value)}
                                        className="input-field"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={posting || !postVideoUrl.trim() || !postTitle.trim()}
                                    className="w-full btn-primary text-sm !py-2.5 flex items-center justify-center gap-2"
                                >
                                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publish to Group Now'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                <AiGroupFinderModal
                    isOpen={finderModalOpen}
                    onClose={() => setFinderModalOpen(false)}
                />
            </div>
        </AppLayout>
    );
}
