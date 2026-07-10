/**
 * Firestore access for mockAttempts/{attemptId} — the per-student record of a
 * scheduled/proctored mock exam. Deterministic id `${mockId}_${studentId}`
 * guarantees one attempt per student per mock and lets us read it directly.
 */

import {
    collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where,
} from "firebase/firestore";
import { db } from "./firebase";
import { MockAttempt, MockAttemptStatus } from "./firestore-schema";

export const attemptId = (mockId: string, studentId: string) => `${mockId}_${studentId}`;

export const fetchMockAttempt = async (
    mockId: string,
    studentId: string,
): Promise<MockAttempt | null> => {
    const snap = await getDoc(doc(db, "mockAttempts", attemptId(mockId, studentId)));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as MockAttempt) : null;
};

/** Create the in-progress attempt on test start (idempotent via merge:false guard upstream). */
export const startMockAttempt = async (
    mockId: string,
    studentId: string,
): Promise<void> => {
    const id = attemptId(mockId, studentId);
    await setDoc(doc(db, "mockAttempts", id), {
        studentId,
        mockId,
        answers: {},
        status: "in_progress" as MockAttemptStatus,
        startedAt: new Date().toISOString(),
        fullscreenExitAt: null,
        violations: [],
        submittedAt: null,
    });
};

/** Persist the latest answers map while the attempt is still in progress. */
export const saveMockAttemptAnswers = async (
    mockId: string,
    studentId: string,
    answers: Record<string, string | null>,
): Promise<void> => {
    await updateDoc(doc(db, "mockAttempts", attemptId(mockId, studentId)), { answers });
};

/** Append a light proctoring incident (non-disqualifying fullscreen exit/return). */
export const logMockViolation = async (
    mockId: string,
    studentId: string,
    type: string,
    existing: { at: string; type: string }[] = [],
): Promise<void> => {
    const at = new Date().toISOString();
    await updateDoc(doc(db, "mockAttempts", attemptId(mockId, studentId)), {
        fullscreenExitAt: at,
        violations: [...existing, { at, type }],
    });
};

/** Finalise the attempt (normal or auto-submit). Score fields computed by caller. */
export const submitMockAttempt = async (
    mockId: string,
    studentId: string,
    payload: {
        answers: Record<string, string | null>;
        status: Extract<MockAttemptStatus, "completed" | "auto_submitted">;
        rawScore: number;
        weightedScore: number;
        maxWeightedScore: number;
        percentage: number;
        grade: string;
    },
): Promise<void> => {
    await updateDoc(doc(db, "mockAttempts", attemptId(mockId, studentId)), {
        ...payload,
        submittedAt: new Date().toISOString(),
    });
};

/** All attempts for a mock (admin grading dashboard). */
export const fetchAttemptsForMock = async (mockId: string): Promise<MockAttempt[]> => {
    const snap = await getDocs(query(collection(db, "mockAttempts"), where("mockId", "==", mockId)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MockAttempt));
};

/** Save admin essay scores + recomputed totals for an attempt. */
export const saveEssayGrades = async (
    id: string,
    payload: {
        essayScores: Record<string, number>;
        rawScore: number;
        weightedScore: number;
        maxWeightedScore: number;
        percentage: number;
        grade: string;
        gradedBy: string;
    },
): Promise<void> => {
    await updateDoc(doc(db, "mockAttempts", id), {
        ...payload,
        gradedAt: new Date().toISOString(),
    });
};
