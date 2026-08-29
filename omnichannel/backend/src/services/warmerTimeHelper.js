/**
 * Warmer Time & Active Hours Helper
 * Ensures WhatsApp Warmer only interacts during natural human waking hours (WIB / Asia/Jakarta).
 * Prevents unnatural late-night/early-morning (00:00 - 07:59) spamming that triggers WhatsApp anti-abuse bans.
 */

const DEFAULT_START_HOUR = 8;  // 08:00 WIB (Pagi)
const DEFAULT_END_HOUR = 21;   // 21:00 WIB (9 Malam)

/**
 * Returns a Date object and breakdown in WIB (Asia/Jakarta, UTC+7)
 * @param {Date|number} inputDate 
 * @returns {{ hour: number, minute: number, second: number, dateStr: string, wibDate: Date }}
 */
export const getWIBTimeBreakdown = (inputDate = new Date()) => {
    const d = new Date(inputDate);
    // Convert to Asia/Jakarta timezone string parts
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const parts = formatter.formatToParts(d);
    const getPart = (type) => parts.find(p => p.type === type)?.value;

    const year = parseInt(getPart('year') || '2026', 10);
    const month = parseInt(getPart('month') || '1', 10) - 1; // 0-indexed
    const day = parseInt(getPart('day') || '1', 10);
    const hour = parseInt(getPart('hour') || '0', 10);
    const minute = parseInt(getPart('minute') || '0', 10);
    const second = parseInt(getPart('second') || '0', 10);

    // Create a normalized Date object representing the same wall-clock time in local reference
    const wibDate = new Date(Date.UTC(year, month, day, hour - 7, minute, second));

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    return {
        year,
        month: month + 1,
        day,
        hour,
        minute,
        second,
        dateStr,
        wibDate: d
    };
};

/**
 * Check if the current time is within active human hours for a warmer circle
 * @param {Object} circle - Warmer circle configuration
 * @param {Date} date - Current date (default: now)
 * @returns {{ isActive: boolean, currentHour: number, startHour: number, endHour: number, enableActiveHours: boolean }}
 */
export const checkWarmerActiveHours = (circle, date = new Date()) => {
    const enableActiveHours = circle.enable_active_hours !== false; // Default true
    const startHour = Number.isInteger(circle.active_hours_start) ? circle.active_hours_start : DEFAULT_START_HOUR;
    const endHour = Number.isInteger(circle.active_hours_end) ? circle.active_hours_end : DEFAULT_END_HOUR;

    if (!enableActiveHours) {
        return {
            isActive: true,
            currentHour: getWIBTimeBreakdown(date).hour,
            startHour,
            endHour,
            enableActiveHours: false
        };
    }

    const { hour, minute } = getWIBTimeBreakdown(date);

    // Human active hours check: startHour <= currentHour < endHour
    // Example: 8 to 21 -> active from 08:00:00 up to 20:59:59
    let isActive = false;
    if (startHour < endHour) {
        isActive = hour >= startHour && hour < endHour;
    } else {
        // In case someone configures overnight active hours (e.g. night shift 20 to 06)
        isActive = hour >= startHour || hour < endHour;
    }

    return {
        isActive,
        currentHour: hour,
        currentMinute: minute,
        startHour,
        endHour,
        enableActiveHours: true
    };
};

/**
 * Calculate the exact millisecond delay until the next valid active start time (with randomized human jitter)
 * @param {Object} circle - Warmer circle configuration
 * @param {Date} fromDate - Starting date
 * @param {Object} options - { isDailyLimitReached: boolean, minJitterMinutes: number, maxJitterMinutes: number }
 * @returns {{ delayMs: number, nextRunWIB: string, reason: string }}
 */
export const calculateNextWarmerDelay = (circle, fromDate = new Date(), options = {}) => {
    const {
        isDailyLimitReached = false,
        minJitterMinutes = 1,
        maxJitterMinutes = 8
    } = options;

    const enableActiveHours = circle.enable_active_hours !== false;
    const startHour = Number.isInteger(circle.active_hours_start) ? circle.active_hours_start : DEFAULT_START_HOUR;
    const endHour = Number.isInteger(circle.active_hours_end) ? circle.active_hours_end : DEFAULT_END_HOUR;

    const { hour, minute, second } = getWIBTimeBreakdown(fromDate);
    const nowMs = fromDate.getTime();

    // If active hours are disabled and daily limit is not reached, use normal random interval
    if (!enableActiveHours && !isDailyLimitReached) {
        const intervalMin = circle.interval_min || 60;
        const intervalMax = circle.interval_max || 300;
        const delaySec = Math.floor(Math.random() * (intervalMax - intervalMin + 1)) + intervalMin;
        return {
            delayMs: delaySec * 1000,
            nextRunWIB: 'Immediately within normal delay',
            reason: 'ACTIVE_WINDOW'
        };
    }

    // Determine target day: is it today or tomorrow morning?
    let daysToAdd = 0;
    let reason = 'QUIET_HOURS_SLEEP';

    if (isDailyLimitReached) {
        // Daily limit reached -> always resume tomorrow morning
        daysToAdd = 1;
        reason = 'DAILY_LIMIT_REACHED_RESUME_MORNING';
    } else if (hour >= endHour) {
        // Evening / night after endHour (e.g. 21:30 WIB) -> resume tomorrow morning
        daysToAdd = 1;
        reason = 'EVENING_PAUSE_RESUME_MORNING';
    } else if (hour < startHour) {
        // Early morning / midnight (e.g. 01:00 WIB) -> resume today morning at startHour
        daysToAdd = 0;
        reason = 'EARLY_MORNING_PAUSE_RESUME_TODAY';
    } else {
        // Currently inside active hours!
        const intervalMin = circle.interval_min || 60;
        const intervalMax = circle.interval_max || 300;
        const delaySec = Math.floor(Math.random() * (intervalMax - intervalMin + 1)) + intervalMin;
        const candidateDelayMs = delaySec * 1000;

        // Check if candidate delay pushes us past endHour
        const futureDate = new Date(nowMs + candidateDelayMs);
        const futureHour = getWIBTimeBreakdown(futureDate).hour;

        if (futureHour < endHour && futureHour >= startHour) {
            return {
                delayMs: candidateDelayMs,
                nextRunWIB: `Next message in ${delaySec}s`,
                reason: 'NORMAL_ACTIVE_DISPATCH'
            };
        } else {
            // Pushes past endHour -> pause for tonight and resume tomorrow morning
            daysToAdd = 1;
            reason = 'END_OF_DAY_REACHED_RESUME_MORNING';
        }
    }

    // Add randomized jitter (e.g. +1 to +8 minutes) so devices don't start at the exact same sharp second
    const jitterMinutes = Math.floor(Math.random() * (maxJitterMinutes - minJitterMinutes + 1)) + minJitterMinutes;
    const jitterSeconds = Math.floor(Math.random() * 60);

    // Calculate the difference in hours, minutes, seconds to target WIB time
    // Current WIB time vs Target WIB time (startHour:jitterMinutes:jitterSeconds) on day (today + daysToAdd)
    const currentWibSeconds = (hour * 3600) + (minute * 60) + second;
    const targetWibSeconds = (startHour * 3600) + (jitterMinutes * 60) + jitterSeconds;

    let totalSecondsUntilTarget = (daysToAdd * 86400) + (targetWibSeconds - currentWibSeconds);

    if (totalSecondsUntilTarget < 60) {
        // Safety guard: minimum 60 seconds delay
        totalSecondsUntilTarget = 60;
    }

    const delayMs = totalSecondsUntilTarget * 1000;
    const targetFormattedHour = String(startHour).padStart(2, '0');
    const targetFormattedMin = String(jitterMinutes).padStart(2, '0');
    const nextRunWIB = `${daysToAdd === 1 ? 'Besok' : 'Hari ini'} pukul ${targetFormattedHour}:${targetFormattedMin} WIB`;

    return {
        delayMs,
        nextRunWIB,
        reason,
        targetHour: startHour,
        jitterMinutes
    };
};
