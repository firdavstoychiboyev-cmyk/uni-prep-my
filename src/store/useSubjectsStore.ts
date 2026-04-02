import { create } from "zustand";
import { Subject } from "../lib/firestore-schema";

interface SubjectsState {
    subjects: Subject[];
    loaded: boolean;
    setSubjects: (subjects: Subject[]) => void;
}

export const useSubjectsStore = create<SubjectsState>((set) => ({
    subjects: [],
    loaded: false,
    setSubjects: (subjects) => set({ subjects, loaded: true }),
}));
