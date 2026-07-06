import {
    collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, writeBatch,
    query, where, serverTimestamp, limit,
} from "firebase/firestore";
import { db } from "./firebase";
import {
    EntranceTest, EntranceTestAttempt, EntranceTestStatus, EntranceQuestionType,
    EntranceQuestionSource, EntranceSet, Language,
} from "./firestore-schema";
import { fetchRushQuestions, RushQuestion } from "./rush-utils";

export type EntranceQuestion = RushQuestion;

const matchesType = (t: string | undefined, want: EntranceQuestionType) =>
    want === "open" ? t === "open" : want === "mc" ? t !== "open" : true;

/** Фиксация Fisher–Yates: случайная выборка один раз при создании теста. */
const sample = <T>(arr: T[], n: number): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a.slice(0, n);
};

// ── General question bank ─────────────────────────────────────────────────────

/**
 * Общий предметный банк предмета = ВСЕ вопросы предмета, независимо от класса
 * (класс только помечает тест, но не ограничивает пул). Вопросы предмета бывают
 * двух видов тегирования:
 *   • практика/импорт — тег topicId (subjectId на вопросе НЕТ); достаём через
 *     темы предмета (topics.subjectId == X) → questions.topicId;
 *   • mock/entrance-XLSX — тег subjectId прямо на вопросе.
 *
 * ЯЗЫК НЕ ФИЛЬТРУЕМ. Документы предметов раздельные по языку (uz-док и ru-док —
 * это разные записи с разными id), поэтому темы и вопросы под конкретным
 * subjectId уже принадлежат языку этого предмета. Раньше банк дополнительно
 * фильтровался по language, который админка передавала из user.language, а не
 * из UI-стора: для uz-предмета Tarix (id z5rbueVFQvlmwUNGlwsJ, 18 uz-тем, 535
 * uz-вопросов) с language="ru" оставалось 0 тем → 0 вопросов → ложное
 * «недостаточно вопросов». Убрали языковой фильтр — считаем строго по subjectId.
 */
export const fetchGeneralBankQuestions = async (
    subjectId: string,
    questionType: EntranceQuestionType
): Promise<RushQuestion[]> => {
    // 1) Темы предмета → их вопросы (topicId-тегированные: практика/импорт)
    const topicSnap = await getDocs(query(collection(db, "topics"), where("subjectId", "==", subjectId)));
    const perTopic = await Promise.all(
        topicSnap.docs.map((td) => getDocs(query(collection(db, "questions"), where("topicId", "==", td.id))))
    );

    // 2) Вопросы, тегированные напрямую subjectId (mock/entrance-XLSX)
    const directSnap = await getDocs(query(collection(db, "questions"), where("subjectId", "==", subjectId)));

    const byId = new Map<string, RushQuestion>();
    for (const snap of [...perTopic, directSnap]) {
        for (const d of snap.docs) {
            const q = { id: d.id, ...d.data() } as RushQuestion;
            if (matchesType(q.type, questionType)) byId.set(q.id, q);
        }
    }
    return Array.from(byId.values());
};

// ── Dedicated entrance sets ───────────────────────────────────────────────────

export const fetchEntranceSets = async (
    grade: string,
    subjectId: string,
    language: Language
): Promise<EntranceSet[]> => {
    const snap = await getDocs(query(
        collection(db, "entranceSets"),
        where("grade", "==", grade),
        where("subjectId", "==", subjectId),
    ));
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as EntranceSet)
        .filter((s) => (s.language ?? "ru") === language)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
};

/**
 * Загрузка отдельного набора из XLSX — тем же механизмом, что и Mocklar
 * (лист «Вопросы», те же колонки). Вопросы пишутся в общую коллекцию questions
 * с флагом isEntranceQuestion + grade + subjectId; набор — в entranceSets.
 */
export const uploadEntranceSet = async (
    file: File,
    meta: { title: string; grade: string; subjectId: string; language: Language; createdBy: string }
): Promise<{ setId: string; count: number }> => {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(await file.arrayBuffer());
    const sheet = workbook.Sheets["Вопросы"] ?? workbook.Sheets[workbook.SheetNames[0]];
    const rows = (XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[])
        .filter((r) => String(r["Текст вопроса"] ?? "").trim());

    const questionIds: string[] = [];
    let batch = writeBatch(db);
    let n = 0;
    for (const row of rows) {
        const ref = doc(collection(db, "questions"));
        questionIds.push(ref.id);
        batch.set(ref, {
            text: String(row["Текст вопроса"] ?? "").trim(),
            options: {
                a: String(row["Вариант A"] ?? "").trim(),
                b: String(row["Вариант B"] ?? "").trim(),
                c: String(row["Вариант C"] ?? "").trim(),
                d: String(row["Вариант D"] ?? "").trim(),
            },
            correctAnswer: String(row["Правильный ответ (a/b/c/d)"] ?? "").trim().toLowerCase() || "a",
            type: String(row["Тип (mc/open)"] ?? "mc").trim() || "mc",
            difficulty: String(row["Сложность"] ?? "medium").trim() || "medium",
            explanation: String(row["Объяснение (необязательно)"] ?? "").trim(),
            subjectId: meta.subjectId,
            grade: meta.grade,
            language: meta.language,
            isEntranceQuestion: true,
            createdAt: new Date(),
        });
        if (++n === 400) { await batch.commit(); batch = writeBatch(db); n = 0; }
    }
    if (n > 0) await batch.commit();

    const setRef = await addDoc(collection(db, "entranceSets"), {
        title: meta.title,
        grade: meta.grade,
        subjectId: meta.subjectId,
        questionIds,
        questionCount: questionIds.length,
        language: meta.language,
        createdBy: meta.createdBy,
        createdAt: new Date().toISOString(),
    });
    return { setId: setRef.id, count: questionIds.length };
};

// ── Admin CRUD ───────────────────────────────────────────────────────────────

/**
 * Создание теста. Набор вопросов ФИКСИРУЕТСЯ здесь (одинаков для всех учеников):
 *  - general  → случайная выборка questionCount из предметного банка;
 *  - dedicated→ из questionIds выбранного набора, отфильтрованных по типу.
 */
export const createEntranceTest = async (data: {
    grade: string;
    subjectId: string;
    questionCount: number;
    questionType: EntranceQuestionType;
    timeLimitMinutes: number;
    questionSource: EntranceQuestionSource;
    dedicatedSetId?: string;
    status: EntranceTestStatus;
    createdBy: string;
    language: Language;
    title?: string;
}): Promise<string> => {
    let questionIds: string[] = [];
    if (data.questionSource === "general") {
        const pool = await fetchGeneralBankQuestions(data.subjectId, data.questionType);
        questionIds = sample(pool, data.questionCount).map((q) => q.id);
    } else if (data.dedicatedSetId) {
        const setSnap = await getDoc(doc(db, "entranceSets", data.dedicatedSetId));
        const ids = (setSnap.exists() ? (setSnap.data().questionIds as string[]) : []) ?? [];
        const qs = await fetchRushQuestions(ids);
        questionIds = qs.filter((q) => matchesType(q.type, data.questionType)).slice(0, data.questionCount).map((q) => q.id);
    }
    const ref = await addDoc(collection(db, "entranceTests"), {
        grade: data.grade,
        subjectId: data.subjectId,
        questionCount: data.questionCount,
        questionType: data.questionType,
        timeLimitMinutes: data.timeLimitMinutes,
        questionSource: data.questionSource,
        dedicatedSetId: data.dedicatedSetId ?? null,
        questionIds,
        status: data.status,
        createdBy: data.createdBy,
        language: data.language,
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
 * Вопросы теста. Приоритет — зафиксированный при создании набор questionIds
 * (одинаков для всех учеников). Легаси-путь (старые тесты) — пул mock по
 * questionPoolRef с фильтром по типу.
 */
export const buildEntranceQuestions = async (test: EntranceTest): Promise<EntranceQuestion[]> => {
    if (test.questionIds && test.questionIds.length > 0) {
        return fetchRushQuestions(test.questionIds);
    }
    if (!test.questionPoolRef) return [];
    const mockSnap = await getDoc(doc(db, "mocks", test.questionPoolRef));
    const ids: string[] = (mockSnap.exists() ? (mockSnap.data().questionIds as string[]) : []) ?? [];
    if (ids.length === 0) return [];
    const all = await fetchRushQuestions(ids);
    const filtered = all.filter((q) => matchesType(q.type, test.questionType));
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
