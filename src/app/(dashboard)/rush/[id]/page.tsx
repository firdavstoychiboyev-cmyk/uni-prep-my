"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    Clock, ChevronLeft, ChevronRight, Zap, Play, Trophy, AlertTriangle, PenLine,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fetchSubjectById } from "@/lib/data-fetching";
import MathText from "@/components/MathText";
import MockReview from "@/components/mock-review";
import {
    fetchRushSession, fetchRushQuestions, getOrCreateRushAttempt, saveRushAnswers,
    submitRushAttempt, rushRemainingMs, isRushOpen,
    fetchRushRanking, fetchRushWeakTopics, RushQuestion, RushWeakTopic,
} from "@/lib/rush-utils";
import { RushSession, RushAttempt, Subject } from "@/lib/firestore-schema";
import { RushScore } from "@/lib/scoring/rushScoring";
import { resultsRevealed } from "@/lib/mock-exam";

const OPTION_KEYS = ["a", "b", "c", "d"] as const;

const fmtClock = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

type Phase = "loading" | "intro" | "locked" | "exam" | "results" | "held";

export default function RushTakePage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuthStore();
    const { t, language } = useTranslation();

    const [phase, setPhase] = useState<Phase>("loading");
    const [session, setSession] = useState<RushSession | null>(null);
    const [subject, setSubject] = useState<Subject | null>(null);
    const [questions, setQuestions] = useState<RushQuestion[]>([]);
    const [attempt, setAttempt] = useState<RushAttempt | null>(null);
    const [answers, setAnswers] = useState<(string | null)[]>([]);
    const [idx, setIdx] = useState(0);
    const [remaining, setRemaining] = useState(0);
    const [showGrid, setShowGrid] = useState(false);
    const [showSubmit, setShowSubmit] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [score, setScore] = useState<RushScore | null>(null);
    const [rank, setRank] = useState<{ rank: number; total: number } | null>(null);
    const [weak, setWeak] = useState<RushWeakTopic[]>([]);

    const answersRef = useRef(answers);
    answersRef.current = answers;
    const submittedRef = useRef(false);

    // ── Load session + questions; resume or show intro ───────────────────────
    useEffect(() => {
        if (!user || !id) return;
        let cancelled = false;
        (async () => {
            const s = await fetchRushSession(id as string);
            if (!s) { if (!cancelled) setPhase("locked"); return; }
            const [qs, subj] = await Promise.all([
                fetchRushQuestions(s.questionIds),
                fetchSubjectById(s.subjectId),
            ]);
            if (cancelled) return;
            setSession(s);
            setSubject(subj);
            setQuestions(qs);

            // Existing attempt? (resume or results)
            const att = await getOrCreateRushAttemptIfStarted(s, user.id);
            if (cancelled) return;
            if (att?.submittedAt) {
                setAttempt(att);
                setAnswers(att.answers ?? qs.map(() => null));
                // Gate: if a reveal time is set and hasn't passed, hold results.
                if (!resultsRevealed(s)) {
                    setPhase("held");
                } else {
                    await loadResults(s, qs, att);
                    setPhase("results");
                }
            } else if (att) {
                setAttempt(att);
                setAnswers(att.answers ?? qs.map(() => null));
                setPhase("exam");
            } else if (!isRushOpen(s)) {
                setPhase("locked");
            } else {
                setPhase("intro");
            }
        })();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, id]);

    // Only fetch an existing attempt on load (do NOT create — creation = "begin")
    const getOrCreateRushAttemptIfStarted = async (s: RushSession, uid: string): Promise<RushAttempt | null> => {
        const { collection, getDocs, query, where, limit } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const snap = await getDocs(query(
            collection(db, "rushAttempts"),
            where("sessionId", "==", s.id),
            where("studentId", "==", uid),
            limit(1),
        ));
        if (snap.empty) return null;
        const d = snap.docs[0];
        return { id: d.id, ...d.data() } as RushAttempt;
    };

    const loadResults = useCallback(async (s: RushSession, qs: RushQuestion[], att: RushAttempt) => {
        const [ranking, weakTopics] = await Promise.all([
            fetchRushRanking(s.id),
            fetchRushWeakTopics(qs, att.answers ?? []),
        ]);
        const myIndex = ranking.findIndex((r) => r.studentId === att.studentId);
        setRank(myIndex >= 0 ? { rank: ranking[myIndex].rank, total: ranking.length } : null);
        setWeak(weakTopics);
        setScore({
            rawScore: att.rawScore ?? 0,
            ability: att.rawScore ?? 0,
            zScore: att.zScore ?? 0,
            tScore: att.tScore ?? 0,
            grade: att.grade ?? "",
            gradeType: (att.gradeType ?? "standard") as RushScore["gradeType"],
            specialtyBall: att.specialtyBall ?? undefined,
        });
    }, []);

    const doSubmit = useCallback(async (auto: boolean) => {
        if (!attempt || !session || submittedRef.current) return;
        submittedRef.current = true;
        setSubmitting(true);
        try {
            const result = await submitRushAttempt(attempt, questions, answersRef.current, auto);
            const updated = { ...attempt, ...result, answers: answersRef.current, submittedAt: new Date().toISOString(), autoSubmitted: auto } as RushAttempt;
            setAttempt(updated);
            // Gate: hold results until the session's reveal time passes.
            if (!resultsRevealed(session)) {
                setPhase("held");
            } else {
                await loadResults(session, questions, updated);
                setScore(result);
                setPhase("results");
            }
        } catch (e) {
            console.error("Rush submit failed:", e);
            submittedRef.current = false;
        } finally {
            setSubmitting(false);
            setShowSubmit(false);
        }
    }, [attempt, session, questions, loadResults]);

    // ── Timer (authority = persisted expiresAt) ──────────────────────────────
    useEffect(() => {
        if (phase !== "exam" || !attempt) return;
        const tick = () => {
            const ms = rushRemainingMs(attempt);
            setRemaining(ms);
            if (ms <= 0) doSubmit(true);
        };
        tick();
        const iv = setInterval(tick, 1000);
        return () => clearInterval(iv);
    }, [phase, attempt, doSubmit]);

    // ── Autosave answers (debounced) ─────────────────────────────────────────
    useEffect(() => {
        if (phase !== "exam" || !attempt) return;
        const to = setTimeout(() => { saveRushAnswers(attempt.id, answersRef.current).catch(() => {}); }, 1200);
        return () => clearTimeout(to);
    }, [answers, phase, attempt]);

    const begin = async () => {
        if (!session || !user) return;
        setPhase("loading");
        const att = await getOrCreateRushAttempt(session, user.id);
        setAttempt(att);
        setAnswers(att.answers ?? questions.map(() => null));
        setPhase("exam");
    };

    const selectAnswer = (key: string) => {
        setAnswers((prev) => { const n = [...prev]; n[idx] = key; return n; });
    };
    const setOpenAnswer = (val: string) => {
        setAnswers((prev) => { const n = [...prev]; n[idx] = val.trim() ? val : null; return n; });
    };

    const subjectName = subject?.name ?? "";

    // ── Render ───────────────────────────────────────────────────────────────

    if (phase === "loading") {
        return <div className="p-8 text-muted-foreground">{language === "uz" ? "Yuklanmoqda…" : "Загрузка…"}</div>;
    }

    if (phase === "locked") {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground/40" />
                <p className="font-bold text-foreground">{t("rush.notOpenYet")}</p>
                <button onClick={() => router.push("/rush")} className="text-sm font-semibold text-blue-600 hover:underline">
                    {t("rush.backToRush")}
                </button>
            </div>
        );
    }

    if (phase === "intro") {
        return (
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-16 text-center">
                <div className="rounded-2xl bg-amber-100 p-4 dark:bg-amber-950/40">
                    <Zap className="h-10 w-10 text-amber-500" />
                </div>
                <h1 className="text-3xl font-black text-foreground">{session?.title || subjectName}</h1>
                <div className="grid w-full grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="text-2xl font-black text-foreground">{questions.length}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{language === "uz" ? "Savollar" : "Вопросов"}</div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4">
                        <div className="text-2xl font-black text-foreground">2:00:00</div>
                        <div className="mt-1 text-xs text-muted-foreground">{language === "uz" ? "Vaqt" : "Время"}</div>
                    </div>
                </div>
                <p className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-300">
                    {t("rush.beginNote")}
                </p>
                <button
                    onClick={begin}
                    className="mt-2 inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-4 text-lg font-bold text-background transition-all hover:opacity-90 active:scale-[0.97]"
                >
                    <Play className="h-5 w-5" /> {t("rush.begin")}
                </button>
            </div>
        );
    }

    if (phase === "held") {
        const revealStr = session?.resultsRevealAt
            ? new Date(session.resultsRevealAt).toLocaleString(language === "uz" ? "uz-UZ" : "ru-RU", {
                day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
            })
            : "";
        return (
            <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-16 text-center">
                <div className="rounded-2xl bg-blue-100 p-4 dark:bg-blue-950/40">
                    <Clock className="h-10 w-10 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-2xl font-black text-foreground">{session?.title || subjectName}</h1>
                {attempt?.autoSubmitted && (
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                        {t("rush.autoSubmitted")}
                    </span>
                )}
                <p className="text-lg font-bold text-foreground">{t("rush.answersSaved")}</p>
                {revealStr && (
                    <p className="text-muted-foreground">{t("rush.resultsAt")}: <span className="font-semibold text-foreground">{revealStr}</span></p>
                )}
                <button onClick={() => router.push("/rush")} className="mt-2 rounded-full bg-foreground px-8 py-3 font-bold text-background hover:opacity-90">
                    {t("rush.backToRush")}
                </button>
            </div>
        );
    }

    if (phase === "results" && score) {
        const total = questions.filter((q) => q.type !== "open").length;
        return (
            <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
                <div className="flex flex-col items-center gap-3 text-center">
                    <Trophy className="h-12 w-12 text-amber-500" />
                    <h1 className="text-2xl font-black text-foreground">{t("rush.yourResult")}</h1>
                    {attempt?.autoSubmitted && (
                        <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                            {t("rush.autoSubmitted")}
                        </span>
                    )}
                </div>

                {/* Grade + metrics */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Metric label={t("rush.grade")} value={score.grade} big />
                    <Metric label={t("rush.tScore")} value={score.tScore.toFixed(1)} />
                    <Metric label={t("rush.correctAnswers")} value={`${score.rawScore}/${total}`} />
                    {score.gradeType === "specialty" && typeof score.specialtyBall === "number" ? (
                        <Metric label={t("rush.specialtyBall")} value={score.specialtyBall.toFixed(1)} />
                    ) : (
                        <Metric label={t("rush.rank")} value={rank ? `${rank.rank}/${rank.total}` : "—"} />
                    )}
                </div>
                {score.gradeType === "specialty" && rank && (
                    <Metric label={t("rush.rank")} value={`${rank.rank}/${rank.total}`} />
                )}

                {/* Weak topics — worst first, bar list */}
                <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                    <div className="mb-4 flex items-center gap-2.5">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <h2 className="text-[15px] font-bold text-foreground">{t("rush.weakTopics")}</h2>
                    </div>
                    {weak.length === 0 ? (
                        <p className="py-4 text-center text-sm font-medium text-muted-foreground">{t("rush.noWeakTopics")}</p>
                    ) : (
                        <ul className="flex flex-col gap-4">
                            {weak.map((w) => (
                                <li key={w.key}>
                                    <div className="mb-1.5 flex items-center justify-between gap-3">
                                        <span className="truncate text-sm font-semibold text-foreground">{w.label}</span>
                                        <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                                            {w.wrong}/{w.total} <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] text-red-600 dark:bg-red-950/40 dark:text-red-400">{w.wrongPct}%</span>
                                        </span>
                                    </div>
                                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                        <div className="h-full rounded-full bg-red-500/80" style={{ width: `${w.total > 0 ? Math.round((w.wrong / w.total) * 100) : 0}%` }} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                {/* Full per-question review (reuses the mock review component) */}
                <section>
                    <h2 className="mb-4 text-xl font-black text-foreground">{t("mock.review.title")}</h2>
                    <MockReview questions={questions} answers={attempt?.answers ?? answers} />
                </section>

                <button onClick={() => router.push("/rush")} className="mx-auto rounded-full bg-foreground px-8 py-3 font-bold text-background hover:opacity-90">
                    {t("rush.backToRush")}
                </button>
            </div>
        );
    }

    // ── Exam ─────────────────────────────────────────────────────────────────
    const q = questions[idx];
    const answeredCount = answers.filter((a) => a !== null).length;
    const isOpen = q?.type === "open";

    return (
        <>
            <div className="fixed inset-0 z-50 flex flex-col bg-background">
                {/* Top bar */}
                <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
                    <button onClick={() => setShowSubmit(true)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
                        {t("rush.submit")}
                    </button>
                    <div className="text-xl font-black tabular-nums" style={{ color: remaining < 600000 ? "#ef4444" : undefined }}>
                        {fmtClock(remaining)}
                    </div>
                    <div className="text-sm font-semibold text-muted-foreground">{idx + 1} / {questions.length}</div>
                </div>

                {/* Question */}
                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-3xl px-6 py-8">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-sm font-black text-background">{idx + 1}</div>
                        {q?.imageUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={q.imageUrl} alt="" className="mb-4 max-h-72 rounded-xl border border-border object-contain" />
                        )}
                        <div className="mb-6 ql-content">
                            <MathText content={q?.text ?? ""} className="text-foreground" style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.2rem", lineHeight: "1.8" }} />
                        </div>

                        {isOpen ? (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400"><PenLine className="h-3.5 w-3.5" /> {t("rush.answered")}</div>
                                <textarea
                                    value={answers[idx] ?? ""}
                                    onChange={(e) => setOpenAnswer(e.target.value)}
                                    rows={4}
                                    className="w-full resize-y rounded-2xl border-2 border-border bg-card px-5 py-4 text-foreground focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {OPTION_KEYS.map((key) => {
                                    const val = q?.options?.[key];
                                    if (!val) return null;
                                    const selected = answers[idx] === key;
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => selectAnswer(key)}
                                            className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all ${selected ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-border bg-card hover:border-muted-foreground/50"}`}
                                        >
                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-bold ${selected ? "border-blue-500 bg-blue-500 text-white" : "border-border text-muted-foreground"}`}>
                                                {key.toUpperCase()}
                                            </div>
                                            <span className="ql-content font-medium text-foreground"><MathText content={val} as="span" /></span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="relative shrink-0">
                    {showGrid && (
                        <div className="absolute bottom-full left-0 right-0 max-h-64 overflow-y-auto border-t border-border bg-background p-4 shadow-lg">
                            <div className="grid grid-cols-8 gap-2">
                                {questions.map((_, i) => (
                                    <button key={i} onClick={() => { setIdx(i); setShowGrid(false); }}
                                        className={`h-10 w-10 rounded-xl text-sm font-bold ${answers[i] !== null ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"} ${i === idx ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}>
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-between border-t border-border px-6 py-4">
                        <button onClick={() => { setIdx((i) => Math.max(0, i - 1)); setShowGrid(false); }} disabled={idx === 0} className="rounded-xl p-2 hover:bg-muted disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
                        <button onClick={() => setShowGrid((s) => !s)} className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 hover:bg-muted/80">
                            <span className="font-bold text-foreground">{answeredCount} / {questions.length}</span>
                            <span className="text-xs text-muted-foreground">{t("rush.answered")}</span>
                        </button>
                        <button onClick={() => { setShowGrid(false); if (idx === questions.length - 1) setShowSubmit(true); else setIdx((i) => i + 1); }} className="rounded-xl p-2 hover:bg-muted"><ChevronRight className="h-5 w-5" /></button>
                    </div>
                </div>
            </div>

            {showSubmit && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-background p-8 shadow-xl">
                        <h2 className="mb-2 flex items-center gap-2 text-xl font-black text-foreground"><Clock className="h-5 w-5" /> {t("rush.submit")}</h2>
                        <p className="mb-2 text-sm text-muted-foreground">{answeredCount} / {questions.length} {t("rush.answered")}</p>
                        <p className="mb-6 text-sm text-muted-foreground">{t("rush.submitConfirm")}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowSubmit(false)} disabled={submitting} className="flex-1 rounded-xl border border-border py-3 font-semibold text-foreground hover:bg-muted">{t("rush.continue")}</button>
                            <button onClick={() => doSubmit(false)} disabled={submitting} className="flex-1 rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{t("rush.submit")}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function Metric({ label, value, big }: { label: string; value: string; big?: boolean }) {
    return (
        <div className="rounded-xl border border-border bg-card p-4 text-center">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className={`font-black tabular-nums text-foreground ${big ? "text-4xl" : "text-2xl"}`}>{value}</div>
        </div>
    );
}
