export type GoalType = 'habit' | 'fitness' | 'project';
export type GoalMode = 'counter' | 'timer';
export type GoalStatus = 'active' | 'banked';

export type Tier = 'below' | 'baseline' | 'momentum' | 'stretch' | 'beyond';

export interface Hit {
    value: number;
    timestamp: string; // ISO string
    tier: Tier;
}

export interface BankedProgress {
    date: string; // ISO string
    streak: number;
    sessions: number;
    momentum: number;
    baseline: number;
}

export interface Goal {
    id: string;
    name: string;
    type: GoalType;
    goalMode: GoalMode;
    status: GoalStatus;

    // Tiers
    baseline: number; // Current baseline
    momentum: number; // Current momentum
    stretch: number; // Fixed aspiration

    // Auto-calibration
    adaptiveBaseline?: number; // Calculated but not yet applied? Or references to last calc?
    adaptiveMomentum?: number;

    // Configuration
    increment: number; // Auto-increment per breakthrough
    stepSize?: number; // How much each tap adds (default: 1)
    unit: string;
    movingAverageWindow: number; // 3, 5, 10, 30

    // Stats
    currentStreak: number;
    longestStreak: number;
    totalSessions: number;
    lastCompletedDate?: string; // ISO date (YYYY-MM-DD) for streak calc

    // Bank
    bankedProgress: BankedProgress[];
    restDays: string[]; // ISO dates (YYYY-MM-DD) marked as rest

    // Visuals
    icon: string; // Lucide icon name
    color: string; // Hex or theme color name

    // Metadata
    createdAt: string;
}

export interface Session {
    id: string;
    goalId: string;

    originalGoal: {
        baseline: number;
        momentum: number;
        stretch: number;
    };

    prediction?: number; // User's pre-session target from Wizard
    finalCount: number;
    breakthroughs: number;
    tier: Tier;

    startTime: string; // ISO string
    endTime: string; // ISO string

    hitHistory: Hit[];
}
