import type { Goal, Session, Tier } from '../types';

// Helper to get date string YYYY-MM-DD
export const getDayString = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

export const calculateWeightedMovingAverage = (
    sessions: Session[],
    windowSize: number
): number => {
    if (sessions.length === 0) return 0;

    // Sort sessions by date descending (newest first)
    const sortedSessions = [...sessions].sort(
        (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
    );

    const recentSessions = sortedSessions.slice(0, windowSize);

    if (recentSessions.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    recentSessions.forEach((session, index) => {
        const weight = recentSessions.length - index;
        weightedSum += session.finalCount * weight;
        totalWeight += weight;
    });

    if (totalWeight === 0) return 0;

    return Math.round(weightedSum / totalWeight);
};

export const autoCalibrate = (
    goal: Goal,
    allSessions: Session[]
): { adaptiveBaseline: number; adaptiveMomentum: number } => {
    const goalSessions = allSessions.filter(s => s.goalId === goal.id);

    if (goalSessions.length < 3) {
        return {
            adaptiveBaseline: goal.baseline,
            adaptiveMomentum: goal.momentum
        };
    }

    const wma = calculateWeightedMovingAverage(goalSessions, goal.movingAverageWindow);

    return {
        adaptiveBaseline: Math.max(1, Math.round(wma * 0.7)),
        adaptiveMomentum: Math.max(1, wma)
    };
};

export const determineTier = (value: number, goal: Goal): Tier => {
    const baseline = goal.adaptiveBaseline || goal.baseline;
    const momentum = goal.adaptiveMomentum || goal.momentum;
    const stretch = goal.stretch;

    if (value < baseline) return 'below';
    if (value < momentum) return 'baseline';
    if (value < stretch) return 'momentum';
    if (value >= stretch + goal.increment) return 'beyond';
    return 'stretch';
};

export const calculateTrend = (
    sessions: Session[]
): { percent: number; direction: 'up' | 'down' | 'neutral' } => {
    if (sessions.length < 2) return { percent: 0, direction: 'neutral' };

    const sorted = [...sessions].sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());

    const half = Math.floor(sorted.length / 2);
    const recent = sorted.slice(-half);
    const older = sorted.slice(0, sorted.length - recent.length);

    if (older.length === 0) return { percent: 0, direction: 'neutral' };

    const avgRecent = recent.reduce((sum, s) => sum + s.finalCount, 0) / recent.length;
    const avgOlder = older.reduce((sum, s) => sum + s.finalCount, 0) / older.length;

    if (avgOlder === 0) return { percent: 100, direction: 'up' };

    const diff = avgRecent - avgOlder;
    const percent = Math.round((diff / avgOlder) * 100);

    let direction: 'up' | 'down' | 'neutral' = 'neutral';
    if (percent > 0) direction = 'up';
    if (percent < 0) direction = 'down';

    return { percent: Math.abs(percent), direction };
};

export const calculateStreak = (
    sessions: Session[],
    restDays: string[] = []
): { currentStreak: number; longestStreak: number } => {
    if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // Get all unique active days
    const uniqueDays = new Set<string>();
    sessions.forEach(s => uniqueDays.add(getDayString(new Date(s.endTime))));
    const sessionDays = Array.from(uniqueDays).sort().reverse();

    if (sessionDays.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // Helper to check if a date is covered (session or rest)
    const isCovered = (dateStr: string) => {
        return sessionDays.includes(dateStr) || restDays.includes(dateStr);
    };

    // Calculate Current Streak (Backwards from Today/Yesterday)
    const todayStr = getDayString(new Date());
    const yesterdayStr = getDayString(new Date(Date.now() - 86400000));

    let current = 0;

    // Start point
    let d = new Date();
    // If today is not covered, check yesterday
    if (!isCovered(todayStr)) {
        if (isCovered(yesterdayStr)) {
            d.setDate(d.getDate() - 1); // Start from yesterday
        } else {
            // Broken
            current = 0;
            // We set d to ensure loop doesn't run or runs just to fail, 
            // but we can just set current=0 and skip.
            // But we need to calculate Longest anyway.
            // Let's just flag it.
        }
    }

    if (isCovered(getDayString(d))) {
        while (true) {
            const dStr = getDayString(d);
            if (sessionDays.includes(dStr)) {
                current++;
            } else if (restDays.includes(dStr)) {
                // Rest day, continue but don't increment
            } else {
                break; // Gap found
            }
            d.setDate(d.getDate() - 1);
        }
    } else {
        current = 0;
    }

    // Calculate Longest Streak
    // Combine all dates and find max contiguous block of session-days

    const allDates = new Set([...sessionDays, ...restDays]);
    const sortedAll = Array.from(allDates).sort(); // Ascending [oldest, ..., newest]

    if (sortedAll.length === 0) return { currentStreak: current, longestStreak: 0 };

    let max = 0;
    let temp = 0;
    let prevDate: Date | null = null;

    for (const dateStr of sortedAll) {
        const currentDate = new Date(dateStr);
        const isSession = sessionDays.includes(dateStr);

        if (!prevDate) {
            if (isSession) temp = 1;
            prevDate = currentDate;
            continue;
        }

        const diffTime = Math.abs(currentDate.getTime() - prevDate.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            // Contiguous
            if (isSession) temp++;
            // If rest, temp stays same
        } else {
            // Gap
            if (temp > max) max = temp;
            temp = isSession ? 1 : 0;
        }
        prevDate = currentDate;
    }
    if (temp > max) max = temp;

    return { currentStreak: current, longestStreak: max };
};

// --- Extended Math Engine (for new UI views) ---

export const getWMAFromValues = (data: number[], window = 5): number => {
    if (!data || !data.length) return 0;
    const slice = data.slice(-window);
    let sum = 0, weight = 0;
    slice.forEach((v, i) => {
        const w = i + 1;
        sum += v * w;
        weight += w;
    });
    return Math.round(sum / weight);
};

export const getStdDev = (data: number[], window = 5): number => {
    if (!data || data.length < 2) return 0;
    const slice = data.slice(-window);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    const squareDiffs = slice.map(v => Math.pow(v - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
};

export interface HeikenAshiBar {
    index: number;
    open: number;
    high: number;
    low: number;
    close: number;
    isBull: boolean;
    val: number;
}

export const getHeikenAshi = (history: number[]): HeikenAshiBar[] => {
    if (!history || !history.length) return [];
    return history.map((val, i) => {
        const close = val;
        const prevVal = i > 0 ? history[i - 1] : val;
        const open = (prevVal + val) / 2;
        const high = Math.max(val, open);
        const low = Math.min(val, open);
        const isBull = close >= open;
        return { index: i, open, high, low, close, isBull, val };
    });
};

export const getRSI = (data: number[]): number => {
    if (!data || data.length < 5) return 50;
    const slice = data.slice(-14);
    let up = 0, down = 0;
    for (let i = 1; i < slice.length; i++) {
        const d = slice[i] - slice[i - 1];
        if (d >= 0) up += d; else down += Math.abs(d);
    }
    return Math.round(100 - (100 / (1 + (up / (down || 1)))));
};

export const getGrade = (score: number): string => {
    if (score >= 95) return 'S';
    if (score >= 85) return 'A';
    if (score >= 70) return 'B';
    if (score >= 50) return 'C';
    return 'D';
};

export interface HeatmapCell {
    date: Date;
    intensity: number;
}

export const generateHeatmapData = (sessions: Session[] = []): HeatmapCell[] => {
    const data: HeatmapCell[] = [];
    const today = new Date();

    // Create a map of date string -> count
    const activityMap = new Map<string, number>();
    sessions.forEach(s => {
        const dStr = getDayString(new Date(s.endTime));
        activityMap.set(dStr, (activityMap.get(dStr) || 0) + 1);
    });

    for (let i = 111; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dStr = getDayString(d);
        const count = activityMap.get(dStr) || 0;

        // Intensity scaling: 0 (none) to 4 (high)
        // 1 session = 1, 2 = 2, 3 = 3, 4+ = 4
        const intensity = Math.min(4, count);

        data.push({ date: d, intensity });
    }
    return data;
};
