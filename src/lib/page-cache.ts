// Simple in-memory session cache for page data.
// Survives client-side navigation; cleared on hard refresh.
const cache = new Map<string, unknown>();

export const pageCache = {
    get: <T>(key: string): T | undefined => cache.get(key) as T | undefined,
    set: <T>(key: string, data: T): void => { cache.set(key, data); },
    has: (key: string): boolean => cache.has(key),
};
