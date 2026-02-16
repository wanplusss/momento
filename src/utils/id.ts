/** Generate a unique ID that works in non-secure contexts (HTTP on mobile). */
export const genId = (): string => {
    try {
        return crypto.randomUUID();
    } catch {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
};
