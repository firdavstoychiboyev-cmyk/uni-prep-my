import {
    collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
    query, where, serverTimestamp, limit,
} from "firebase/firestore";
import { db } from "./firebase";
import {
    EntranceTest, EntranceTestAttempt, EntranceTestStatus, EntranceQuestionType, Language,
} from "./firestore-schema";
import { fetchRushQuestions, RushQuestion } from "./rush-utils";

export type EntranceQuestion = RushQuestion;

// ── Admin CRUD ───────────────────────────────────────────────────────────────

export const createEntranceTest = async (data: {
    grade: string;
    subjectId: string;
    questionCount: number;
    questionType: EntranceQuestionType;
    timeLimitMinutes: number;
    questionPoolRef: string;
    status: EntranceTestStatus;
    createdBy: string;
    language: Language;
    title?: string;
}): Promise<string> => {
    const ref = await addDoc(collection(db, "entranceTests"), {
        ...data,
        title: data.title ?? null,
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
    });
    return ref.id;
};

export const fetchAllEntranceTests = async (): Promise<EntranceTest[]> => {
    const snap = await getDocs(collection(db, "entranceTests"));
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as EntranceTest)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
};

export const setEntranceTestStatus = (id: string, status: EntranceTestStatus) =>
    updateDoc(doc(db, "entranceTests", id), { status });

export const deleteEntranceTest = (id: string) => deleteDoc(doc(db, "entranceTests", id));

// ── Student discovery ────────────────────────────────────────────────────────

/** Опубликованные тесты на языке ученика. */
export const fetchPublishedEntranceTests = async (language: Language): Promise<EntranceTest[]> => {
    const snap = await getDocs(query(
        collection(db, "entranceTests"),
        where("status", "==", "published"),
    ));
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as EntranceTest)
        .filter((t) => (t.language ?? "ru") === language);
};

/** Классы (grade), у которых есть опубликованный тест — для шага 1. */
export const gradesFromTests = (tests: EntranceTest[]): string[] =>
    Array.from(new Set(tests.map((t) => t.grade)))
        .sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));

/** Тест на конкретную пару grade+subject (первый опубликованный). */
export const findTest = (tests: EntranceTest[], grade: string, subjectId: string): EntranceTest | undefined =>
    tests.find((t) => t.grade === grade && t.subjectId === subjectId);

export const fetchEntranceTest = async (id: string): Promise<EntranceTest | null> => {
    const snap = await getDoc(doc(db, "entranceTests", id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as EntranceTest) : null;
};

// ── Questions ────────────────────────────────────────────────────────────────

/**
 * Вопросы теста: берём пул из mocks/{questionPoolRef}, фильтруем по типу
 * (mc → без open; open → только open; mixed → все) и отрезаем questionCount.
 */
export const buildEntranceQuestions = async (test: EntranceTest): Promise<EntranceQuestion[]> => {
    const mockSnap = await getDoc(doc(db, "mocks", test.questionPoolRef));
    const ids: string[] = (mockSnap.exists() ? (mockSnap.data().questionIds as string[]) : []) ?? [];
    if (ids.length === 0) return [];
    const all = await fetchRushQuestions(ids);
    const filtered = all.filter((q) => {
        if (test.questionType === "open") return q.type === "open";
        if (test.questionType === "mc") return q.type !== "open";
        return true; // mixed
    });
    return filtered.slice(0, test.questionCount);
};

// ── Attempts (timer authority = persisted expiresAt) ─────────────────────────

export const getOrCreateEntranceAttempt = async (
    test: EntranceTest,
    studentId: string,
    questionCount: number
): Promise<EntranceTestAttempt> => {
    const existing = await getDocs(query(
        collection(db, "entranceTestAttempts"),
        where("testId", "==", test.id),
        where("studentId", "==", studentId),
        limit(1),
    ));
    if (!existing.empty) {
        const d = existing.docs[0];
        return { id: d.id, ...d.data() } as EntranceTestAttempt;
    }
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + test.timeLimitMinutes * 60 * 1000);
    const data = {
        testId: test.id,
        studentId,
        subjectId: test.subjectId,
        grade: test.grade,
        answers: Array.from({ length: questionCount }, () => null) as (string | null)[],
        startedAt: startedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        fullscreenExitCount: 0,
    };
    const ref = await addDoc(collection(db, "entranceTestAttempts"), data);
    return { id: ref.id, ...data } as EntranceTestAttempt;
};

export const saveEntranceAnswers = (attemptId: string, answers: (string | null)[]) =>
    updateDoc(doc(db, "entranceTestAttempts", attemptId), { answers });

export const bumpFullscreenExit = (attemptId: string, count: number) =>
    updateDoc(doc(db, "entranceTestAttempts", attemptId), { fullscreenExitCount: count });

export const entranceRemainingMs = (attempt: EntranceTestAttempt, now = Date.now()): number =>
    Math.max(0, new Date(attempt.expiresAt).getTime() - now);

/** Автопроверка: число верных MC-ответов (open не оценивается). */
export const countEntranceCorrect = (questions: EntranceQuestion[], answers: (string | null)[]): number =>
    questions.reduce((n, q, i) => (q.type !== "open" && answers[i] === q.correctAnswer ? n + 1 : n), 0);

export const submitEntranceAttempt = async (
    attempt: EntranceTestAttempt,
    questions: EntranceQuestion[],
    answers: (string | null)[],
    fullscreenExitCount: number
): Promise<{ score: number; total: number }> => {
    const score = countEntranceCorrect(questions, answers);
    const total = questions.filter((q) => q.type !== "open").length;
    await updateDoc(doc(db, "entranceTestAttempts", attempt.id), {
        answers,
        submittedAt: new Date().toISOString(),
        score,
        total,
        fullscreenExitCount,
    });
    return { score, total };
};

// ── Fullscreen helper (must be called from a user gesture) ───────────────────

export const requestFullscreen = (el: HTMLElement | null) => {
    try {
        const target = el ?? document.documentElement;
        const req = target.requestFullscreen
            ?? (target as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen;
        return req?.call(target);
    } catch {
        /* браузер может отклонить без жеста — не критично */
    }
};

export const isFullscreen = (): boolean =>
    typeof document !== "undefined" && Boolean(document.fullscreenElement);
