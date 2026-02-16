import type { Session, Goal } from '../types';

import { getDB } from './db';
import { calculateStreak, autoCalibrate, getDayString } from './calculations';

export const completeSession = async (session: Session): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction(['sessions', 'goals'], 'readwrite');

    // 1. Save Session (Directly add, don't read-all-write-all)
    await tx.objectStore('sessions').add(session);

    // 2. Update Goal
    // We need to get the goal to update it.
    // Also need sessions for calc.
    // Optimization: getSessionsByGoalId is async and uses index.
    // But we are in a transaction. We can't await external async functions easily inside a tx unless they use the same tx.
    // `getSessionsByGoalId` creates its own tx (via getAllFromIndex).
    // IDB transactions auto-commit if you await something else.
    // So we should:
    // a) Get goal
    // b) Get sessions (read-only is fine, but we are in rw tx).
    // c) Compute stats
    // d) Put goal

    // Actually, `idb` library handles awaiting inside tx fine?
    // "If you await a promise that comes from a different transaction, the current one might commit."

    const goal = await tx.objectStore('goals').get(session.goalId);
    if (!goal) {
        await tx.done;
        return;
    }

    // We need history for streak/calibration. Use index.
    const goalSessions = await tx.objectStore('sessions').index('by-goal').getAll(session.goalId);
    // The list includes the one we just added? 
    // "If you add to a store, then query it in same tx, you see it?" -> Yes.

    // Streak Calculation
    const { currentStreak, longestStreak } = calculateStreak(goalSessions, goal.restDays);

    // Auto Calibration
    const { adaptiveBaseline, adaptiveMomentum } = autoCalibrate(goal, goalSessions);

    const updatedGoal: Goal = {
        ...goal,
        totalSessions: goal.totalSessions + 1,
        lastCompletedDate: getDayString(new Date(session.endTime)),
        currentStreak,
        longestStreak: Math.max(goal.longestStreak || 0, longestStreak),
        adaptiveBaseline,
        adaptiveMomentum,
        // Apply adaptation immediately
        baseline: adaptiveBaseline,
        momentum: adaptiveMomentum
    };

    await tx.objectStore('goals').put(updatedGoal);
    await tx.done;
};

export const markRestDay = async (goalId: string, date: string): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction(['goals', 'sessions'], 'readwrite');

    const goal = await tx.objectStore('goals').get(goalId);
    if (!goal) return;

    if (goal.restDays && goal.restDays.includes(date)) return;

    // Update rest days
    const updatedRestDays = [...(goal.restDays || []), date];

    // Recalculate streak with new rest day
    const sessions = await tx.objectStore('sessions').index('by-goal').getAll(goalId);
    const { currentStreak, longestStreak } = calculateStreak(sessions, updatedRestDays);

    const updatedGoal = {
        ...goal,
        restDays: updatedRestDays,
        currentStreak,
        longestStreak: Math.max(goal.longestStreak || 0, longestStreak)
    };

    await tx.objectStore('goals').put(updatedGoal);
    await tx.done;
};

export const bankProgress = async (goalId: string): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction('goals', 'readwrite');
    const goal = await tx.store.get(goalId);

    if (!goal) return;

    const checkpoint: any = { // Type BankedProgress
        date: new Date().toISOString(),
        streak: goal.currentStreak,
        totalSessions: goal.totalSessions,
        baseline: goal.baseline,
        momentum: goal.momentum
    };

    const updatedGoal = {
        ...goal,
        status: 'banked' as const,
        bankedProgress: [...(goal.bankedProgress || []), checkpoint],
        currentStreak: 0 // Reset streak
    };

    await tx.store.put(updatedGoal);
    await tx.done;
};
