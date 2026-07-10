/**
 * Scheduled / proctored mock exam system.
 *
 * Central place for the tunable constants (difficulty weights, grade bands) and
 * the scoring helpers shared by the student test flow and the admin grading
 * dashboard. Keeping them here — not scattered inline — means tuning the scheme
 * later is a one-file change.
 */

import { isOpenAnswerCorrect } from "./open-answer";

export type MockAttemptStatus = "in_progress" | "completed" | "auto_submitted";

// ── Difficulty weights (TUNABLE) ─────────────────────────────────────────────
// Points a question is worth by difficulty (Oson / O'rta / Qiyin).
// These are provisional and may be adjusted later — change them here only.
export const DIFFICULTY_WEIGHTS: Record<"easy" | "medium" | "hard", number> = {
    easy: 1,     // Oson
    medium: 1.5, // O'rta
    hard: 2,     // Qiyin
};

export const weightForDifficulty = (d?: string): number =>
    DIFFICULTY_WEIGHTS[(d as "easy" | "medium" | "hard")] ?? DIFFICULTY_WEIGHTS.easy;

/**
 * Point value of a question when scoring a mock exam.
 * Admin-entered `points` win; otherwise fall back to the difficulty weight.
 */
export const questionValue = (q: ScorableQuestion): number => {
    if (typeof q.points === "number" && !Number.isNaN(q.points) && q.points > 0) return q.points;
    return weightForDifficulty(q.difficulty);
};

// ── Grade bands (TUNABLE / PROVISIONAL) ──────────────────────────────────────
// Percentage → letter grade. Placeholder scheme — will likely be tuned later.
// Ordered high → low; first band whose `min` the percentage meets wins.
export const GRADE_BANDS: ReadonlyArray<{ min: number; grade: string }> = [
    { min: 86, grade: "A+" },
    { min: 70, grade: "A" },
    { min: 60, grade: "B+" },
    { min: 50, grade: "B" },
    { min: 40, grade: "C+" },
    { min: 0, grade: "C" },
];

export const gradeForPercentage = (pct: number): string =>
    GRADE_BANDS.find((b) => pct >= b.min)?.grade ?? "C";

// ── Scoring ──────────────────────────────────────────────────────────────────

/** Minimal question shape needed to score a mock attempt. */
export interface ScorableQuestion {
    id: string;
    type?: string; // "mc" (default) | "open" | "text"
    difficulty?: string;
    points?: number; // explicit admin-entered value; overrides difficulty weight
    correctAnswer?: string;
    acceptedAnswers?: string[];
}

export interface MockScoreResult {
    rawScore: number;          // # of auto-gradable questions answered correctly
    weightedScore: number;     // weighted points earned (MC auto + essay points)
    maxWeightedScore: number;  // weighted points available across all questions
    percentage: number;        // round(weighted / maxWeighted * 100)
    grade: string;
}

/**
 * Compute a mock attempt's score.
 *
 * - MC questions auto-grade: correct → full difficulty weight, else 0.
 * - Open/essay questions are graded by the admin. Their earned points come from
 *   `essayScores[questionId]` (0..weight); ungraded ones contribute 0 earned but
 *   still count their weight toward the maximum.
 *
 * `answers` is a map of questionId → the student's answer (MC letter or text).
 * `essayScores` is a map of questionId → admin-assigned points for open questions.
 */
export const computeMockScores = (
    questions: ScorableQuestion[],
    answers: Record<string, string | null>,
    essayScores: Record<string, number> = {},
): MockScoreResult => {
    let rawScore = 0;
    let weightedScore = 0;
    let maxWeightedScore = 0;

    for (const q of questions) {
        const weight = questionValue(q);
        maxWeightedScore += weight;
        const ans = answers[q.id];

        if (q.type === "open" || q.type === "text") {
            // Manually graded: earned points come from the admin's essay score.
            const pts = essayScores[q.id];
            if (typeof pts === "number" && !Number.isNaN(pts)) {
                weightedScore += pts;
                // Count as "raw correct" if the admin awarded full marks.
                if (pts >= weight) rawScore += 1;
            }
            continue;
        }

        // MC: exact match on the option letter.
        if (ans != null && ans === q.correctAnswer) {
            rawScore += 1;
            weightedScore += weight;
        }
    }

    const percentage = maxWeightedScore > 0
        ? Math.round((weightedScore / maxWeightedScore) * 100)
        : 0;

    return {
        rawScore,
        weightedScore: Math.round(weightedScore * 100) / 100,
        maxWeightedScore: Math.round(maxWeightedScore * 100) / 100,
        percentage,
        grade: gradeForPercentage(percentage),
    };
};

/**
 * Suggested auto-grade for an open question, used to pre-fill the admin grading
 * input: full weight if the student's answer matches an accepted answer, else 0.
 * The admin can always override.
 */
export const suggestedEssayScore = (q: ScorableQuestion, answer: string | null): number => {
    if (answer == null) return 0;
    return isOpenAnswerCorrect(answer, q) ? questionValue(q) : 0;
};

// ── Scheduling helpers ───────────────────────────────────────────────────────

/** A mock's scheduling window. All fields optional — absent = unscheduled. */
export interface MockSchedule {
    availableFrom?: string | null;    // ISO — students may start at/after this
    availableUntil?: string | null;   // ISO — hard cutoff: no start/resume after
    resultsRevealAt?: string | null;  // ISO — scores become visible at/after this
}

export type MockStartGate = "open" | "not_yet" | "closed";

/** Whether a scheduled mock can be started right now. */
export const mockStartGate = (m: MockSchedule, now = Date.now()): MockStartGate => {
    if (m.availableFrom && now < new Date(m.availableFrom).getTime()) return "not_yet";
    if (m.availableUntil && now > new Date(m.availableUntil).getTime()) return "closed";
    return "open";
};

/** Are results visible yet? Unscheduled (no resultsRevealAt) = always visible. */
export const resultsRevealed = (m: MockSchedule, now = Date.now()): boolean =>
    !m.resultsRevealAt || now >= new Date(m.resultsRevealAt).getTime();
