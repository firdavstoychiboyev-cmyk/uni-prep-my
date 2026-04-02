import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { Class, SubjectRating } from "./firestore-schema";
import { pageCache } from "./page-cache";

const TTL = 2 * 60 * 1000; // 2 min

export const fetchStudentClasses = (studentId: string): Promise<Class[]> =>
    pageCache.fetch(`studentClasses:${studentId}`, async () => {
        const q = query(collection(db, "classes"), where("students", "array-contains", studentId));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Class);
    }, TTL);

// Shares cache key with stats-utils fetchUserSubjectRatings — same data, one read
export const fetchUserRatings = (userId: string): Promise<Record<string, number>> =>
    pageCache.fetch(`ratings:${userId}`, async () => {
        const snap = await getDocs(collection(db, "users", userId, "ratings"));
        const result: Record<string, number> = {};
        snap.forEach((d) => { result[d.id] = (d.data() as SubjectRating).stars || 0; });
        return result;
    }, TTL);

// Shares cache key with stats-utils fetchUserBadges
export const fetchUserBadges = (userId: string) =>
    pageCache.fetch(`badges:${userId}`, async () => {
        const snap = await getDocs(collection(db, "users", userId, "badges"));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
            id: string; name: string; description?: string; icon?: string;
            unlockedAt?: Date | { toDate: () => Date } | string | { seconds: number };
        }>;
    }, TTL);
