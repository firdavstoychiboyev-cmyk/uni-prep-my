/**
 * Rush (DTM-style) exam scoring — standalone, pure, testable.
 *
 * Pipeline (official national-certificate methodology):
 *   1. Rasch-based standardization:  Z = (θ − μ) / σ
 *   2. Standard score:               T = 50 + 10·Z
 *   3. Grade band mapping from T (bell-curve boundaries)
 *   4. Specialty-block subjects:     Ball = T · (subjectMaxScore / 65)
 *
 * All tunable numbers live in RUSH_SCORING_CONFIG — no magic numbers scattered
 * around. Nothing here touches Firestore or React; wire it up from utils/UI.
 *
 * ── ASSUMPTIONS TO CONFIRM (flagged to the product owner) ────────────────────
 * • θ (ability): a true Rasch ability estimate needs per-item difficulty
 *   parameters (b). Those are NOT ingested yet, so computeAbility() currently
 *   returns the raw number-correct. It is a separate, pluggable function so it
 *   can be swapped for a real MLE/EAP estimate once item calibration exists.
 * • μ/σ reference population: computed by the caller. We assume the population
 *   is "every student who took THIS session" (see rush-utils). For a solo
 *   manual session with a single attempt σ = 0, which cannot be standardized —
 *   computeZScore returns 0 (→ T = 50) in that case rather than dividing by 0.
 * • Specialty "studentScore": interpreted as the T-score, because 65 is the
 *   grade-A threshold on the T scale, so a student exactly at grade A earns the
 *   subject's full max score (T=65 ⇒ Ball = 65·max/65 = max).
 */

export type GradeType = "standard" | "specialty";

export interface GradeBand {
    /** Human label */
    grade: string;
    /** Inclusive lower bound on the T-score */
    min: number;
}

export interface SpecialtySubjectConfig {
    subjectId: string;
    /** Maximum possible score for this specialty subject (e.g. 93, 63) */
    maxScore: number;
}

export interface RushScoringConfig {
    /** T = tBase + tSlope · Z */
    tBase: number;
    tSlope: number;
    /** Grade-A threshold on the T scale; also the divisor in the specialty formula */
    gradeAThreshold: number;
    /** Grade bands, highest first; first band whose min ≤ T wins */
    gradeBands: GradeBand[];
}

/** Single source of truth for every scoring constant — adjust here only. */
export const RUSH_SCORING_CONFIG: RushScoringConfig = {
    tBase: 50,
    tSlope: 10,
    gradeAThreshold: 65,
    gradeBands: [
        { grade: "A+", min: 70 },
        { grade: "A", min: 65 },
        { grade: "B+", min: 60 },
        { grade: "B", min: 55 },
        { grade: "C+", min: 50 },
        { grade: "C", min: 46 },
        { grade: "<C", min: -Infinity },
    ],
};

export interface ReferenceStats {
    /** Mean ability across the reference population */
    mu: number;
    /** Standard deviation across the reference population */
    sigma: number;
}

export interface RushScore {
    rawScore: number;
    /** θ used for standardization */
    ability: number;
    zScore: number;
    tScore: number;
    /** Standard grade band label (always computed) */
    grade: string;
    gradeType: GradeType;
    /** Proportional score for specialty-block subjects (undefined for standard) */
    specialtyBall?: number;
}

// ── Pure steps ───────────────────────────────────────────────────────────────

/**
 * Ability estimate θ. Placeholder until item difficulty parameters are ingested:
 * returns the raw number-correct. Kept separate and pluggable on purpose.
 */
export function computeAbility(rawScore: number): number {
    // TODO: replace with a Rasch MLE/EAP estimate once item `b` params exist.
    return rawScore;
}

/** Z = (θ − μ) / σ. Guards σ = 0 (single/degenerate population) → 0. */
export function computeZScore(theta: number, mu: number, sigma: number): number {
    if (!Number.isFinite(sigma) || sigma === 0) return 0;
    return (theta - mu) / sigma;
}

/** T = tBase + tSlope · Z */
export function computeTScore(z: number, config: RushScoringConfig = RUSH_SCORING_CONFIG): number {
    return config.tBase + config.tSlope * z;
}

/** Map a T-score to its grade band label. */
export function mapGrade(t: number, config: RushScoringConfig = RUSH_SCORING_CONFIG): string {
    for (const band of config.gradeBands) {
        if (t >= band.min) return band.grade;
    }
    return config.gradeBands[config.gradeBands.length - 1].grade;
}

/** Specialty block: Ball = studentScore · (subjectMaxScore / gradeAThreshold). */
export function computeSpecialtyBall(
    studentScore: number,
    subjectMaxScore: number,
    config: RushScoringConfig = RUSH_SCORING_CONFIG
): number {
    return studentScore * (subjectMaxScore / config.gradeAThreshold);
}

/**
 * Population mean/σ from a set of ability values. Used by callers to build the
 * ReferenceStats for a session. σ is the population standard deviation.
 */
export function computeReferenceStats(abilities: number[]): ReferenceStats {
    const n = abilities.length;
    if (n === 0) return { mu: 0, sigma: 0 };
    const mu = abilities.reduce((s, a) => s + a, 0) / n;
    const variance = abilities.reduce((s, a) => s + (a - mu) ** 2, 0) / n;
    return { mu, sigma: Math.sqrt(variance) };
}

// ── Orchestrator ─────────────────────────────────────────────────────────────

export interface ScoreRushParams {
    rawScore: number;
    reference: ReferenceStats;
    /** Present ⇒ specialty-block subject; absent/null ⇒ standard grade band */
    specialty?: SpecialtySubjectConfig | null;
    /** Optional θ override; defaults to computeAbility(rawScore) */
    ability?: number;
    config?: RushScoringConfig;
}

/** Full pipeline: raw answers count + subject config → scored result. */
export function scoreRush(params: ScoreRushParams): RushScore {
    const config = params.config ?? RUSH_SCORING_CONFIG;
    const ability = params.ability ?? computeAbility(params.rawScore);
    const zScore = computeZScore(ability, params.reference.mu, params.reference.sigma);
    const tScore = computeTScore(zScore, config);
    const grade = mapGrade(tScore, config);

    if (params.specialty) {
        return {
            rawScore: params.rawScore,
            ability,
            zScore,
            tScore,
            grade,
            gradeType: "specialty",
            specialtyBall: computeSpecialtyBall(tScore, params.specialty.maxScore, config),
        };
    }

    return { rawScore: params.rawScore, ability, zScore, tScore, grade, gradeType: "standard" };
}
