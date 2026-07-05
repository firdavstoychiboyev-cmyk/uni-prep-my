"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    GraduationCap, ChevronLeft, ChevronRight, Play, Clock, Trophy, Maximize, AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fetchSubjects } from "@/lib/data-fetching";
import MathText from "@/components/MathText";
import MockReview from "@/components/mock-review";
import SubjectGridCard from "@/components/subject-grid-card";
import {
    fetchPublishedEntranceTests, gradesFromTests, findTest, fetchEntranceTest,
    buildEntranceQuestions, getOrCreateEntranceAttempt, saveEntranceAnswers,
    submitEntranceAttempt, entranceRemainingMs, bumpFullscreenExit,
    requestFullscreen, isFullscreen, EntranceQuestion,
} from "@/lib/entrance-utils";
import { EntranceTest, EntranceTestAttempt, Subject, Language } from "@/lib/firestore-schema";

const OPTION_KEYS = ["a", "b", "c", "d"] as const;
const fmtClock = (ms: number) => {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

type Phase = "grade" | "subject" | "intro" | "exam" | "results";

export default function EntrancePage() {
    const { user } = useAuthStore();
    const { t, language } = useTranslation();
    const router = useRouter();

    const [phase, setPhase] = useState<Phase>("grade");
    const [tests, setTests] = useState<EntranceTest[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [grade, setGrade] = useState("");
    const [test, setTest] = useState<EntranceTest | null>(null);

    const [questions, setQuestions] = useState<EntranceQuestion[]>([]);
    const [attempt, setAttempt] = useState<EntranceTestAttempt | null>(null);
    const [answers, setAnswers] = useState<(string | null)[]>([]);
    const [idx, setIdx] = useState(0);
    const [remaining, setRemaining] = useState(0);
    const [showGrid, setShowGrid] = useState(false);
    const [showSubmit, setShowSubmit] = useState(false);
    const [result, setResult] = useState<{ score: number; total: number } | null>(null);

    // Полноэкранный режим / анти-чит
    const [fsActive, setFsActive] = useState(false);
    const [fsExits, setFsExits] = useState(0);
    const fsExitsRef = useRef(0);

    const answersRef = useRef(answers); answersRef.current = answers;
    const submittedRef = useRef(false);
    const rootRef = useRef<HTMLDivElement>(null);

    // Только для Registan-учеников; иначе назад на главную
    useEffect(() => {
        if (!user) return;
        if (user.organization !== "registan" || user.role !== "student") { router.replace("/home"); return; }
        (async () => {
            const [ts, subs] = await Promise.all([
                fetchPublishedEntranceTests((user.language ?? "ru") as Language),
                fetchSubjects(),
            ]);
            setTests(ts);
            setSubjects(subs);
        })();
    }, [user, router]);

    // Слежение за полноэкранным режимом + счётчик выходов
    useEffect(() => {
        const onFs = () => {
            const active = isFullscreen();
            setFsActive(active);
            if (!active && phase === "exam" && !submittedRef.current && attempt) {
                const n = fsExitsRef.current + 1;
                fsExitsRef.current = n;
                setFsExits(n);
                bumpFullscreenExit(attempt.id, n).catch(() => {});
            }
        };
        document.addEventListener("fullscreenchange", onFs);
        return () => document.removeEventListener("fullscreenchange", onFs);
    }, [phase, attempt]);

    const grades = useMemo(() => gradesFromTests(tests), [tests]);
    const gradeSubjects = useMemo(() => {
        const ids = new Set(tests.filter((x) => x.grade === grade).map((x) => x.subjectId));
        return subjects.filter((s) => ids.has(s.id));
    }, [tests, subjects, grade]);

    const doSubmit = useCallback(async (auto: boolean) => {
        if (!attempt || submittedRef.current) return;
        submittedRef.current = true;
        try {
            const r = await submitEntranceAttempt(attempt, questions, answersRef.current, fsExitsRef.current);
            setResult(r);
            setPhase("results");
            if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        } catch (e) {
            console.error("Entrance submit failed:", e);
            submittedRef.current = false;
        }
        void auto;
        setShowSubmit(false);
    }, [attempt, questions]);

    // Таймер (источник — expiresAt попытки)
    useEffect(() => {
        if (phase !== "exam" || !attempt) return;
        const tick = () => {
            const ms = entranceRemainingMs(attempt);
            setRemaining(ms);
            if (ms <= 0) doSubmit(true);
        };
        tick();
        const iv = setInterval(tick, 1000);
        return () => clearInterval(iv);
    }, [phase, attempt, doSubmit]);

    // Автосохранение ответов
    useEffect(() => {
        if (phase !== "exam" || !attempt) return;
        const to = setTimeout(() => saveEntranceAnswers(attempt.id, answersRef.current).catch(() => {}), 1200);
        return () => clearTimeout(to);
    }, [answers, phase, attempt]);

    // Boshlash: полноэкранный запрос СИНХРОННО в обработчике клика (жест)
    const begin = () => {
        if (!test || !user) return;
        requestFullscreen(rootRef.current); // синхронно — удовлетворяет требование жеста
        (async () => {
            const full = await fetchEntranceTest(test.id) ?? test;
            const qs = await buildEntranceQuestions(full);
            const att = await getOrCreateEntranceAttempt(full, user.id, qs.length);
            setQuestions(qs);
            setAttempt(att);
            setAnswers(att.answers?.length === qs.length ? att.answers : qs.map(() => null));
            fsExitsRef.current = att.fullscreenExitCount ?? 0;
            setFsExits(fsExitsRef.current);
            setPhase("exam");
        })();
    };

    const selectAnswer = (key: string) => setAnswers((p) => { const n = [...p]; n[idx] = key; return n; });
    const setOpen = (v: string) => setAnswers((p) => { const n = [...p]; n[idx] = v.trim() ? v : null; return n; });

    if (!user) return <div className="p-8 text-muted-foreground">…</div>;

    // ── Grade step ──
    if (phase === "grade") {
        return (
            <div className="flex flex-col gap-6 py-4">
                <Header t={t} />
                <h2 className="text-xl font-bold text-foreground">{t("entrance.chooseGrade")}</h2>
                {grades.length === 0 ? (
                    <Empty t={t} />
                ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {grades.map((g) => (
                            <button key={g} onClick={() => { setGrade(g); setPhase("subject"); }}
                                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-6 text-lg font-black text-foreground transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md">
                                <GraduationCap size={20} className="text-muted-foreground" />
                                {t("entrance.grade", { grade: g })}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── Subject step (reuses Fanlar SubjectGridCard) ──
    if (phase === "subject") {
        return (
            <div className="flex flex-col gap-6 py-4">
                <Header t={t} />
                <button onClick={() => setPhase("grade")} className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
                    <ChevronLeft size={16} /> {t("entrance.back")}
                </button>
                <h2 className="text-xl font-bold text-foreground">{t("entrance.grade", { grade })} · {t("entrance.chooseSubject")}</h2>
                <div className="grid grid-cols-1 gap-5 min-[1180px]:grid-cols-2">
                    {gradeSubjects.map((s) => {
                        const tst = findTest(tests, grade, s.id);
                        return (
                            <SubjectGridCard
                                key={s.id}
                                subject={s}
                                onSelect={() => { if (tst) { setTest(tst); setPhase("intro"); } }}
                                subtitle={tst ? t("entrance.meta", { count: tst.questionCount, min: tst.timeLimitMinutes }) : undefined}
                                cta={t("entrance.start")}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }

    // ── Intro / start ──
    if (phase === "intro" && test) {
        const subjName = subjects.find((s) => s.id === test.subjectId)?.name ?? "";
        return (
            <div ref={rootRef} className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-16 text-center">
                <div className="rounded-2xl bg-blue-100 p-4 dark:bg-blue-950/40"><GraduationCap className="h-10 w-10 text-blue-600 dark:text-blue-400" /></div>
                <h1 className="text-3xl font-black text-foreground">{t("entrance.grade", { grade: test.grade })} · {subjName}</h1>
                <div className="grid w-full grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border bg-card p-4"><div className="text-2xl font-black text-foreground">{test.questionCount}</div><div className="mt-1 text-xs text-muted-foreground">{language === "uz" ? "Savollar" : "Вопросов"}</div></div>
                    <div className="rounded-xl border border-border bg-card p-4"><div className="text-2xl font-black text-foreground">{test.timeLimitMinutes}′</div><div className="mt-1 text-xs text-muted-foreground">{language === "uz" ? "Vaqt" : "Время"}</div></div>
                </div>
                <p className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-300">{t("entrance.beginNote")}</p>
                <button onClick={begin} className="mt-2 inline-flex items-center gap-2 rounded-full bg-foreground px-8 py-4 text-lg font-bold text-background transition-all hover:opacity-90 active:scale-[0.97]">
                    <Play className="h-5 w-5" /> {t("entrance.start")}
                </button>
                <button onClick={() => setPhase("subject")} className="text-sm font-semibold text-muted-foreground hover:text-foreground">{t("entrance.back")}</button>
            </div>
        );
    }

    // ── Results ──
    if (phase === "results" && result) {
        return (
            <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12">
                <div className="flex flex-col items-center gap-3 text-center">
                    <Trophy className="h-12 w-12 text-amber-500" />
                    <h1 className="text-2xl font-black text-foreground">{t("entrance.result")}</h1>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border bg-card p-5 text-center"><div className="text-4xl font-black text-foreground">{result.score}/{result.total}</div><div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{t("entrance.correct")}</div></div>
                    <div className="rounded-xl border border-border bg-card p-5 text-center"><div className="text-4xl font-black text-foreground">{fsExits}</div><div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{t("entrance.fsExits", { count: "" }).replace(/:\s*$/, "")}</div></div>
                </div>
                <section>
                    <h2 className="mb-4 text-xl font-black text-foreground">{t("mock.review.title")}</h2>
                    <MockReview questions={questions} answers={attempt?.answers ?? answers} />
                </section>
                <button onClick={() => router.push("/home")} className="mx-auto rounded-full bg-foreground px-8 py-3 font-bold text-background hover:opacity-90">{t("entrance.back")}</button>
            </div>
        );
    }

    // ── Exam (fullscreen) ──
    const q = questions[idx];
    const answeredCount = answers.filter((a) => a !== null).length;
    const isOpen = q?.type === "open";

    return (
        <div ref={rootRef}>
            <div className="fixed inset-0 z-50 flex flex-col bg-background">
                <div className="flex shrink-0 items-center justify-between border-b border-border px-6 py-3">
                    <button onClick={() => setShowSubmit(true)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">{t("entrance.submit")}</button>
                    <div className="text-xl font-black tabular-nums" style={{ color: remaining < 300000 ? "#ef4444" : undefined }}>{fmtClock(remaining)}</div>
                    <div className="text-sm font-semibold text-muted-foreground">{idx + 1} / {questions.length}</div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-3xl px-6 py-8">
                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground text-sm font-black text-background">{idx + 1}</div>
                        {q?.imageUrl && /* eslint-disable-next-line @next/next/no-img-element */ <img src={q.imageUrl} alt="" className="mb-4 max-h-72 rounded-xl border border-border object-contain" />}
                        <div className="mb-6 ql-content"><MathText content={q?.text ?? ""} className="text-foreground" style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: "1.2rem", lineHeight: "1.8" }} /></div>
                        {isOpen ? (
                            <textarea value={answers[idx] ?? ""} onChange={(e) => setOpen(e.target.value)} rows={4}
                                className="w-full resize-y rounded-2xl border-2 border-border bg-card px-5 py-4 text-foreground focus:border-blue-500 focus:outline-none" />
                        ) : (
                            <div className="flex flex-col gap-3">
                                {OPTION_KEYS.map((key) => {
                                    const val = q?.options?.[key]; if (!val) return null;
                                    const sel = answers[idx] === key;
                                    return (
                                        <button key={key} onClick={() => selectAnswer(key)}
                                            className={`flex items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-all ${sel ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-border bg-card hover:border-muted-foreground/50"}`}>
                                            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 text-sm font-bold ${sel ? "border-blue-500 bg-blue-500 text-white" : "border-border text-muted-foreground"}`}>{key.toUpperCase()}</div>
                                            <span className="ql-content font-medium text-foreground"><MathText content={val} as="span" /></span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="relative shrink-0">
                    {showGrid && (
                        <div className="absolute bottom-full left-0 right-0 max-h-64 overflow-y-auto border-t border-border bg-background p-4 shadow-lg">
                            <div className="grid grid-cols-8 gap-2">
                                {questions.map((_, i) => (
                                    <button key={i} onClick={() => { setIdx(i); setShowGrid(false); }} className={`h-10 w-10 rounded-xl text-sm font-bold ${answers[i] !== null ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground"} ${i === idx ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}>{i + 1}</button>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex items-center justify-between border-t border-border px-6 py-4">
                        <button onClick={() => { setIdx((i) => Math.max(0, i - 1)); setShowGrid(false); }} disabled={idx === 0} className="rounded-xl p-2 hover:bg-muted disabled:opacity-30"><ChevronLeft className="h-5 w-5" /></button>
                        <button onClick={() => setShowGrid((s) => !s)} className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2 hover:bg-muted/80"><span className="font-bold text-foreground">{answeredCount} / {questions.length}</span><span className="text-xs text-muted-foreground">{t("entrance.answered")}</span></button>
                        <button onClick={() => { setShowGrid(false); if (idx === questions.length - 1) setShowSubmit(true); else setIdx((i) => i + 1); }} className="rounded-xl p-2 hover:bg-muted"><ChevronRight className="h-5 w-5" /></button>
                    </div>
                </div>
            </div>

            {/* Anti-cheat: overlay when fullscreen is exited mid-test */}
            {phase === "exam" && !fsActive && !submittedRef.current && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
                    <div className="w-full max-w-md rounded-2xl bg-background p-8 text-center shadow-xl">
                        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
                        <h2 className="mb-2 text-xl font-black text-foreground">{t("entrance.fsTitle")}</h2>
                        <p className="mb-2 text-sm text-muted-foreground">{t("entrance.fsText")}</p>
                        <p className="mb-6 text-xs font-semibold text-red-500">{t("entrance.fsExits", { count: fsExits })}</p>
                        <button onClick={() => requestFullscreen(rootRef.current)} className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 font-bold text-background hover:opacity-90">
                            <Maximize size={16} /> {t("entrance.fsReturn")}
                        </button>
                    </div>
                </div>
            )}

            {showSubmit && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-background p-8 shadow-xl">
                        <h2 className="mb-2 flex items-center gap-2 text-xl font-black text-foreground"><Clock className="h-5 w-5" /> {t("entrance.submit")}</h2>
                        <p className="mb-2 text-sm text-muted-foreground">{answeredCount} / {questions.length} {t("entrance.answered")}</p>
                        <p className="mb-6 text-sm text-muted-foreground">{t("entrance.submitConfirm")}</p>
                        <div className="flex gap-3">
                            <button onClick={() => setShowSubmit(false)} className="flex-1 rounded-xl border border-border py-3 font-semibold text-foreground hover:bg-muted">{t("entrance.continue")}</button>
                            <button onClick={() => doSubmit(false)} className="flex-1 rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700">{t("entrance.submit")}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Header({ t }: { t: (k: string) => string }) {
    return (
        <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                <GraduationCap className="h-7 w-7 text-blue-500" /> {t("entrance.title")}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("entrance.subtitle")}</p>
        </div>
    );
}
function Empty({ t }: { t: (k: string) => string }) {
    return <div className="rounded-2xl border border-border bg-muted/50 px-6 py-16 text-center text-muted-foreground dark:bg-muted/30">{t("entrance.noTests")}</div>;
}
