import { create } from "zustand";
import { GlobalStats } from "@/lib/stats-utils";

export interface SubjectProgress {
    stars: number;
    medals: { green: number; grey: number; bronze: number };
    progress: number;
}

interface StatsStore {
    stats: GlobalStats | null;
    subjectProgress: Record<string, SubjectProgress>;
    ratings: Record<string, number>;
    loadedForUser: string | null;

    setStats: (stats: GlobalStats) => void;
    setSubjectProgress: (subjectId: string, progress: SubjectProgress) => void;
    setRatings: (ratings: Record<string, number>) => void;
    setLoadedForUser: (userId: string) => void;
    reset: () => void;
}

export const useStatsStore = create<StatsStore>((set) => ({
    stats: null,
    subjectProgress: {},
    ratings: {},
    loadedForUser: null,

    setStats: (stats) => set({ stats }),
    setSubjectProgress: (subjectId, progress) =>
        set((s) => ({ subjectProgress: { ...s.subjectProgress, [subjectId]: progress } })),
    setRatings: (ratings) => set({ ratings }),
    setLoadedForUser: (userId) => set({ loadedForUser: userId }),
    reset: () => set({ stats: null, subjectProgress: {}, ratings: {}, loadedForUser: null }),
}));
