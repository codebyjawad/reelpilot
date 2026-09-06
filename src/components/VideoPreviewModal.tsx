import React from 'react';
import { Play, X, ExternalLink, Users, CalendarDays, Hash, Volume2, VolumeX } from 'lucide-react';
import type { ReelWithPage } from '@/lib/apiClient';
import StatusBadge from '@/components/StatusBadge';

interface VideoPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    reel: ReelWithPage | null;
}

export function resolvePlayableVideoUrl(reel: ReelWithPage | null): string | null {
    if (!reel) return null;
    if (reel.videoUrl && reel.videoUrl.startsWith('http')) {
        return reel.videoUrl;
    }
    if (reel.videoFilePath) {
        const basename = reel.videoFilePath.split(/[/\\]/).pop();
        if (basename) {
            return `/api/uploads/video/${basename}`;
        }
    }
    return null;
}

export function extractYoutubeVideoId(url: string | null): string | null {
    if (!url) return null;
    const m = url.match(
        /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
    );
    return m ? m[1] : null;
}

export const isYoutubeUrl = (url: string | null): boolean => extractYoutubeVideoId(url) !== null;

export const VideoPreviewModal: React.FC<VideoPreviewModalProps> = ({
    isOpen,
    onClose,
    reel,
}) => {
    const [muted, setMuted] = React.useState(false);

    if (!isOpen || !reel) return null;

    const videoUrl = resolvePlayableVideoUrl(reel);
    const youtubeId = extractYoutubeVideoId(videoUrl);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row text-slate-100 max-h-[90vh]">
                
                {/* Left 9:16 Vertical Video Player Container */}
                <div className="w-full md:w-80 bg-slate-950 flex flex-col items-center justify-center relative shrink-0 min-h-[380px] p-2 border-b md:border-b-0 md:border-r border-slate-800">
                    {youtubeId ? (
                        <div className="relative w-full h-full aspect-[9/16] rounded-xl overflow-hidden bg-black shadow-xl">
                            <iframe
                                src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&color=white`}
                                title={reel.title}
                                className="h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                            />
                        </div>
                    ) : videoUrl ? (
                        <div className="relative w-full h-full aspect-[9/16] rounded-xl overflow-hidden bg-black shadow-xl flex items-center justify-center">
                            <video
                                src={videoUrl}
                                controls
                                autoPlay
                                muted={muted}
                                playsInline
                                className="h-full w-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => setMuted(!muted)}
                                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 backdrop-blur text-white hover:bg-black/80 transition-all z-10"
                                title={muted ? "Unmute" : "Mute"}
                            >
                                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                            <Play className="h-12 w-12 text-slate-600 mb-2" />
                            <p className="text-xs font-semibold">No Direct Video File Source Available</p>
                            <p className="text-[11px] text-slate-500">Video source URL or local uploaded file path is required for player preview.</p>
                        </div>
                    )}
                </div>

                {/* Right Details & Metadata Panel */}
                <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto space-y-5">
                    <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">9:16 Reel Player Preview</span>
                                <h3 className="text-lg font-bold text-slate-100 leading-snug">{reel.title}</h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-200 text-xl font-bold p-1 rounded-lg hover:bg-slate-800"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                            <StatusBadge status={reel.status} />

                            <div className="flex items-center gap-1.5 rounded-full bg-slate-800/60 px-2.5 py-1 text-xs text-slate-300 border border-slate-700/50">
                                {reel.page.avatarUrl ? (
                                    <img src={reel.page.avatarUrl} alt={reel.page.name} className="h-4 w-4 rounded-full object-cover" />
                                ) : (
                                    <Users className="h-3.5 w-3.5 text-indigo-400" />
                                )}
                                <span className="font-semibold">{reel.page.name}</span>
                            </div>
                        </div>

                        {reel.caption && (
                            <div className="space-y-1 bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Caption</span>
                                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">
                                    {reel.caption}
                                </p>
                            </div>
                        )}

                        {Array.isArray(reel.hashtags) && reel.hashtags.length > 0 && (
                            <div className="space-y-1.5">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Hashtags</span>
                                <div className="flex flex-wrap gap-1.5">
                                    {reel.hashtags.map((tag, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                            #{tag.replace(/^#/, '')}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                        {reel.facebookPostUrl ? (
                            <a
                                href={reel.facebookPostUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md transition-all flex items-center justify-center gap-2"
                            >
                                <ExternalLink className="h-4 w-4" />
                                View Live Reel on Facebook
                            </a>
                        ) : (
                            <button
                                onClick={onClose}
                                className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                            >
                                Close Preview
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
