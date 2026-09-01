import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import {
    Facebook, ShieldAlert, KeyRound, X, Loader2, CheckCircle2, HelpCircle, Check,
    Trash2, Video, Download, ExternalLink, Play, Sparkles, Clock, Eye, Film
} from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageCard from '@/components/PageCard';
import EmptyState from '@/components/EmptyState';
import ConfirmDialog from '@/components/ConfirmDialog';
import { usePagesStore } from '@/store/pagesStore';
import { useToast } from '@/store/toastStore';
import { cn } from '@/lib/utils';
import api, { pagesApi, type FacebookFetchedReel, type FacebookPage } from '@/lib/apiClient';

interface PendingPage {
    fbPageId: string;
    name: string;
    avatarUrl?: string;
    permissions: string[];
}

export default function Pages() {
    const { pages, loading, fetchPages, getFacebookAuthUrl, facebookConfigured, bulkDisconnectPages } = usePagesStore();
    const { push } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    // Bulk selection state
    const [selectedPageIds, setSelectedPageIds] = useState<number[]>([]);
    const [bulkDisconnectOpen, setBulkDisconnectOpen] = useState(false);
    const [bulkDisconnecting, setBulkDisconnecting] = useState(false);

    // Fetch Reels from Page modal state
    const [fetchModalOpen, setFetchModalOpen] = useState(false);
    const [fetchPage, setFetchPage] = useState<FacebookPage | null>(null);
    const [fetchLimit, setFetchLimit] = useState<number>(10);
    const [fetchingReels, setFetchingReels] = useState(false);
    const [fetchedReels, setFetchedReels] = useState<FacebookFetchedReel[]>([]);
    const [importingReelId, setImportingReelId] = useState<string | null>(null);
    const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
    const [importingAll, setImportingAll] = useState(false);


    // Manual connect modal state
    const [showManualModal, setShowManualModal] = useState(false);
    const [manualPageId, setManualPageId] = useState('');
    const [manualToken, setManualToken] = useState('');
    const [manualPageName, setManualPageName] = useState('');
    const [manualSaving, setManualSaving] = useState(false);
    const [showTroubleshoot, setShowTroubleshoot] = useState(false);

    // OAuth Page Selection Modal state
    const [pendingPages, setPendingPages] = useState<PendingPage[]>([]);
    const [selectedFbPageIds, setSelectedFbPageIds] = useState<string[]>([]);
    const [oauthSessionId, setOauthSessionId] = useState<string | null>(null);
    const [connectingSelected, setConnectingSelected] = useState(false);

    useEffect(() => {
        fetchPages().catch(() => { });
        getFacebookAuthUrl().catch(() => { });
    }, [fetchPages, getFacebookAuthUrl]);

    // Detect OAuth Session from URL query param
    useEffect(() => {
        const sessionId = searchParams.get('oauth_session');
        if (sessionId) {
            setOauthSessionId(sessionId);
            api.get<{ pages: PendingPage[] }>(`/pages/facebook/pending?sessionId=${sessionId}`)
                .then((res: any) => {
                    const list = res?.pages ?? res?.data?.pages ?? [];
                    if (list.length > 0) {
                        setPendingPages(list);
                        // Default to selecting all, or let user pick
                        setSelectedFbPageIds(list.map((p: PendingPage) => p.fbPageId));
                    }
                })
                .catch((err) => {
                    console.error('Failed to load pending pages', err);
                    push({
                        title: 'Session expired',
                        description: 'Facebook login session expired. Please connect again.',
                        variant: 'error',
                    });
                    searchParams.delete('oauth_session');
                    setSearchParams(searchParams);
                });
        }

        const errParam = searchParams.get('error');
        if (errParam) {
            push({
                title: 'Facebook connection notice',
                description: errParam === 'no_pages_found'
                    ? 'No Facebook Pages found. Make sure your account has admin access to the page.'
                    : decodeURIComponent(errParam),
                variant: 'error',
            });
            searchParams.delete('error');
            setSearchParams(searchParams);
        }
    }, [searchParams, setSearchParams, push]);

    const handleConnect = async () => {
        try {
            const authUrl = await getFacebookAuthUrl();
            const configured = usePagesStore.getState().facebookConfigured;
            if (configured && authUrl) {
                window.location.href = authUrl;
                return;
            }
            push({
                title: 'Facebook App credentials required',
                description: 'Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in the .env file to enable real Facebook Page OAuth.',
                variant: 'error',
            });
        } catch (err) {
            push({
                title: 'Facebook connection unavailable',
                description: err instanceof Error ? err.message : 'Unable to get authorization URL',
                variant: 'error',
            });
        }
    };

    const togglePageSelection = (fbPageId: string) => {
        if (selectedFbPageIds.includes(fbPageId)) {
            setSelectedFbPageIds(selectedFbPageIds.filter((id) => id !== fbPageId));
        } else {
            setSelectedFbPageIds([...selectedFbPageIds, fbPageId]);
        }
    };

    const selectAllPages = () => {
        setSelectedFbPageIds(pendingPages.map((p) => p.fbPageId));
    };

    const deselectAllPages = () => {
        setSelectedFbPageIds([]);
    };

    const handleConfirmSelection = async () => {
        if (!oauthSessionId || selectedFbPageIds.length === 0) {
            push({
                title: 'No pages selected',
                description: 'Please check at least one page to connect.',
                variant: 'error',
            });
            return;
        }

        setConnectingSelected(true);
        try {
            const res: any = await api.post('/pages/facebook/connect-selected', {
                sessionId: oauthSessionId,
                selectedFbPageIds,
            });
            const count = res?.count ?? res?.data?.count ?? selectedFbPageIds.length;
            push({
                title: 'Pages connected successfully',
                description: `Connected ${count} Facebook page(s).`,
                variant: 'success',
            });
            setPendingPages([]);
            setOauthSessionId(null);
            searchParams.delete('oauth_session');
            setSearchParams(searchParams);
            await fetchPages();
        } catch (err: any) {
            push({
                title: 'Failed to connect selected pages',
                description: err?.response?.data?.error || err?.message || 'Please try again',
                variant: 'error',
            });
        } finally {
            setConnectingSelected(false);
        }
    };

    const cancelSelection = () => {
        setPendingPages([]);
        setOauthSessionId(null);
        searchParams.delete('oauth_session');
        setSearchParams(searchParams);
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualPageId.trim() || !manualToken.trim()) {
            push({
                title: 'Required fields missing',
                description: 'Please provide both the Facebook Page ID and Page Access Token.',
                variant: 'error',
            });
            return;
        }

        setManualSaving(true);
        try {
            await api.post('/pages/manual', {
                fbPageId: manualPageId.trim(),
                accessToken: manualToken.trim(),
                name: manualPageName.trim() || undefined,
            });
            push({
                title: 'Page connected successfully',
                description: 'Your Facebook Page token has been updated.',
                variant: 'success',
            });
            setShowManualModal(false);
            setManualPageId('');
            setManualToken('');
            setManualPageName('');
            await fetchPages();
        } catch (err: any) {
            push({
                title: 'Failed to connect page',
                description: err?.response?.data?.error || err?.message || 'Could not verify token with Facebook.',
                variant: 'error',
            });
        } finally {
            setManualSaving(false);
        }
    };

    const handleOpenFetchModal = (page?: FacebookPage) => {

        const target = page || pages[0] || null;
        setFetchPage(target);
        setFetchedReels([]);
        setImportedIds(new Set());
        setFetchModalOpen(true);
        if (target) {
            triggerFetchReels(target.id, fetchLimit);
        }
    };

    const triggerFetchReels = async (pageId: number, limit: number) => {
        setFetchingReels(true);
        try {
            const res = await pagesApi.fetchReels(pageId, limit);
            const list = res?.reels || [];
            setFetchedReels(list);
            if (list.length === 0) {
                push({
                    title: 'No reels found',
                    description: `No published reels or videos found for this Facebook page with limit=${limit}.`,
                    variant: 'info',
                });
            } else {
                push({
                    title: 'Reels fetched!',
                    description: `Successfully retrieved ${list.length} reel(s) from Facebook.`,
                    variant: 'success',
                });
            }
        } catch (err: any) {
            push({
                title: 'Failed to fetch reels',
                description: err?.response?.data?.error || err?.message || 'Error fetching page reels',
                variant: 'error',
            });
        } finally {
            setFetchingReels(false);
        }
    };

    const handleImportReel = async (reel: FacebookFetchedReel) => {
        if (!fetchPage) return;
        setImportingReelId(reel.id);
        try {
            await pagesApi.importReel(fetchPage.id, reel);
            setImportedIds((prev) => new Set(prev).add(reel.id));
            push({
                title: 'Reel imported as draft!',
                description: `"${reel.title}" has been added to your Reels drafts.`,
                variant: 'success',
            });
        } catch (err: any) {
            push({
                title: 'Import failed',
                description: err?.response?.data?.error || err?.message || 'Could not import reel',
                variant: 'error',
            });
        } finally {
            setImportingReelId(null);
        }
    };

    const handleImportAll = async () => {
        if (!fetchPage || fetchedReels.length === 0) return;
        setImportingAll(true);
        let count = 0;
        try {
            for (const r of fetchedReels) {
                if (!importedIds.has(r.id)) {
                    await pagesApi.importReel(fetchPage.id, r);
                    setImportedIds((prev) => new Set(prev).add(r.id));
                    count++;
                }
            }
            push({
                title: 'All reels imported!',
                description: `Successfully imported ${count} reels to your Reel drafts.`,
                variant: 'success',
            });
        } catch (err: any) {
            push({
                title: 'Import error',
                description: err?.message || 'Failed during bulk import',
                variant: 'error',
            });
        } finally {
            setImportingAll(false);
        }
    };

    return (
        <AppLayout>
            <div className="animate-fade-in pb-20 lg:pb-6">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="section-title">Facebook Pages</h1>
                        <p className="section-subtitle">Manage pages connected for Reels and AI publishing</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                            className="btn-ghost flex items-center gap-1.5 text-xs text-slate-400"
                        >
                            <HelpCircle className="h-4 w-4" />
                            OAuth Help
                        </button>
                        <button
                            type="button"
                            onClick={() => handleOpenFetchModal()}
                            disabled={pages.length === 0}
                            className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                        >
                            <Video className="h-4 w-4" />
                            Fetch Page Reels
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowManualModal(true)}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition-colors"
                        >
                            <KeyRound className="h-4 w-4 text-cyan-400" />
                            Connect via Page Token
                        </button>
                        <button onClick={handleConnect} disabled={loading} className="btn-primary">
                            <Facebook className="h-4 w-4" />
                            Connect via Facebook Login
                        </button>
                    </div>
                </div>


                {/* OAuth Unavailable Troubleshooter banner */}
                {showTroubleshoot && (
                    <div className="card p-5 mb-6 border-cyan-500/30 bg-cyan-950/20 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-cyan-300 flex items-center gap-2">
                                🛠️ Fixing "Facebook Login is currently unavailable for this app"
                            </h3>
                            <button onClick={() => setShowTroubleshoot(false)} className="text-slate-400 hover:text-slate-200">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                            <p>This message is shown by Facebook when your Meta Developer App is in <strong>Development Mode</strong> or lacks permissions:</p>
                            <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1">
                                <li><strong>Option A (Instant Bypass):</strong> Click <strong>"Connect via Page Token"</strong> above and paste a Page Access Token directly from <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Meta Graph API Explorer</a>. No review required!</li>
                                <li><strong>Option B (Add App Role):</strong> Go to <a href="https://developers.facebook.com/apps/" target="_blank" rel="noreferrer" className="text-cyan-400 underline">Meta for Developers</a> ➔ Your App ➔ <strong>App Roles</strong> ➔ Add your Facebook account as <em>Tester</em> or <em>Developer</em>.</li>
                                <li><strong>Option C (Set to Live):</strong> Switch your Meta App from <em>Development</em> to <em>Live Mode</em> in the top navigation bar.</li>
                            </ol>
                        </div>
                    </div>
                )}

                {!facebookConfigured && (
                    <div className="card p-5 mb-6 border-accent-400/20 bg-accent-400/5">
                        <div className="flex gap-4">
                            <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-400/15 text-accent-400">
                                <ShieldAlert className="h-5 w-5" />
                            </div>
                            <div className="flex-1 text-sm">
                                <h3 className="font-semibold text-slate-100">Facebook App credentials required</h3>
                                <p className="mt-2 text-slate-400 leading-relaxed">
                                    Create a Meta For Developers app, then set <code className="font-mono">FACEBOOK_APP_ID</code>, <code className="font-mono">FACEBOOK_APP_SECRET</code>, and ensure <code className="font-mono">FACEBOOK_CALLBACK_URL</code> matches the value in your app dashboard OAuth settings.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {pages.length === 0 ? (
                    <EmptyState
                        icon={<Facebook className="h-12 w-12" />}
                        title="No pages connected"
                        description="Connect a Facebook Page to start publishing Reels & AI Posts automatically."
                        ctaText="Connect Facebook Page"
                        onCta={handleConnect}
                    />
                ) : (
                    <div className="space-y-4">
                        {/* Bulk Action Controls Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedPageIds.length === pages.length) {
                                            setSelectedPageIds([]);
                                        } else {
                                            setSelectedPageIds(pages.map((p) => p.id));
                                        }
                                    }}
                                    className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-slate-100"
                                >
                                    <div className={cn(
                                        'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                                        selectedPageIds.length === pages.length && pages.length > 0
                                            ? 'bg-blue-500 border-blue-500 text-white'
                                            : selectedPageIds.length > 0
                                            ? 'bg-blue-500/50 border-blue-500 text-white'
                                            : 'border-slate-600 bg-slate-800'
                                    )}>
                                        {selectedPageIds.length > 0 && <Check className="h-3 w-3 stroke-[3]" />}
                                    </div>
                                    <span>
                                        {selectedPageIds.length > 0
                                            ? `${selectedPageIds.length} of ${pages.length} selected`
                                            : `Select All Pages (${pages.length})`}
                                    </span>
                                </button>
                            </div>

                            {selectedPageIds.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setBulkDisconnectOpen(true)}
                                    disabled={bulkDisconnecting}
                                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 transition-all animate-fade-in"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Remove Selected ({selectedPageIds.length})
                                </button>
                            )}
                        </div>

                        {/* Page Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {pages.map((page) => (
                                <PageCard
                                    key={page.id}
                                    page={page}
                                    selected={selectedPageIds.includes(page.id)}
                                    onToggleSelect={() => {
                                        if (selectedPageIds.includes(page.id)) {
                                            setSelectedPageIds(selectedPageIds.filter((id) => id !== page.id));
                                        } else {
                                            setSelectedPageIds([...selectedPageIds, page.id]);
                                        }
                                    }}
                                    onFetchReels={(p) => handleOpenFetchModal(p)}
                                />

                            ))}
                        </div>
                    </div>
                )}

                {/* Manual Token Connect Modal */}
                {showManualModal && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <KeyRound className="h-5 w-5 text-cyan-400" />
                                    <h3 className="text-lg font-bold text-slate-100">Connect via Page Access Token</h3>
                                </div>
                                <button
                                    onClick={() => setShowManualModal(false)}
                                    className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <form onSubmit={handleManualSubmit} className="space-y-4">
                                <p className="text-xs text-slate-400">
                                    Directly paste your Page ID and Page Access Token from{' '}
                                    <a
                                        href="https://developers.facebook.com/tools/explorer/"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-cyan-400 underline font-medium"
                                    >
                                        Meta Graph API Explorer ↗
                                    </a>
                                    . Existing videos & reels are 100% preserved.
                                </p>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                        Facebook Page ID *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 1282574044938875"
                                        value={manualPageId}
                                        onChange={(e) => setManualPageId(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm font-mono focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                        Page Access Token *
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="EAA..."
                                        value={manualToken}
                                        onChange={(e) => setManualToken(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-xs font-mono focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                        Page Name <span className="text-slate-600 normal-case font-normal">(optional — auto-detected if blank)</span>
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Viral Videos"
                                        value={manualPageName}
                                        onChange={(e) => setManualPageName(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-sm focus:outline-none focus:border-cyan-500"
                                    />
                                </div>

                                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                    <button
                                        type="button"
                                        onClick={() => setShowManualModal(false)}
                                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={manualSaving}
                                        className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                                    >
                                        {manualSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                        Save & Connect Page
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}

                {/* OAuth Page Selection Modal */}
                {pendingPages.length > 0 && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-5 animate-scale-in">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                        <Facebook className="h-5 w-5 text-blue-400" />
                                        Select Pages to Connect
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Found {pendingPages.length} Facebook Page{pendingPages.length > 1 ? 's' : ''}. Choose which one(s) you want to manage in ReelPilot.
                                    </p>
                                </div>
                                <button
                                    onClick={cancelSelection}
                                    className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Select / Deselect All Controls */}
                            <div className="flex items-center justify-between bg-slate-800/50 p-2.5 rounded-lg border border-slate-750 text-xs">
                                <span className="text-slate-400 font-medium">
                                    {selectedFbPageIds.length} of {pendingPages.length} selected
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={selectAllPages}
                                        className="text-blue-400 hover:text-blue-300 font-semibold px-2 py-0.5 rounded hover:bg-blue-500/10"
                                    >
                                        Select All
                                    </button>
                                    <span className="text-slate-600">|</span>
                                    <button
                                        type="button"
                                        onClick={deselectAllPages}
                                        className="text-slate-400 hover:text-slate-200 font-semibold px-2 py-0.5 rounded hover:bg-slate-700/50"
                                    >
                                        Deselect All
                                    </button>
                                </div>
                            </div>

                            {/* Pages List */}
                            <div className="max-h-64 overflow-y-auto space-y-2.5 pr-1">
                                {pendingPages.map((p) => {
                                    const isSelected = selectedFbPageIds.includes(p.fbPageId);
                                    return (
                                        <div
                                            key={p.fbPageId}
                                            onClick={() => togglePageSelection(p.fbPageId)}
                                            className={cn(
                                                'flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all',
                                                isSelected
                                                    ? 'bg-blue-600/10 border-blue-500/60 shadow-sm'
                                                    : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                {p.avatarUrl ? (
                                                    <img
                                                        src={p.avatarUrl}
                                                        alt={p.name}
                                                        className="h-10 w-10 rounded-full object-cover border border-slate-700"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                                                        {p.name.charAt(0)}
                                                    </div>
                                                )}
                                                <div>
                                                    <h4 className="text-sm font-semibold text-slate-100">{p.name}</h4>
                                                    <p className="text-[11px] font-mono text-slate-400">ID: {p.fbPageId}</p>
                                                </div>
                                            </div>

                                            <div
                                                className={cn(
                                                    'h-5 w-5 rounded-md border flex items-center justify-center transition-colors',
                                                    isSelected
                                                        ? 'bg-blue-500 border-blue-500 text-white'
                                                        : 'border-slate-600 bg-slate-800'
                                                )}
                                            >
                                                {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={cancelSelection}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmSelection}
                                    disabled={connectingSelected || selectedFbPageIds.length === 0}
                                    className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 disabled:opacity-50"
                                >
                                    {connectingSelected ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                    )}
                                    Connect Selected ({selectedFbPageIds.length})
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Bulk Disconnect Confirmation Dialog */}
                <ConfirmDialog
                    open={bulkDisconnectOpen}
                    title={`Disconnect ${selectedPageIds.length} Facebook Page${selectedPageIds.length > 1 ? 's' : ''}`}
                    description={`Are you sure you want to disconnect ${selectedPageIds.length} page(s)? All scheduled posts and reels for these pages will be removed.`}
                    confirmText={`Disconnect ${selectedPageIds.length} Page${selectedPageIds.length > 1 ? 's' : ''}`}
                    confirmVariant="danger"
                    onConfirm={async () => {
                        setBulkDisconnecting(true);
                        try {
                            const count = await bulkDisconnectPages(selectedPageIds);
                            push({
                                title: 'Pages disconnected',
                                description: `Successfully removed ${count} Facebook page(s).`,
                                variant: 'success',
                            });
                            setSelectedPageIds([]);
                        } catch (err: any) {
                            push({
                                title: 'Failed to disconnect pages',
                                description: err?.message || 'Please try again',
                                variant: 'error',
                            });
                        } finally {
                            setBulkDisconnecting(false);
                            setBulkDisconnectOpen(false);
                        }
                    }}
                    onCancel={() => setBulkDisconnectOpen(false)}
                />

                {/* Fetch Reels from Page Modal */}
                {fetchModalOpen && createPortal(
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in overflow-y-auto">
                        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-slate-800 p-5 shrink-0 bg-slate-900/90">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                                        <Film className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                                            Fetch Facebook Reels
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Retrieve published Reels and videos from your connected Facebook Page.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFetchModalOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Control Bar: Page & Limit */}
                            <div className="p-5 border-b border-slate-800 bg-slate-900/40 shrink-0 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                    {/* Page Select */}
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                            Select Page
                                        </label>
                                        <select
                                            value={fetchPage?.id || 0}
                                            onChange={(e) => {
                                                const selected = pages.find((p) => p.id === Number(e.target.value)) || null;
                                                setFetchPage(selected);
                                            }}
                                            className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-500 text-slate-200"
                                        >
                                            {pages.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Number of Reels (N Limit) */}
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                Number of Reels (N)
                                            </label>
                                            <span className="text-[11px] text-blue-400 font-mono">Limit: {fetchLimit}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={fetchLimit}
                                                onChange={(e) => setFetchLimit(Math.max(1, Math.min(100, Number(e.target.value) || 10)))}
                                                className="w-24 bg-slate-800 border border-slate-700 rounded-lg p-2 text-sm text-center font-bold text-slate-100 focus:outline-none focus:border-blue-500"
                                            />
                                            <div className="flex items-center gap-1">
                                                {[5, 10, 25, 50].map((num) => (
                                                    <button
                                                        key={num}
                                                        type="button"
                                                        onClick={() => setFetchLimit(num)}
                                                        className={cn(
                                                            'px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                                                            fetchLimit === num
                                                                ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                                                                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                                                        )}
                                                    >
                                                        {num}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fetch Button */}
                                    <div>
                                        <button
                                            type="button"
                                            onClick={() => fetchPage && triggerFetchReels(fetchPage.id, fetchLimit)}
                                            disabled={fetchingReels || !fetchPage}
                                            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                                        >
                                            {fetchingReels ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Fetching from Facebook...
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="h-4 w-4" />
                                                    Fetch {fetchLimit} Reels
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Results Content Area */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {fetchingReels ? (
                                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                                        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                                        <p className="text-sm font-semibold text-slate-200">Connecting to Facebook Graph API...</p>
                                        <p className="text-xs text-slate-500">Retrieving published reels, video streams, thumbnails, and descriptions.</p>
                                    </div>
                                ) : fetchedReels.length === 0 ? (
                                    <div className="py-16 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                                        <Video className="h-10 w-10 text-slate-600 mx-auto" />
                                        <p className="text-sm font-medium text-slate-300">No reels fetched yet</p>
                                        <p className="text-xs text-slate-500 max-w-sm mx-auto">
                                            Select a page, choose how many reels (N) to fetch, and click the Fetch button.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {/* Result Header & Bulk Import */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-300">
                                                    Found {fetchedReels.length} Reel{fetchedReels.length > 1 ? 's' : ''} on {fetchPage?.name}
                                                </span>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                                    Live Data
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={handleImportAll}
                                                disabled={importingAll || fetchedReels.every((r) => importedIds.has(r.id))}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition-all disabled:opacity-50"
                                            >
                                                {importingAll ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Download className="h-3.5 w-3.5" />
                                                )}
                                                {fetchedReels.every((r) => importedIds.has(r.id))
                                                    ? '✓ All Imported'
                                                    : `Import All (${fetchedReels.length}) as Drafts`}
                                            </button>
                                        </div>

                                        {/* Reels Grid */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                            {fetchedReels.map((reel) => {
                                                const isImported = importedIds.has(reel.id);
                                                const isImporting = importingReelId === reel.id;

                                                return (
                                                    <div
                                                        key={reel.id}
                                                        className="bg-slate-800/60 border border-slate-700/80 rounded-xl overflow-hidden shadow-md hover:border-slate-600 transition-all flex flex-col justify-between group"
                                                    >
                                                        <div>
                                                            {/* Thumbnail / Video Preview */}
                                                            <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
                                                                {reel.thumbnailUrl ? (
                                                                    <img
                                                                        src={reel.thumbnailUrl}
                                                                        alt={reel.title}
                                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                                    />
                                                                ) : (
                                                                    <div className="text-slate-600 flex flex-col items-center">
                                                                        <Video className="h-8 w-8 mb-1 opacity-50" />
                                                                        <span className="text-[10px]">No Thumbnail</span>
                                                                    </div>
                                                                )}

                                                                {/* Length & Type Badges */}
                                                                <div className="absolute top-2 left-2 flex items-center gap-1">
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-slate-200 backdrop-blur-sm uppercase">
                                                                        {reel.postType}
                                                                    </span>
                                                                </div>

                                                                {reel.length && (
                                                                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-black/80 text-white backdrop-blur-sm flex items-center gap-1">
                                                                        <Clock className="h-2.5 w-2.5" />
                                                                        {Math.floor(reel.length / 60)}:{(reel.length % 60).toString().padStart(2, '0')}
                                                                    </div>
                                                                )}

                                                                {reel.permalinkUrl && (
                                                                    <a
                                                                        href={reel.permalinkUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white gap-1 text-xs font-semibold"
                                                                    >
                                                                        <ExternalLink className="h-4 w-4" />
                                                                        View on FB
                                                                    </a>
                                                                )}
                                                            </div>

                                                            {/* Content */}
                                                            <div className="p-3 space-y-1.5">
                                                                <h4 className="text-xs font-bold text-slate-100 line-clamp-1" title={reel.title}>
                                                                    {reel.title || 'Untitled Reel'}
                                                                </h4>
                                                                {reel.description && (
                                                                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed" title={reel.description}>
                                                                        {reel.description}
                                                                    </p>
                                                                )}
                                                                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                                                                    <span>{new Date(reel.createdTime).toLocaleDateString()}</span>
                                                                    {reel.views !== null && reel.views !== undefined && (
                                                                        <span className="flex items-center gap-0.5 text-blue-400">
                                                                            <Eye className="h-3 w-3" /> {reel.views} views
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="p-3 pt-0 border-t border-slate-700/50 mt-2 flex items-center justify-between gap-2">
                                                            {reel.permalinkUrl && (
                                                                <a
                                                                    href={reel.permalinkUrl}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-[11px] text-slate-400 hover:text-blue-400 flex items-center gap-1 font-medium transition-colors"
                                                                >
                                                                    <ExternalLink className="h-3 w-3" />
                                                                    Watch
                                                                </a>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={() => handleImportReel(reel)}
                                                                disabled={isImported || isImporting}
                                                                className={cn(
                                                                    'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all',
                                                                    isImported
                                                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                                                                        : 'bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30'
                                                                )}
                                                            >
                                                                {isImporting ? (
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                ) : isImported ? (
                                                                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                                                ) : (
                                                                    <Download className="h-3 w-3" />
                                                                )}
                                                                {isImported ? 'Imported' : 'Import Draft'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
                                <span className="text-xs text-slate-500">
                                    Imported reels are added as drafts under the Reels tab.
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setFetchModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </AppLayout>
    );
}
