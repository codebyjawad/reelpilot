import React, { useEffect, useState } from 'react';
import { Flame, Info, Clock, Sparkles } from 'lucide-react';
import { peakTimeApi, type HeatmapMatrixResponse, type HeatmapCell } from '@/lib/apiClient';

interface PeakTimeHeatmapProps {
    onSelectSlot?: (datetimeISO: string) => void;
}

export const PeakTimeHeatmap: React.FC<PeakTimeHeatmapProps> = ({ onSelectSlot }) => {
    const [data, setData] = useState<HeatmapMatrixResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

    useEffect(() => {
        peakTimeApi.getHeatmap()
            .then((res) => setData(res))
            .catch((err) => console.error('Failed to load heatmap:', err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl animate-pulse flex items-center justify-center min-h-[220px]">
                <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                    <Flame className="h-5 w-5 text-amber-500 animate-spin" />
                    Calculating 7x24 Viral Engagement Heatmap...
                </div>
            </div>
        );
    }

    if (!data) return null;

    const getCellColor = (level: HeatmapCell['level']) => {
        switch (level) {
            case 'peak':
                return 'bg-rose-500 text-white shadow-sm hover:scale-110 ring-2 ring-rose-400/50 z-10';
            case 'high':
                return 'bg-amber-500 text-slate-950 hover:scale-110 ring-1 ring-amber-400/40';
            case 'medium':
                return 'bg-emerald-600/80 text-white hover:scale-110';
            default:
                return 'bg-slate-800/40 text-slate-500 hover:bg-slate-700/60';
        }
    };

    return (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-100">
                        <Flame className="h-5 w-5 text-rose-500" />
                        7-Day × 24-Hour Best Time to Post Heatmap
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                        Interactive engagement intensity matrix based on algorithm audience traffic
                    </p>
                </div>

                {/* Legend badges */}
                <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        Peak (90+)
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        High (75+)
                    </span>
                    <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        Normal (50+)
                    </span>
                </div>
            </div>

            {/* Matrix Grid */}
            <div className="overflow-x-auto pb-2">
                <div className="min-w-[640px]">
                    {/* Hour Labels */}
                    <div className="grid grid-cols-[50px_repeat(24,minmax(0,1fr))] gap-1 mb-2 text-[10px] font-semibold text-slate-400 text-center">
                        <div>Day</div>
                        {data.hours.map((h) => (
                            <div key={h} className="truncate">
                                {h === 0 ? '12a' : h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
                            </div>
                        ))}
                    </div>

                    {/* Day Rows */}
                    {data.matrix.map((row, dayIdx) => (
                        <div key={dayIdx} className="grid grid-cols-[50px_repeat(24,minmax(0,1fr))] gap-1 mb-1 items-center">
                            <div className="text-xs font-bold text-slate-300 pr-2">{data.days[dayIdx]}</div>
                            {row.map((cell) => (
                                <button
                                    key={`${cell.dayIndex}-${cell.hour}`}
                                    type="button"
                                    onMouseEnter={() => setHoveredCell(cell)}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    onDoubleClick={() => onSelectSlot && onSelectSlot(cell.datetimeISO)}
                                    className={`h-7 rounded text-[10px] font-black transition-all flex items-center justify-center cursor-pointer ${getCellColor(cell.level)}`}
                                    title={`${cell.formattedTime}: Score ${cell.score}/100`}
                                >
                                    {cell.score >= 85 ? cell.score : ''}
                                </button>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Cell Details Tooltip Bar */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between text-xs text-slate-300 min-h-[44px]">
                {hoveredCell ? (
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 font-bold text-amber-400">
                            <Clock className="h-4 w-4" />
                            {hoveredCell.formattedTime}
                        </div>
                        <div className="px-2 py-0.5 rounded font-black text-[11px] bg-slate-800 text-slate-200">
                            Score: {hoveredCell.score}/100 ({hoveredCell.level.toUpperCase()})
                        </div>
                        <span className="text-slate-400 italic">"{hoveredCell.rationale}"</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-slate-500 italic">
                        <Info className="h-4 w-4" />
                        Hover over any hour cell to inspect engagement score & rationale. Double-click to select optimal slot.
                    </div>
                )}

                {data.topPeakCell && (
                    <div className="hidden sm:flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg shrink-0">
                        <Sparkles className="h-3.5 w-3.5" />
                        Top Peak: {data.topPeakCell.formattedTime} ({data.topPeakCell.score}/100)
                    </div>
                )}
            </div>
        </div>
    );
};
