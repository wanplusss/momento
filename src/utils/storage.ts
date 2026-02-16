import type { Goal, Session } from '../types';
import { getDB } from './db';

const STORAGE_KEYS = {
    GOALS: 'momento_goals',
    SESSIONS: 'momento_sessions',
};

// --- Migration ---

export const migrateFromLocalStorage = async (): Promise<boolean> => {
    try {
        const db = await getDB();

        // Check if already migrated (simple check: any goals in DB?)
        const existingGoals = await db.getAll('goals');
        if (existingGoals.length > 0) return true; // Already has data

        const lsGoals = localStorage.getItem(STORAGE_KEYS.GOALS);
        const lsSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);

        if (lsGoals) {
            const goals: Goal[] = JSON.parse(lsGoals);
            const tx = db.transaction('goals', 'readwrite');
            await Promise.all(goals.map(g => tx.store.put(g)));
            await tx.done;
        }

        if (lsSessions) {
            const sessions: Session[] = JSON.parse(lsSessions);
            const tx = db.transaction('sessions', 'readwrite');
            await Promise.all(sessions.map(s => tx.store.put(s)));
            await tx.done;
        }

        // Optional: clear local storage after migration? 
        // Let's keep it for safety for now, or rename key.
        // localStorage.removeItem(STORAGE_KEYS.GOALS);

        return true;
    } catch (error) {
        console.error('Migration failed:', error);
        return false;
    }
};

// --- Goals ---

export const getGoals = async (): Promise<Goal[]> => {
    const db = await getDB();
    return db.getAll('goals');
};

export const saveGoals = async (goals: Goal[]): Promise<void> => {
    const db = await getDB();
    const tx = db.transaction('goals', 'readwrite');
    const store = tx.store;

    // Get existing keys INSIDE the same transaction
    const existingKeys = await store.getAllKeys();
    const newIds = new Set(goals.map(g => g.id));
    const toDelete = existingKeys.filter(k => !newIds.has(k));

    // Put all goals and delete removed ones
    for (const g of goals) {
        store.put(g);
    }
    for (const k of toDelete) {
        store.delete(k);
    }

    await tx.done;
};

// --- Sessions ---

export const getSessions = async (): Promise<Session[]> => {
    const db = await getDB();
    return db.getAll('sessions');
};

export const saveSessions = async (sessions: Session[]): Promise<void> => {
    // Same logic as goals.
    const db = await getDB();
    const tx = db.transaction('sessions', 'readwrite');

    // Optimization: sessions usually only *append*.
    // But sometimes we might edit/delete?
    // Doing a full diff on sessions (potentially thousands) is slow.
    // However, the app usually calls `saveSessions([...all, new])`.

    // If we can change the API to `addSession(session)`, it's better.
    // But for refactor:
    // Let's just put them all. Deletion of sessions isn't really a feature yet 
    // (except in my code review I noted it's missing).

    // For performance, let's just PUT all for now.
    // If the array is huge, this is bad.
    // But `idb` might optimize no-op puts? No.

    // REAL FIX: Change `actions.ts` to not pass the whole array.
    // I will refactor `actions.ts` next to use `addSession` instead of `saveSessions`.
    // For now, I'll implement this as a bulk put.

    await Promise.all([
        ...sessions.map(s => tx.store.put(s)),
        tx.done
    ]);
};

// NEW: Optimized query
export const getSessionsByGoalId = async (goalId: string): Promise<Session[]> => {
    const db = await getDB();
    return db.getAllFromIndex('sessions', 'by-goal', goalId);
};

export const clearData = async (): Promise<void> => {
    const db = await getDB();
    await db.clear('goals');
    await db.clear('sessions');
    localStorage.removeItem(STORAGE_KEYS.GOALS);
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
};
