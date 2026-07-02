import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { UserProgress, SubjectRating } from "./firestore-schema";
import { pageCache } from "./page-cache";

const TTL_USER = 2 * 60 * 1000; // 2 min — user data changes more often

export interface GlobalStats {
    totalSolved: number;
    accuracy: number;
    medals: { green: number; grey: number; bronze: number };
}

// ─── Internal: read full collections once, cache per user ───────────────────

function fetchRawRatings(userId: string): Promise<Record<string, number>> {
    return pageCache.fetch(`ratings:${userId}`, async () => {
        const snap = await getDocs(collection(db, "users", userId, "ratings"));
        const result: Record<string, number> = {};
        snap.forEach((d) => {
            result[d.id] = (d.data() as SubjectRating).stars || 0;
        });
        return result;
    }, TTL_USER);
}

function fetchRawProgress(userId: string): Promise<Map<string, UserProgress>> {
    return pageCache.fetch(`progress:${userId}`, async () => {
        const snap = await getDocs(collection(db, "users", userId, "userProgress"));
        const result = new Map<string, UserProgress>();
        snap.forEach((d) => result.set(d.id, d.data() as UserProgress));
        return result;
    }, TTL_USER);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Stars per subject — single Firestore read, cached */
export const fetchUserSubjectRatings = (userId: string): Promise<Record<string, number>> =>
    fetchRawRatings(userId);

/** Global stats — derived from cached ratings + progress, no extra reads */
export const fetchUserGlobalStats = async (userId: string): Promise<GlobalStats> => {
    try {
        const progress = await fetchRawProgress(userId);

        let totalSolved = 0;
        let totalCorrect = 0;
        let totalAttempted = 0;
        const medals = { green: 0, grey: 0, bronze: 0 };

        progress.forEach((data) => {
            const solved = (data as UserProgress & { solvedQuestions?: number }).solvedQuestions ?? 0;
            const errors = (data as UserProgress & { errors?: number }).errors ?? 0;
            totalSolved += solved;
            totalCorrect += solved;
            totalAttempted += solved + errors;
            if (data.medal === "green") medals.green++;
            if (data.medal === "grey") medals.grey++;
            if (data.medal === "bronze") medals.bronze++;
        });

        const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;
        return { totalSolved, accuracy, medals };
    } catch {
        return { totalSolved: 0, accuracy: 0, medals: { green: 0, grey: 0, bronze: 0 } };
    }
};

/**
 * Progress for one subject — uses CACHED userProgress collection.
 * Previously this made 1 Firestore read per subject (n subjects = n reads of the same data).
 * Now it's 0 extra reads after the first call.
 */
export const fetchSubjectProgress = async (
    userId: string,
    subjectId: string,
    topicIds: string[]
): Promise<{ medals: { green: number; grey: number; bronze: number }; progress: number }> => {
    try {
        const progress = await fetchRawProgress(userId);
        const medals = { green: 0, grey: 0, bronze: 0 };
        let completed = 0;

        for (const topicId of topicIds) {
            const data = progress.get(topicId);
            if (!data) continue;
            if (data.medal === "green") { medals.green++; completed++; }
            else if (data.medal === "grey") { medals.grey++; completed++; }
            else if (data.medal === "bronze") { medals.bronze++; completed++; }
        }

        const pct = topicIds.length > 0 ? Math.round((completed / topicIds.length) * 100) : 0;
        return { medals, progress: pct };
    } catch {
        return { medals: { green: 0, grey: 0, bronze: 0 }, progress: 0 };
    }
};

/** Badges — cached */
export const fetchUserBadges = (userId: string) =>
    pageCache.fetch(`badges:${userId}`, async () => {
        const snap = await getDocs(collection(db, "users", userId, "badges"));
        return snap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
        })) as Array<{
            id: string;
            name: string;
            description?: string;
            icon?: string;
            unlockedAt?: Date | { toDate: () => Date } | string | { seconds: number };
        }>;
    }, TTL_USER);

/** Daily activity map { "2026-06-25": solvedCount } */
export const fetchUserDailyActivity = async (userId: string): Promise<Record<string, number>> => {
    return pageCache.fetch(`daily-activity:${userId}`, async () => {
        // Точные дневные счётчики — пишутся при завершении каждого теста
        const actSnap = await getDocs(collection(db, "users", userId, "dailyActivity"));
        if (!actSnap.empty) {
            const daily: Record<string, number> = {};
            actSnap.forEach((d) => {
                const data = d.data() as { date?: string; solved?: number };
                const date = data.date ?? d.id;
                daily[date] = (daily[date] ?? 0) + (data.solved ?? 0);
            });
            return daily;
        }
        // Legacy fallback: приблизительная оценка по датам последнего обновления прогресса
        // (весь solvedQuestions топика относится к одному дню — неточно, но лучше пустоты)
        const snap = await getDocs(collection(db, "users", userId, "userProgress"));
        const daily: Record<string, number> = {};
        snap.forEach((d) => {
            const data = d.data();
            const ts = data.lastSolvedAt ?? data.updatedAt ?? data.completedAt;
            if (!ts) return;
            const date = ts?.toDate
                ? ts.toDate().toISOString().split("T")[0]
                : typeof ts === "string" ? ts.split("T")[0] : null;
            if (date) daily[date] = (daily[date] ?? 0) + (data.solvedQuestions ?? 1);
        });
        return daily;
    }, TTL_USER);
};

/** Invalidate all cached data for a user (call after writing progress) */
export const invalidateUserCache = (userId: string) => {
    pageCache.invalidate(`ratings:${userId}`);
    pageCache.invalidate(`progress:${userId}`);
    pageCache.invalidate(`badges:${userId}`);
    pageCache.invalidate(`daily-activity:${userId}`);
};
