import {
    collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc, deleteDoc,
    query, where, documentId, serverTimestamp, limit,
} from "firebase/firestore";
import { db } from "./firebase";
import { RushSession, RushAttempt, Language, User } from "./firestore-schema";
import {
    scoreRush, computeReferenceStats, SpecialtySubjectConfig, RushScore,
} from "./scoring/rushScoring";
import { fetchStudentClasses } from "./profile-utils";
import { fetchTopicById } from "./data-fetching";

export const RUSH_QUESTION_COUNT = 55;
export const RUSH_DURATION_MIN = 120;
const RUSH_DURATION_MS = RUSH_DURATION_MIN * 60 * 1000;

/**
 * Предметы «блока специальности» (mutaxassislik fanlari) и их максимальный балл.
 * Ключ — id документа предмета (subjects/{id}). По умолчанию пусто: заполните,
 * когда подтвердим соответствие предмет→макс.балл (в примерах 93 и 63).
 * Пример: { "PjdH4iHajJRzlLRHK2v8": 93, "z5rbueVFQvlmwUNGlwsJ": 63 }
 */
export const SPECIALTY_SUBJECT_MAX_SCORES: Record<string, number> = {};

export const getSpecialtyConfig = (subjectId: string): SpecialtySubjectConfig | null => {
    const maxScore = SPECIALTY_SUBJECT_MAX_SCORES[subjectId];
    return typeof maxScore === "number" ? { subjectId, maxScore } : null;
};

// ── Rush question shape (superset of mock question) ──────────────────────────

export interface RushQuestion {
    id: string;
    text: string;
    options?: { a: string; b: string; c: string; d: string };
    correctAnswer: string;
    type?: string;        // "mc" (default) | "open"
    explanation?: string;
    imageUrl?: string;
    topicId?: string;
    domain?: string;
    skill?: string;
}

// ── Ranking scope abstraction (session now; cumulative later) ────────────────

export type RankingScope = "session" | "cumulative";

/**
 * Область ранжирования. Пока всегда "session" (сравниваем только тех, кто
 * прошёл ЭТУ сессию). Точка расширения: вернуть "cumulative", когда добавим
 * сквозной рейтинг по всем rush-попыткам — сигнатуры rankAttempts не изменятся.
 */
export function getRankingScope(): RankingScope {
    // TODO: switch to "cumulative" once cross-session rush ranking is designed.
    return "session";
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const chunk = <T>(arr: T[], size: number): T[][] => {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

/** Batch-load questions by id, preserving the session's order. */
export const fetchRushQuestions = async (questionIds: string[]): Promise<RushQuestion[]> => {
    if (questionIds.length === 0) return [];
    const byId = new Map<string, RushQuestion>();
    const snaps = await Promise.all(
        chunk(questionIds, 10).map((ids) =>
            getDocs(query(collection(db, "questions"), where(documentId(), "in", ids)))
        )
    );
    snaps.forEach((s) => s.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() } as RushQuestion)));
    return questionIds.map((id) => byId.get(id)).filter((q): q is RushQuestion => Boolean(q));
};

/**
 * Pull the fixed question set for a subject from the ingested mock pool.
 * Prefers an explicit mock; otherwise the newest active mock for the subject.
 * Returns { questionIds, sourceMockId, shortfall } — shortfall > 0 flags that
 * the pool had fewer than 55 questions (see schema/ingestion caveat).
 */
export const pickRushQuestionSet = async (
    subjectId: string,
    language: Language,
    mockId?: string
): Promise<{ questionIds: string[]; sourceMockId?: string; shortfall: number } | null> => {
    let mockDoc;
    if (mockId) {
        const snap = await getDoc(doc(db, "mocks", mockId));
        if (snap.exists()) mockDoc = { id: snap.id, ...snap.data() } as { id: string; questionIds?: string[] };
    } else {
        const snap = await getDocs(query(
            collection(db, "mocks"),
            where("subject", "==", subjectId),
            where("active", "==", true),
            where("language", "==", language),
        ));
        const withQs = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as { id: string; questionIds?: string[] }))
            .filter((m) => (m.questionIds?.length ?? 0) > 0);
        mockDoc = withQs[0];
    }
    if (!mockDoc?.questionIds?.length) return null;
    const questionIds = mockDoc.questionIds.slice(0, RUSH_QUESTION_COUNT);
    return {
        questionIds,
        sourceMockId: mockDoc.id,
        shortfall: Math.max(0, RUSH_QUESTION_COUNT - questionIds.length),
    };
};

// ── Session creation ─────────────────────────────────────────────────────────

/** Manual: a student starts a rush for a subject right now. Returns session id. */
export const createManualRushSession = async (
    user: User,
    subjectId: string,
    mockId?: string
): Promise<string> => {
    const language = (user.language ?? "ru") as Language;
    const picked = await pickRushQuestionSet(subjectId, language, mockId);
    if (!picked) throw new Error("no-questions-for-subject");
    const ref = await addDoc(collection(db, "rushSessions"), {
        subjectId,
        questionIds: picked.questionIds,
        sourceMockId: picked.sourceMockId ?? null,
        status: "active",
        createdBy: user.id,
        creatorRole: "student",
        language,
        createdAt: new Date().toISOString(),
    });
    return ref.id;
};

/** Scheduled: teacher/admin releases a rush to a group within a time window. */
export const scheduleGroupRush = async (params: {
    subjectId: string;
    mockId: string;
    groupId: string;
    scheduledFor: string;    // ISO
    windowEnd?: string;      // ISO
    createdBy: string;
    creatorRole: "teacher" | "admin";
    language: Language;
    title?: string;
}): Promise<string> => {
    const picked = await pickRushQuestionSet(params.subjectId, params.language, params.mockId);
    if (!picked) throw new Error("no-questions-for-subject");
    const ref = await addDoc(collection(db, "rushSessions"), {
        subjectId: params.subjectId,
        questionIds: picked.questionIds,
        sourceMockId: picked.sourceMockId ?? null,
        status: "scheduled",
        createdBy: params.createdBy,
        creatorRole: params.creatorRole,
        groupId: params.groupId,
        scheduledFor: params.scheduledFor,
        windowEnd: params.windowEnd ?? null,
        language: params.language,
        title: params.title ?? null,
        createdAt: new Date().toISOString(),
    });
    return ref.id;
};

/** All rush sessions scheduled for a specific group, newest first (admin view). */
export const fetchGroupRushSessions = async (groupId: string): Promise<RushSession[]> => {
    const snap = await getDocs(query(collection(db, "rushSessions"), where("groupId", "==", groupId)));
    return snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as RushSession))
        .sort((a, b) => (b.scheduledFor ?? b.createdAt).localeCompare(a.scheduledFor ?? a.createdAt));
};

/** Cancel a scheduled rush (admin/teacher who owns it, or any admin). */
export const deleteRushSession = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "rushSessions", id));
};

export const fetchRushSession = async (id: string): Promise<RushSession | null> => {
    const snap = await getDoc(doc(db, "rushSessions", id));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as RushSession) : null;
};

/** Sessions a student can see: their own manual ones + scheduled ones for their groups. */
export const fetchAvailableRushSessions = async (user: User): Promise<RushSession[]> => {
    const byId = new Map<string, RushSession>();

    const mine = await getDocs(query(collection(db, "rushSessions"), where("createdBy", "==", user.id)));
    mine.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() } as RushSession));

    const classes = await fetchStudentClasses(user.id);
    const classIds = classes.map((c) => c.id);
    await Promise.all(
        chunk(classIds, 10).map(async (ids) => {
            const snap = await getDocs(query(collection(db, "rushSessions"), where("groupId", "in", ids)));
            snap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() } as RushSession));
        })
    );

    return Array.from(byId.values()).sort((a, b) =>
        (b.scheduledFor ?? b.createdAt).localeCompare(a.scheduledFor ?? a.createdAt)
    );
};

/** Is a scheduled session currently open to start? (manual sessions are always open) */
export const isRushOpen = (session: RushSession, now = Date.now()): boolean => {
    if (session.creatorRole === "student") return true;
    if (!session.scheduledFor) return true;
    const opens = new Date(session.scheduledFor).getTime();
    if (now < opens) return false;
    if (session.windowEnd && now > new Date(session.windowEnd).getTime()) return false;
    return true;
};

// ── Attempts (timer authority) ───────────────────────────────────────────────

/**
 * Get the student's attempt for a session, creating it (starting the personal
 * 120-min clock) on first call. startedAt/expiresAt persist so the timer
 * survives refresh — remaining time is derived from expiresAt, not client state.
 */
export const getOrCreateRushAttempt = async (
    session: RushSession,
    studentId: string
): Promise<RushAttempt> => {
    const existing = await getDocs(query(
        collection(db, "rushAttempts"),
        where("sessionId", "==", session.id),
        where("studentId", "==", studentId),
        limit(1),
    ));
    if (!existing.empty) {
        const d = existing.docs[0];
        return { id: d.id, ...d.data() } as RushAttempt;
    }
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + RUSH_DURATION_MS);
    const data = {
        sessionId: session.id,
        studentId,
        subjectId: session.subjectId,
        answers: session.questionIds.map(() => null) as (string | null)[],
        startedAt: startedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, "rushAttempts"), data);
    return { id: ref.id, ...data } as unknown as RushAttempt;
};

/** Autosave in-progress answers (so a refresh keeps them). */
export const saveRushAnswers = (attemptId: string, answers: (string | null)[]) =>
    updateDoc(doc(db, "rushAttempts", attemptId), { answers });

/** ms of time left for an attempt, from the persisted expiresAt. */
export const rushRemainingMs = (attempt: RushAttempt, now = Date.now()): number =>
    Math.max(0, new Date(attempt.expiresAt).getTime() - now);

// ── Scoring / submit ─────────────────────────────────────────────────────────

/** Count correct MC answers (open questions are not auto-graded). */
export const countRushCorrect = (questions: RushQuestion[], answers: (string | null)[]): number =>
    questions.reduce((n, q, i) => (q.type !== "open" && answers[i] === q.correctAnswer ? n + 1 : n), 0);

/**
 * Submit an attempt: grade it and persist the scoring result.
 *
 * μ/σ reference population = raw scores of every attempt of THIS session that
 * has already been submitted, plus this one. (FLAGGED: session-scoped is an
 * assumption; and because earlier submitters see a smaller cohort, grades can
 * shift as more students submit — a proper cohort-final recompute would need a
 * batch job. See rushScoring.ts header.)
 */
export const submitRushAttempt = async (
    attempt: RushAttempt,
    questions: RushQuestion[],
    answers: (string | null)[],
    autoSubmitted: boolean
): Promise<RushScore> => {
    const rawScore = countRushCorrect(questions, answers);

    // Reference population: submitted attempts of this session (θ = raw score).
    const others = await getDocs(query(
        collection(db, "rushAttempts"),
        where("sessionId", "==", attempt.sessionId),
    ));
    const abilities: number[] = [];
    others.docs.forEach((d) => {
        const a = d.data() as RushAttempt;
        if (d.id !== attempt.id && a.submittedAt && typeof a.rawScore === "number") abilities.push(a.rawScore);
    });
    abilities.push(rawScore);
    const reference = computeReferenceStats(abilities);

    const score = scoreRush({
        rawScore,
        reference,
        specialty: getSpecialtyConfig(attempt.subjectId),
    });

    await updateDoc(doc(db, "rushAttempts", attempt.id), {
        answers,
        submittedAt: new Date().toISOString(),
        autoSubmitted,
        rawScore: score.rawScore,
        zScore: score.zScore,
        tScore: score.tScore,
        grade: score.grade,
        gradeType: score.gradeType,
        specialtyBall: score.specialtyBall ?? null,
    });

    // Solo session becomes completed once its single attempt is submitted.
    if (attempt.subjectId && attempt.sessionId) {
        try {
            const s = await fetchRushSession(attempt.sessionId);
            if (s?.creatorRole === "student") {
                await setDoc(doc(db, "rushSessions", attempt.sessionId), { status: "completed" }, { merge: true });
            }
        } catch { /* non-fatal */ }
    }

    return score;
};

// ── Ranking (scope: session) ─────────────────────────────────────────────────

export interface RushRankRow {
    attemptId: string;
    studentId: string;
    tScore: number;
    rawScore: number;
    grade: string;
    rank: number;
}

/**
 * Rank submitted attempts. Scope from getRankingScope() — currently "session":
 * only students who took this exact session are compared. Competition ranking
 * (ties share a rank).
 */
export const fetchRushRanking = async (sessionId: string): Promise<RushRankRow[]> => {
    const scope = getRankingScope();
    // scope === "session": one query on this session's attempts.
    // TODO(cumulative): branch here to aggregate best/mean tScore across sessions.
    const snap = await getDocs(query(collection(db, "rushAttempts"), where("sessionId", "==", sessionId)));
    const rows = snap.docs
        .map((d) => d.data() as RushAttempt)
        .filter((a) => a.submittedAt && typeof a.tScore === "number")
        .map((a) => ({
            attemptId: `${a.sessionId}:${a.studentId}`,
            studentId: a.studentId,
            tScore: a.tScore as number,
            rawScore: a.rawScore ?? 0,
            grade: a.grade ?? "",
            rank: 0,
        }))
        .sort((x, y) => y.tScore - x.tScore || y.rawScore - x.rawScore);

    let rank = 0;
    let prev: number | null = null;
    rows.forEach((r, i) => {
        if (prev === null || r.tScore !== prev) { rank = i + 1; prev = r.tScore; }
        r.rank = rank;
    });
    void scope;
    return rows;
};

// ── Weak topics (extends the mistakes/subject-analytics pattern) ─────────────

export interface RushWeakTopic {
    key: string;
    label: string;
    wrong: number;
    total: number;
    wrongPct: number;
}

/**
 * Break down wrong answers by topic within the subject, worst-first. Ingested
 * mock questions may lack a topicId (Excel path only sets subjectId), so we
 * group by topicId when present, else by domain/skill, else a single bucket.
 */
export const fetchRushWeakTopics = async (
    questions: RushQuestion[],
    answers: (string | null)[]
): Promise<RushWeakTopic[]> => {
    const agg = new Map<string, { wrong: number; total: number; topicId?: string; fallback: string }>();
    questions.forEach((q, i) => {
        if (q.type === "open") return; // not auto-graded
        const key = q.topicId ? `t:${q.topicId}` : q.domain ? `d:${q.domain}` : q.skill ? `s:${q.skill}` : "general";
        const cur = agg.get(key) ?? { wrong: 0, total: 0, topicId: q.topicId, fallback: q.domain ?? q.skill ?? "" };
        cur.total += 1;
        if (answers[i] !== q.correctAnswer) cur.wrong += 1;
        agg.set(key, cur);
    });

    const rows = await Promise.all(
        Array.from(agg.entries()).map(async ([key, v]) => {
            let label = v.fallback;
            if (v.topicId) {
                const topic = await fetchTopicById(v.topicId);
                label = topic?.title ?? v.fallback;
            }
            return {
                key,
                label: label || "—",
                wrong: v.wrong,
                total: v.total,
                wrongPct: v.total > 0 ? Math.round((v.wrong / v.total) * 100) : 0,
            } as RushWeakTopic;
        })
    );

    return rows.filter((r) => r.wrong > 0).sort((a, b) => b.wrong - a.wrong || b.wrongPct - a.wrongPct);
};
