import { openDB, type DBSchema } from 'idb';
import type { Goal, Session } from '../types';

interface MomentoDB extends DBSchema {
    goals: {
        key: string;
        value: Goal;
    };
    sessions: {
        key: string;
        value: Session;
        indexes: { 'by-goal': string };
    };
}

const DB_NAME = 'momento-db';
const DB_VERSION = 1;

export const dbPromise = openDB<MomentoDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
        // Goals Store
        if (!db.objectStoreNames.contains('goals')) {
            db.createObjectStore('goals', { keyPath: 'id' });
        }

        // Sessions Store
        if (!db.objectStoreNames.contains('sessions')) {
            const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
            sessionStore.createIndex('by-goal', 'goalId');
        }
    },
});

// Helper for type-safe access
export const getDB = () => dbPromise;
