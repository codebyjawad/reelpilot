export interface PeakTimeSlot {
    label: string;
    datetime: string;
    formattedTime: string;
    score: number; // 0 - 100
    rationale: string;
}

export interface PeakTimesResponse {
    slots: PeakTimeSlot[];
    bestNextSlot: PeakTimeSlot;
}

/**
 * Calculate top 3 peak viral engagement time slots for short-form content
 */
export const calculatePeakTimeSlots = async (targetDateStr?: string): Promise<PeakTimesResponse> => {
    const baseDate = targetDateStr ? new Date(targetDateStr) : new Date();

    // Define peak social engagement hour targets: Morning (9:00 AM), Lunch (1:30 PM), Evening Prime (7:45 PM)
    const peakConfigs = [
        { label: 'Morning Commute Rush', hour: 9, minute: 0, score: 88, rationale: 'High active mobile browsing during morning commute' },
        { label: 'Lunch Break Peak', hour: 13, minute: 30, score: 94, rationale: 'Highest daily click-through rate across Reels' },
        { label: 'Evening Prime Time', hour: 19, minute: 45, score: 98, rationale: 'Peak algorithm engagement & viewer retention window' },
    ];

    const slots: PeakTimeSlot[] = [];

    for (const config of peakConfigs) {
        const slotDate = new Date(baseDate);
        slotDate.setHours(config.hour, config.minute, 0, 0);

        // If time slot has already passed today, advance to tomorrow
        if (slotDate.getTime() <= Date.now() + 5 * 60 * 1000) {
            slotDate.setDate(slotDate.getDate() + 1);
        }

        // Format for datetime-local input (YYYY-MM-DDTHH:mm)
        const year = slotDate.getFullYear();
        const month = String(slotDate.getMonth() + 1).padStart(2, '0');
        const day = String(slotDate.getDate()).padStart(2, '0');
        const hours = String(slotDate.getHours()).padStart(2, '0');
        const mins = String(slotDate.getMinutes()).padStart(2, '0');
        const isoLocal = `${year}-${month}-${day}T${hours}:${mins}`;

        const formattedTime = slotDate.toLocaleString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });

        slots.push({
            label: config.label,
            datetime: isoLocal,
            formattedTime,
            score: config.score,
            rationale: config.rationale,
        });
    }

    // Sort by highest score first
    slots.sort((a, b) => b.score - a.score);

    return {
        slots,
        bestNextSlot: slots[0],
    };
};

export interface HeatmapCell {
    dayIndex: number; // 0 = Mon, 6 = Sun
    dayName: string;
    hour: number; // 0 - 23
    score: number; // 0 - 100
    level: 'low' | 'medium' | 'high' | 'peak';
    datetimeISO: string;
    formattedTime: string;
    rationale: string;
}

export interface HeatmapMatrixResponse {
    days: string[];
    hours: number[];
    matrix: HeatmapCell[][]; // 7 days x 24 hours
    topPeakCell: HeatmapCell;
}

/**
 * Calculate full 7-day x 24-hour engagement intensity heatmap matrix
 */
export const calculate7DayHeatmapMatrix = async (): Promise<HeatmapMatrixResponse> => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Engagement scoring curve based on social media short-form video consumption stats
    const hourBaseScores: Record<number, { score: number; rationale: string }> = {
        0: { score: 25, rationale: 'Late night quiet hours' },
        1: { score: 15, rationale: 'Minimal algorithm traffic' },
        2: { score: 10, rationale: 'Low engagement window' },
        3: { score: 10, rationale: 'Low engagement window' },
        4: { score: 15, rationale: 'Early morning wake up' },
        5: { score: 30, rationale: 'Early risers scrolling feeds' },
        6: { score: 45, rationale: 'Morning routine & news checking' },
        7: { score: 65, rationale: 'Morning commute mobile spike' },
        8: { score: 82, rationale: 'Commute & breakfast scrolling' },
        9: { score: 90, rationale: 'Morning work break peak' },
        10: { score: 75, rationale: 'Mid-morning steady engagement' },
        11: { score: 70, rationale: 'Pre-lunch casual browsing' },
        12: { score: 92, rationale: 'Lunch hour prime mobile traffic' },
        13: { score: 95, rationale: 'Midday viral peak window' },
        14: { score: 78, rationale: 'Afternoon steady browsing' },
        15: { score: 80, rationale: 'Afternoon energy slump scroll' },
        16: { score: 85, rationale: 'School / workday wrap up' },
        17: { score: 88, rationale: 'Evening commute home' },
        18: { score: 91, rationale: 'Dinner & relaxing time' },
        19: { score: 98, rationale: 'Prime Time evening retention peak' },
        20: { score: 96, rationale: 'Peak prime time mobile usage' },
        21: { score: 89, rationale: 'Nightly wind down scrolling' },
        22: { score: 72, rationale: 'Late night audience' },
        23: { score: 45, rationale: 'Late night declining traffic' },
    };

    // Day modifiers (Weekends & Wednesday have higher viral retention)
    const dayModifiers: Record<number, number> = {
        0: 1.0,  // Mon
        1: 1.02, // Tue
        2: 1.05, // Wed (Hump day viral boost)
        3: 1.01, // Thu
        4: 1.08, // Fri
        5: 1.10, // Sat (Weekend binge watch)
        6: 1.07, // Sun
    };

    const now = new Date();
    const currentDay = (now.getDay() + 6) % 7; // Convert Sun=0 to Mon=0

    const matrix: HeatmapCell[][] = [];
    let topPeakCell: HeatmapCell | null = null;

    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
        const row: HeatmapCell[] = [];

        for (let h = 0; h < 24; h++) {
            const base = hourBaseScores[h] || { score: 30, rationale: 'General feed traffic' };
            const modifier = dayModifiers[dayIdx] || 1.0;
            const finalScore = Math.min(100, Math.round(base.score * modifier));

            let level: 'low' | 'medium' | 'high' | 'peak' = 'low';
            if (finalScore >= 90) level = 'peak';
            else if (finalScore >= 75) level = 'high';
            else if (finalScore >= 50) level = 'medium';

            // Calculate target date/time for slotting
            const targetDate = new Date();
            const dayOffset = (dayIdx - currentDay + 7) % 7;
            targetDate.setDate(now.getDate() + dayOffset);
            targetDate.setHours(h, 0, 0, 0);

            const year = targetDate.getFullYear();
            const month = String(targetDate.getMonth() + 1).padStart(2, '0');
            const day = String(targetDate.getDate()).padStart(2, '0');
            const hoursStr = String(targetDate.getHours()).padStart(2, '0');
            const datetimeISO = `${year}-${month}-${day}T${hoursStr}:00`;

            const formattedTime = `${days[dayIdx]} ${h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}`;

            const cell: HeatmapCell = {
                dayIndex: dayIdx,
                dayName: days[dayIdx],
                hour: h,
                score: finalScore,
                level,
                datetimeISO,
                formattedTime,
                rationale: base.rationale,
            };

            row.push(cell);

            if (!topPeakCell || cell.score > topPeakCell.score) {
                topPeakCell = cell;
            }
        }
        matrix.push(row);
    }

    return {
        days,
        hours,
        matrix,
        topPeakCell: topPeakCell!,
    };
};

