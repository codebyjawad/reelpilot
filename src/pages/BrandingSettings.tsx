import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { ShieldCheck, Plus, Trash2, Image as ImageIcon, Sliders, Check } from 'lucide-react';
import { useToast } from '@/store/toastStore';
import { api } from '@/lib/apiClient';

export default function BrandingSettings() {
    const { push } = useToast();
    const [presets, setPresets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState('Official Brand Preset');
    const [logoUrl, setLogoUrl] = useState('https://cdn-icons-png.flaticon.com/512/732/732200.png');
    const [watermarkPosition, setWatermarkPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'>('top-right');
    const [opacity, setOpacity] = useState(0.85);
    const [scale, setScale] = useState(0.15);
    const [introStingerText, setIntroStingerText] = useState('Follow @ReelPilot for more!');

    const fetchPresets = async () => {
        try {
            const data = await api.get<any[]>('/branding');
            setPresets(data || []);
        } catch {
            setPresets([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPresets();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/branding', {
                name,
                logoUrl,
                watermarkPosition,
                opacity,
                scale,
                introStingerText,
            });
            push({ title: 'Branding preset saved!', variant: 'success' });
            fetchPresets();
        } catch (err: any) {
            push({ title: err.message || 'Failed to save preset', variant: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.delete(`/branding/${id}`);
            push({ title: 'Preset deleted', variant: 'info' });
            fetchPresets();
        } catch {
            push({ title: 'Delete failed', variant: 'error' });
        }
    };

    // Calculate CSS positioning style for live preview
    const getPositionStyle = () => {
        switch (watermarkPosition) {
            case 'top-left': return 'top-4 left-4';
            case 'top-right': return 'top-4 right-4';
            case 'bottom-left': return 'bottom-4 left-4';
            case 'bottom-right': return 'bottom-4 right-4';
            case 'center': return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
            default: return 'top-4 right-4';
        }
    };

    return (
        <AppLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                        <ShieldCheck className="h-7 w-7 text-emerald-400" />
                        Watermarking & Branding Presets
                    </h1>
                    <p className="text-sm text-slate-400">
                        Automatically overlay brand logos, custom watermarks, and intro stingers on all reels before publishing.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Form */}
                    <div className="lg:col-span-7 space-y-6">
                        <form onSubmit={handleCreate} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-xl">
                            <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2 border-b border-slate-800 pb-3">
                                <Sliders className="h-4 w-4 text-cyan-400" />
                                Preset Configuration
                            </h3>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Preset Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
                                    <ImageIcon className="h-4 w-4 text-indigo-400" />
                                    Logo Watermark Image URL
                                </label>
                                <input
                                    type="text"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="https://domain.com/logo.png"
                                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Watermark Position</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['top-left', 'top-right', 'center', 'bottom-left', 'bottom-right'] as const).map((pos) => (
                                        <button
                                            key={pos}
                                            type="button"
                                            onClick={() => setWatermarkPosition(pos)}
                                            className={`p-2.5 rounded-xl border text-xs font-bold capitalize transition-all ${watermarkPosition === pos ? 'bg-accent-400/20 border-accent-400 text-accent-400' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'}`}
                                        >
                                            {pos.replace('-', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                                        Opacity ({Math.round(opacity * 100)}%)
                                    </label>
                                    <input
                                        type="range"
                                        min="0.2"
                                        max="1.0"
                                        step="0.05"
                                        value={opacity}
                                        onChange={(e) => setOpacity(parseFloat(e.target.value))}
                                        className="w-full accent-accent-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                                        Scale ({Math.round(scale * 100)}%)
                                    </label>
                                    <input
                                        type="range"
                                        min="0.05"
                                        max="0.4"
                                        step="0.05"
                                        value={scale}
                                        onChange={(e) => setScale(parseFloat(e.target.value))}
                                        className="w-full accent-accent-400"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">Intro Stinger Text Banner</label>
                                <input
                                    type="text"
                                    value={introStingerText}
                                    onChange={(e) => setIntroStingerText(e.target.value)}
                                    className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-accent-400"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-glow"
                            >
                                <Plus className="h-4 w-4" />
                                <span>Save Branding Preset</span>
                            </button>
                        </form>
                    </div>

                    {/* Right Interactive Preview */}
                    <div className="lg:col-span-5 space-y-6">
                        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                            <h3 className="font-bold text-slate-200 text-sm">Live 9:16 Video Watermark Preview</h3>
                            <div className="relative mx-auto w-[220px] aspect-[9/16] rounded-2xl overflow-hidden bg-slate-950 border-2 border-slate-800 shadow-2xl flex flex-col justify-between p-4">
                                <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/40 via-purple-950/20 to-slate-950/80 pointer-events-none" />

                                {/* Watermark logo overlay */}
                                <div className={`absolute ${getPositionStyle()} transition-all duration-300`} style={{ opacity }}>
                                    <img
                                        src={logoUrl}
                                        alt="Watermark"
                                        className="h-10 w-auto object-contain filter drop-shadow-md"
                                        onError={(e) => {
                                            (e.target as any).src = 'https://cdn-icons-png.flaticon.com/512/732/732200.png';
                                        }}
                                    />
                                </div>

                                {/* Intro stinger banner at bottom */}
                                {introStingerText && (
                                    <div className="absolute bottom-6 left-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-center animate-bounce">
                                        <p className="text-[11px] font-bold text-yellow-300 truncate">{introStingerText}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Presets List */}
                        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                            <h3 className="font-bold text-slate-200 text-sm">Saved Presets ({presets.length})</h3>
                            {loading ? (
                                <p className="text-xs text-slate-500">Loading presets...</p>
                            ) : presets.length === 0 ? (
                                <p className="text-xs text-slate-500">No custom presets saved yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {presets.map((p) => (
                                        <div key={p.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                                                    {p.name}
                                                </p>
                                                <p className="text-[10px] text-slate-500">
                                                    Pos: {p.watermarkPosition} | Opacity: {Math.round(p.opacity * 100)}%
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(p.id)}
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
