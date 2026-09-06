export const AUDIENCE_TIMEZONE = 'Asia/Karachi';

const slotTimeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: AUDIENCE_TIMEZONE,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

const scheduledAtFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: AUDIENCE_TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
});

/** Render an absolute ISO instant as a "Sun Sep 6, 7 PM" audience-clock label. */
export const formatSlotTime = (iso: string): string => slotTimeFmt.format(new Date(iso));

/** How far in the future an instant is, e.g. "in 2h 15m". */
export const formatSlotsIn = (iso: string): string => {
    const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
    if (mins < 60) return `in ${Math.max(0, mins)}m`;
    const h = Math.floor(mins / 60);
    return mins % 60 ? `in ${h}h ${mins % 60}m` : `in ${h}h`;
};

/** Short "Sep 6, 7:00 PM" audience-clock label used on reel cards. */
export const formatScheduledAt = (iso: string): string => scheduledAtFmt.format(new Date(iso));