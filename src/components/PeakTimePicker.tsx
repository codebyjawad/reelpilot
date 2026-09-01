import React, { useEffect, useState } from 'react';
import { Zap, Clock, Flame } from 'lucide-react';
import { reelsApi, type PeakTimeSlot } from '@/lib/apiClient';

interface PeakTimePickerProps {
    onSelectSlot: (datetime: string) => void;
    currentValue?: string;
}

export const PeakTimePicker: React.FC<PeakTimePickerProps> = ({
    onSelectSlot,
    currentValue,
}) => {
    const [slots, setSlots] = useState<PeakTimeSlot[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await reelsApi.getPeakTimes();
                setSlots(res.slots || []);
            } catch (_err) {
                // Fallback slots if network error
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading || slots.length === 0) return null;

    return (
        <div className="space-y-2 mt-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    AI Peak Audience Active Slots
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                    Highest algorithm viral reach
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                {slots.map((slot) => {
                    const isSelected = currentValue === slot.datetime;
                    return (
                        <button
                            key={slot.datetime}
                            type="button"
                            onClick={() => onSelectSlot(slot.datetime)}
                            className={`p-2.5 rounded-lg border text-left transition-all relative overflow-hidden group ${
                                isSelected
                                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                                    : 'bg-slate-800/60 border-slate-700/80 hover:border-amber-500/50 hover:bg-slate-800 text-slate-300'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-200 truncate">{slot.label}</span>
                                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 flex items-center gap-0.5 shrink-0">
                                    <Flame className="h-2.5 w-2.5" />
                                    {slot.score}%
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-semibold text-slate-100 mt-1">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span>{slot.formattedTime}</span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};
