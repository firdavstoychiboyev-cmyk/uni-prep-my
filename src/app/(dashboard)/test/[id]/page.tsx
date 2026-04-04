"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Question, Topic } from "@/lib/firestore-schema";
import { fetchTopicById, fetchQuestionsByTopic, fetchTopicsByTextbook } from "@/lib/data-fetching";
import { useAuthStore } from "@/store/useAuthStore";
import { invalidateUserCache } from "@/lib/stats-utils";
import { useStatsStore } from "@/store/useStatsStore";
import { db } from "@/lib/firebase";
import {
    doc, setDoc, updateDoc, increment, serverTimestamp,
    collection, addDoc, getDoc, getDocs,
} from "firebase/firestore";
import {
    CheckCircle2, XCircle, RefreshCw, Award, Medal as MedalIcon, ShieldCheck, AlertCircle,
    Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Pause, Play, Eye, EyeOff,
    LayoutGrid, X, ArrowLeft, Info, Clock, Strikethrough, ChevronUp,
    MoreVertical, Maximize2, Minimize2,
} from "lucide-react";
import { getMedalByErrors } from "@/lib/constants";

/* ─── types ─────────────────────────────────────────── */
type QStatus = "unanswered" | "correct" | "incorrect";
interface QState { status: QStatus; marked: boolean; answer: string; }
function blank(n: number): QState[] {
    return Array.from({ length: n }, () => ({ status: "unanswered" as QStatus, marked: false, answer: "" }));
}
function fmt(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

async function requestElFullscreen(el: HTMLElement): Promise<void> {
    const anyEl = el as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };
    if (el.requestFullscreen) {
        await el.requestFullscreen();
        return;
    }
    if (anyEl.webkitRequestFullscreen) await Promise.resolve(anyEl.webkitRequestFullscreen());
}

async function exitDocumentFullscreen(): Promise<void> {
    const anyDoc = document as Document & {
        webkitExitFullscreen?: () => Promise<void> | void;
        webkitFullscreenElement?: Element | null;
    };
    const inFs = document.fullscreenElement ?? anyDoc.webkitFullscreenElement;
    if (!inFs) return;
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (anyDoc.webkitExitFullscreen) await Promise.resolve(anyDoc.webkitExitFullscreen());
}

/* ─── page ───────────────────────────────────────────── */
export default function TestPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuthStore();
    const { reset: resetStats } = useStatsStore();

    const [topic, setTopic] = useState<Topic | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFinished, setIsFinished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [subjectId, setSubjectId] = useState<string | null>(null);

    // Per-question state
    const [qStates, setQStates] = useState<QState[]>([]);
    const qStatesRef = useRef<QState[]>([]);
    useEffect(() => { qStatesRef.current = qStates; }, [qStates]);

    // Current question state
    const [idx, setIdx] = useState(0);
    const [answer, setAnswer] = useState("");
    const [checked, setChecked] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);

    // Cross-out: show letter circles beside options + per-question crossed keys
    const [showCrossOutColumn, setShowCrossOutColumn] = useState(false);
    const [crossedOut, setCrossedOut] = useState<Record<number, string[]>>({});

    // UI overlays
    const [showBank, setShowBank] = useState(false);
    const [groupAnswered, setGroupAnswered] = useState(false);
    const [showInfo, setShowInfo] = useState(false);

    // Timer
    const [secs, setSecs] = useState(0);
    const [paused, setPaused] = useState(false);
    const [timerVisible, setTimerVisible] = useState(true);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Results review
    const [reviewIdx, setReviewIdx] = useState(0);

    // Fullscreen + «Ещё» menu
    const testShellRef = useRef<HTMLDivElement>(null);
    const moreMenuWrapRef = useRef<HTMLDivElement>(null);
    const [moreMenuOpen, setMoreMenuOpen] = useState(false);
    const [fullscreenActive, setFullscreenActive] = useState(false);

    useEffect(() => {
        const sync = () => {
            const el = testShellRef.current;
            const fs =
                document.fullscreenElement ??
                (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement;
            setFullscreenActive(Boolean(el && fs === el));
        };
        sync();
        document.addEventListener("fullscreenchange", sync);
        document.addEventListener("webkitfullscreenchange", sync as EventListener);
        return () => {
            document.removeEventListener("fullscreenchange", sync);
            document.removeEventListener("webkitfullscreenchange", sync as EventListener);
        };
    }, []);

    useEffect(() => {
        if (!moreMenuOpen) return;
        const close = (e: MouseEvent) => {
            if (moreMenuWrapRef.current?.contains(e.target as Node)) return;
            setMoreMenuOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [moreMenuOpen]);

    const toggleTestFullscreen = useCallback(async () => {
        const el = testShellRef.current;
        if (!el) return;
        const fs =
            document.fullscreenElement ??
            (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement;
        try {
            if (fs === el) await exitDocumentFullscreen();
            else await requestElFullscreen(el);
        } catch {
            /* API может быть недоступен (iOS и т.д.) */
        }
        setMoreMenuOpen(false);
    }, []);

    /* ─ load ─ */
    useEffect(() => {
        if (!id) return;
        Promise.all([fetchTopicById(id as string), fetchQuestionsByTopic(id as string)]).then(([t, qs]) => {
            setTopic(t);
            setQuestions(qs);
            setQStates(blank(qs.length));
            setIsLoading(false);
        });
    }, [id]);

    /* ─ timer ─ */
    useEffect(() => {
        if (isFinished || isLoading || paused) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }
        timerRef.current = setInterval(() => setSecs((s) => s + 1), 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [paused, isFinished, isLoading]);

    /* ─ derived ─ */
    const q = questions[idx];
    const isText = q?.type === "text" || (!!q && !q.options?.a && !q.options?.b);
    const qState = qStates[idx] ?? { status: "unanswered", marked: false, answer: "" };
    const crossedForQ = crossedOut[idx] ?? [];

    const correctCount = useMemo(() => qStates.filter((s) => s.status === "correct").length, [qStates]);
    const errorCount = useMemo(() => qStates.filter((s) => s.status === "incorrect").length, [qStates]);
    const answeredCount = useMemo(() => qStates.filter((s) => s.status !== "unanswered").length, [qStates]);

    /* ─ navigate to question ─ */
    const goTo = useCallback((i: number) => {
        const s = qStatesRef.current[i];
        setIdx(i);
        setAnswer(s?.answer ?? "");
        setChecked(s?.status !== "unanswered");
        setShowExplanation(false);
        setShowBank(false);
        setShowInfo(false);
    }, []);

    /* ─ check answer (показывает фидбэк, не блокирует варианты) ─ */
    const handleCheck = useCallback(() => {
        if (!q || checked || !answer.trim()) return;
        setChecked(true);
    }, [q, checked, answer]);

    /* ─ toggle mark ─ */
    const toggleMark = useCallback(() => {
        setQStates((prev) => {
            const next = [...prev];
            next[idx] = { ...next[idx], marked: !next[idx].marked };
            return next;
        });
    }, [idx]);

    const toggleCrossOutOption = useCallback((key: string) => {
        setCrossedOut((prev) => {
            const cur = prev[idx] ?? [];
            const set = new Set(cur);
            if (set.has(key)) set.delete(key);
            else set.add(key);
            return { ...prev, [idx]: Array.from(set) };
        });
    }, [idx]);


    /* ─ finish ─
       statesSnapshot: при «Завершить» с последнего вопроса setQStates асинхронен,
       qStatesRef ещё без последнего ответа — передаём актуальный снимок из handleSaveAndNext. */
    const handleFinish = useCallback(async (statesSnapshot?: QState[]) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsFinished(true);
        if (!user || !topic) return;
        setIsSaving(true);

        const states = statesSnapshot ?? qStatesRef.current;
        const corr = states.filter((s) => s.status === "correct").length;
        const errs = states.filter((s) => s.status === "incorrect").length;
        const markedCount = states.filter((s) => s.marked).length;
        const accuracy = questions.length > 0 ? Math.round((corr / questions.length) * 100) : 0;
        const medal = getMedalByErrors(errs, 1);

        invalidateUserCache(user.id);
        resetStats();

        try {
            await setDoc(doc(db, "users", user.id, "userProgress", topic.id), {
                userId: user.id, topicId: topic.id,
                solvedQuestions: corr, errors: errs, markedQuestions: markedCount, medal, accuracy,
                completedAt: new Date().toISOString(),
            });
            await addDoc(collection(db, "users", user.id, "testResults"), {
                topicId: topic.id, correctAnswers: corr, errors: errs, accuracy, medal,
                timeSpentSeconds: secs, completedAt: serverTimestamp(),
            });
            const tbSnap = await getDoc(doc(db, "textbooks", topic.textbookId));
            if (tbSnap.exists()) {
                const { subjectId } = tbSnap.data();
                setSubjectId(subjectId);
                const rRef = doc(db, "users", user.id, "ratings", subjectId);
                const rSnap = await getDoc(rRef);
                if (rSnap.exists()) await updateDoc(rRef, { stars: increment(corr), lastUpdated: serverTimestamp() });
                else await setDoc(rRef, { userId: user.id, subjectId, stars: corr, lastUpdated: serverTimestamp() });

                const topics = await fetchTopicsByTextbook(topic.textbookId);
                const pSnap = await getDocs(collection(db, "users", user.id, "userProgress"));
                const pMap: Record<string, string> = {};
                pSnap.forEach((d) => { pMap[d.id] = (d.data() as { medal: string }).medal; });
                const allGreen = topics.every((t) => (t.id === topic.id ? medal : pMap[t.id]) === "green");
                if (allGreen && topics.length > 0) {
                    const bRef = doc(db, "users", user.id, "badges", topic.textbookId);
                    if (!(await getDoc(bRef)).exists()) {
                        await setDoc(bRef, {
                            name: `Знаток: ${tbSnap.data().title}`,
                            description: "Вы прошли все темы учебника на идеальный результат",
                            textbookId: topic.textbookId, icon: "🏆", unlockedAt: serverTimestamp(),
                        });
                    }
                }
            }
        } catch { /* ignore */ } finally { setIsSaving(false); }
    }, [user, topic, questions.length, secs, resetStats]);

    /* ─ save + next (сохраняет ответ и переходит дальше) ─ */
    const handleSaveAndNext = useCallback(() => {
        let merged = qStatesRef.current;
        if (answer.trim() && q) {
            const isCorrect = isText
                ? answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()
                : answer === q.correctAnswer;
            merged = [...qStatesRef.current];
            merged[idx] = { ...merged[idx], status: isCorrect ? "correct" : "incorrect", answer };
            qStatesRef.current = merged;
            setQStates(merged);
        }
        if (idx < questions.length - 1) goTo(idx + 1);
        else void handleFinish(merged);
    }, [answer, isText, q, idx, questions.length, goTo, handleFinish]);

    /* ─ reset ─ */
    const resetTest = useCallback(() => {
        setIdx(0);
        setQStates(blank(questions.length));
        setAnswer("");
        setChecked(false);
        setIsFinished(false);
        setSecs(0);
        setPaused(false);
        setShowExplanation(false);
        setIsSaving(false);
        setCrossedOut({});
        setShowCrossOutColumn(false);
    }, [questions.length]);

    /* ─ question bank order ─ */
    const bankOrder = useMemo(() => {
        const arr = questions.map((_, i) => i);
        if (!groupAnswered) return arr;
        return [
            ...arr.filter((i) => qStates[i]?.status !== "unanswered"),
            ...arr.filter((i) => qStates[i]?.status === "unanswered"),
        ];
    }, [questions, qStates, groupAnswered]);

    /* ══════════════════════════════════ LOADING ════════════════════════════════ */
    if (isLoading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-[hsl(var(--brand-blue))] border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground font-medium">Загрузка теста…</p>
            </div>
        </div>
    );

    if (!topic || questions.length === 0) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <p className="text-muted-foreground">Вопросы не найдены</p>
        </div>
    );

    /* ══════════════════════════════════ RESULTS ════════════════════════════════ */
    if (isFinished) {
        const medal = getMedalByErrors(errorCount, 1);
        const accuracy = Math.round((correctCount / questions.length) * 100);
        const msg = accuracy >= 87 ? "Отличный результат!" : accuracy >= 70 ? "Хорошо, так держать!" : accuracy >= 50 ? "Неплохо. Попробуй ещё раз." : "Попробуй ещё раз.";
        const reviewQ = questions[reviewIdx];
        const reviewState = qStates[reviewIdx];

        return (
            <div className="max-w-3xl mx-auto py-8 animate-in fade-in duration-500">
                {/* Medal + header */}
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        {medal === "green" && <div className="w-24 h-24 rounded-full bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center"><ShieldCheck className="w-12 h-12 text-emerald-600" /></div>}
                        {medal === "grey" && <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center"><Award className="w-12 h-12 text-gray-500" /></div>}
                        {medal === "bronze" && <div className="w-24 h-24 rounded-full bg-orange-100 border-2 border-orange-300 flex items-center justify-center"><MedalIcon className="w-12 h-12 text-orange-500" /></div>}
                        {medal === "none" && <div className="w-24 h-24 rounded-full bg-muted border-2 border-border flex items-center justify-center"><AlertCircle className="w-12 h-12 text-muted-foreground" /></div>}
                    </div>
                    <h1 className="text-3xl font-bold text-foreground mb-1">{msg}</h1>
                    <p className="text-sm text-muted-foreground">{topic.title}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="rounded-2xl border border-border bg-card p-5 text-center">
                        <div className="text-3xl font-bold text-foreground">{accuracy}%</div>
                        <div className="text-xs text-muted-foreground mt-1 font-medium">Точность</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5 text-center">
                        <div className="text-3xl font-bold text-emerald-600">{correctCount}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-medium">Правильно</div>
                    </div>
                    <div className="rounded-2xl border border-border bg-card p-5 text-center">
                        <div className="text-3xl font-bold text-red-500">{errorCount}</div>
                        <div className="text-xs text-muted-foreground mt-1 font-medium">Ошибки</div>
                    </div>
                </div>

                {/* Time */}
                <div className="rounded-2xl border border-border bg-card px-6 py-4 flex items-center justify-between mb-6">
                    <span className="text-sm text-muted-foreground font-medium flex items-center gap-2"><Clock className="w-4 h-4" />Время</span>
                    <span className="text-base font-bold text-foreground">{fmt(secs)}</span>
                </div>

                {/* Question review */}
                <div className="rounded-2xl border border-border bg-card overflow-hidden mb-6">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                        <span className="text-sm font-bold text-foreground">Разбор вопросов</span>
                        <span className="text-xs text-muted-foreground">{reviewIdx + 1} / {questions.length}</span>
                    </div>
                    <div className="p-6">
                        {/* Question number strip */}
                        <div className="flex flex-wrap gap-1.5 mb-5">
                            {questions.map((_, i) => {
                                const s = qStates[i];
                                return (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setReviewIdx(i)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold border-2 transition-all ${
                                            i === reviewIdx
                                                ? "border-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue))] text-white"
                                                : s?.status === "correct"
                                                ? "border-emerald-300 bg-emerald-100 text-emerald-700"
                                                : s?.status === "incorrect"
                                                ? "border-red-300 bg-red-100 text-red-700"
                                                : "border-border bg-muted text-muted-foreground"
                                        }`}
                                    >
                                        {i + 1}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Question text */}
                        <p className="text-base font-medium text-foreground mb-4 leading-relaxed">{reviewQ?.text}</p>

                        {/* Options */}
                        {!isText && reviewQ?.options && (
                            <div className="space-y-2 mb-4">
                                {Object.entries(reviewQ.options).map(([key, val]) => {
                                    const isCorrect = key === reviewQ.correctAnswer;
                                    const isChosen = reviewState?.answer === key;
                                    return (
                                        <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border-2 text-sm ${
                                            isCorrect ? "border-emerald-400 bg-emerald-50 text-gray-900"
                                            : isChosen ? "border-red-400 bg-red-50 text-gray-900"
                                            : "border-border bg-muted/30 text-muted-foreground"
                                        }`}>
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                                                isCorrect ? "bg-emerald-500 border-emerald-400 text-white"
                                                : isChosen ? "bg-red-500 border-red-400 text-white"
                                                : "border-border"
                                            }`}>{key.toUpperCase()}</span>
                                            <span>{val}</span>
                                            {isCorrect && <CheckCircle2 className="ml-auto w-4 h-4 text-emerald-500 shrink-0" />}
                                            {isChosen && !isCorrect && <XCircle className="ml-auto w-4 h-4 text-red-500 shrink-0" />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Text answer review */}
                        {isText && (
                            <div className="space-y-2 mb-4">
                                <div className={`p-3 rounded-xl border-2 text-sm ${
                                    reviewState?.status === "correct" ? "border-emerald-400 bg-emerald-50" : "border-red-400 bg-red-50"
                                }`}>
                                    <span className="text-xs text-muted-foreground">Ваш ответ: </span>
                                    <span className="font-medium">{reviewState?.answer || "—"}</span>
                                </div>
                                <div className="p-3 rounded-xl border-2 border-emerald-400 bg-emerald-50 text-sm">
                                    <span className="text-xs text-muted-foreground">Правильный ответ: </span>
                                    <span className="font-medium text-emerald-700">{reviewQ?.correctAnswer}</span>
                                </div>
                            </div>
                        )}

                        {/* Explanation */}
                        {reviewQ?.explanation && (
                            <div className="rounded-xl bg-[hsl(var(--brand-blue-soft))] border border-[hsl(var(--brand-blue))]/20 p-4 text-sm text-foreground">
                                <div className="text-xs font-bold text-[hsl(var(--brand-blue))] mb-1 uppercase tracking-wide">Объяснение</div>
                                {reviewQ.explanation}
                            </div>
                        )}

                        {/* Meta (domain/skill/difficulty) */}
                        {(reviewQ?.domain || reviewQ?.skill || reviewQ?.difficulty) && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {reviewQ?.difficulty && (
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        reviewQ.difficulty === "easy" ? "bg-emerald-100 text-emerald-700"
                                        : reviewQ.difficulty === "medium" ? "bg-yellow-100 text-yellow-700"
                                        : "bg-red-100 text-red-700"
                                    }`}>
                                        {reviewQ.difficulty === "easy" ? "Лёгкий" : reviewQ.difficulty === "medium" ? "Средний" : "Сложный"}
                                    </span>
                                )}
                                {reviewQ?.domain && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">{reviewQ.domain}</span>}
                                {reviewQ?.skill && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground">{reviewQ.skill}</span>}
                            </div>
                        )}

                        {/* Nav in review */}
                        <div className="flex items-center justify-between mt-5">
                            <button type="button" onClick={() => setReviewIdx((i) => Math.max(0, i - 1))} disabled={reviewIdx === 0}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold disabled:opacity-40 hover:bg-muted transition-colors">
                                <ChevronLeft className="w-4 h-4" />Назад
                            </button>
                            <button type="button" onClick={() => setReviewIdx((i) => Math.min(questions.length - 1, i + 1))} disabled={reviewIdx === questions.length - 1}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold disabled:opacity-40 hover:bg-muted transition-colors">
                                Вперёд<ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button type="button" onClick={() => router.push(subjectId ? `/subject/${subjectId}` : "/")}
                        className="h-12 rounded-2xl bg-foreground text-background text-sm font-bold hover:opacity-90 transition-all">
                        Вернуться к темам
                    </button>
                    <button type="button" onClick={resetTest} disabled={isSaving}
                        className="h-12 rounded-2xl border border-border bg-card text-sm font-bold hover:bg-muted transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                        <RefreshCw className="w-4 h-4" />Пройти ещё раз
                    </button>
                </div>
            </div>
        );
    }

    /* ══════════════════════════════════ TEST ════════════════════════════════════ */
    return (
        <div
            ref={testShellRef}
            className={`relative flex flex-col bg-background ${
                fullscreenActive ? "min-h-screen h-screen overflow-hidden" : "min-h-[calc(100vh-4rem)] -mt-4"
            }`}
        >

            {/* ─── TOP BAR ─── */}
            <div className="sticky top-0 z-30 shrink-0 bg-background/95 backdrop-blur border-b border-border">
                <div className="flex items-center justify-between px-4 py-3 gap-4">
                    {/* Left: back + topic */}
                    <div className="flex items-center gap-3 min-w-0">
                        <button type="button" onClick={() => router.back()}
                            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden sm:inline">Назад</span>
                        </button>
                        <span className="text-border hidden sm:block">|</span>
                        <span className="text-sm font-medium text-muted-foreground truncate hidden sm:block">{topic.title}</span>
                    </div>

                    {/* Center: timer */}
                    <div className="flex items-center gap-2 shrink-0">
                        {timerVisible ? (
                            <span className="text-lg font-bold tabular-nums text-foreground min-w-[4rem] text-center">{fmt(secs)}</span>
                        ) : (
                            <span className="text-sm text-muted-foreground font-medium">••:••</span>
                        )}
                        <button type="button" onClick={() => setPaused((v) => !v)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                            title={paused ? "Продолжить" : "Пауза"}>
                            {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                        </button>
                        <button type="button" onClick={() => setTimerVisible((v) => !v)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors"
                            title={timerVisible ? "Скрыть время" : "Показать время"}>
                            {timerVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                    </div>

                    {/* Right: counter + Ещё */}
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <span className="px-3 py-1.5 rounded-xl bg-foreground text-background text-sm font-bold tabular-nums">
                            {idx + 1} / {questions.length}
                        </span>
                        <div ref={moreMenuWrapRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setMoreMenuOpen((v) => !v)}
                                className={`flex flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 min-w-[2.75rem] transition-colors ${
                                    moreMenuOpen
                                        ? "bg-[hsl(var(--brand-blue-soft))] text-[hsl(var(--brand-blue))]"
                                        : "text-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-soft))]/60"
                                }`}
                                aria-expanded={moreMenuOpen}
                                aria-haspopup="menu"
                            >
                                <MoreVertical className="h-5 w-5" strokeWidth={2} />
                                <span className="text-[11px] font-semibold leading-none">Ещё</span>
                            </button>
                            {moreMenuOpen && (
                                <div
                                    role="menu"
                                    className="absolute right-0 top-full z-[60] mt-1.5 w-56 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-xl ring-1 ring-black/5 dark:ring-white/10"
                                >
                                    <button
                                        type="button"
                                        role="menuitem"
                                        onClick={() => void toggleTestFullscreen()}
                                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                    >
                                        {fullscreenActive ? (
                                            <>
                                                <Minimize2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                Выйти из полноэкранного
                                            </>
                                        ) : (
                                            <>
                                                <Maximize2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                                                На весь экран
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-muted">
                    <div
                        className="h-full bg-[hsl(var(--brand-blue))] transition-all duration-300"
                        style={{ width: `${((answeredCount) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* ─── MAIN CONTENT ─── */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                <div className="max-w-2xl mx-auto px-4 py-6">

                    {/* Question header */}
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background text-sm font-bold shrink-0">
                                {idx + 1}
                            </span>
                            <button
                                type="button"
                                onClick={toggleMark}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                                    qState.marked
                                        ? "border-amber-400 bg-amber-50 text-amber-700"
                                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                                }`}
                            >
                                {qState.marked
                                    ? <BookmarkCheck className="w-3.5 h-3.5" />
                                    : <Bookmark className="w-3.5 h-3.5" />
                                }
                                {qState.marked ? "Отмечен" : "Отметить"}
                            </button>
                        </div>

                        <div className="relative">
                            <button type="button" onClick={() => setShowInfo((v) => !v)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors">
                                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            {showInfo && (
                                <div className="absolute right-0 top-10 z-50 w-64 rounded-2xl border border-border bg-card shadow-xl p-5">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-bold text-foreground">Информация</span>
                                        <button type="button" onClick={() => setShowInfo(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <div className="text-xs text-muted-foreground mb-0.5">Сложность</div>
                                            <div className="font-semibold capitalize">
                                                {q?.difficulty === "easy" ? "Лёгкий" : q?.difficulty === "medium" ? "Средний" : "Сложный"}
                                            </div>
                                        </div>
                                        {q?.domain && <div>
                                            <div className="text-xs text-muted-foreground mb-0.5">Раздел</div>
                                            <div className="font-semibold">{q.domain}</div>
                                        </div>}
                                        {q?.skill && <div className="col-span-2">
                                            <div className="text-xs text-muted-foreground mb-0.5">Навык</div>
                                            <div className="font-semibold">{q.skill}</div>
                                        </div>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Difficulty badge */}
                    {q?.difficulty && (
                        <div className="mb-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                q.difficulty === "easy" ? "bg-emerald-100 text-emerald-700"
                                : q.difficulty === "medium" ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                                {q.difficulty === "easy" ? "Лёгкий" : q.difficulty === "medium" ? "Средний" : "Сложный"}
                            </span>
                        </div>
                    )}

                    {/* Question text */}
                    <p className="text-lg font-medium text-foreground leading-relaxed mb-6">{q?.text}</p>

                    {/* ─── TEXT INPUT (for English writing etc.) ─── */}
                    {isText ? (
                        <div className="space-y-3">
                            <textarea
                                value={answer}
                                onChange={(e) => { setAnswer(e.target.value); setChecked(false); }}
                                rows={5}
                                placeholder="Введите ваш ответ…"
                                className={`w-full rounded-2xl border-2 p-4 text-base font-medium resize-none transition-all outline-none focus:ring-2 focus:ring-[hsl(var(--brand-blue))]/20 focus:border-[hsl(var(--brand-blue))] ${
                                    checked
                                        ? answer.trim().toLowerCase() === q?.correctAnswer?.trim().toLowerCase()
                                            ? "border-emerald-400 bg-emerald-50"
                                            : "border-red-400 bg-red-50"
                                        : "border-border bg-card"
                                }`}
                            />
                            {checked && answer.trim().toLowerCase() !== q?.correctAnswer?.trim().toLowerCase() && (
                                <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-4">
                                    <div className="text-xs font-bold text-emerald-700 mb-1">Правильный ответ:</div>
                                    <div className="text-base font-medium text-gray-900">{q?.correctAnswer}</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ─── MULTIPLE CHOICE ─── */
                        <div>
                            <div className="flex justify-end mb-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCrossOutColumn((v) => !v)}
                                    title={showCrossOutColumn ? "Скрыть круги зачёркивания" : "Показать круги — нажмите букву, чтобы зачеркнуть вариант"}
                                    className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                                        showCrossOutColumn
                                            ? "border-zinc-400 bg-zinc-200 text-zinc-800 shadow-sm"
                                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                    <Strikethrough className="w-4 h-4" />
                                </button>
                            </div>
                            <div
                                className={`grid gap-x-2 gap-y-3 ${showCrossOutColumn ? "grid-cols-[1fr_2.75rem]" : "grid-cols-1"}`}
                            >
                                {Object.entries(q?.options ?? {}).map(([key, val]) => {
                                    const isSelected = answer === key;
                                    const isCorrectOpt = key === q?.correctAnswer;
                                    const isCrossed = crossedForQ.includes(key);

                                    let cls = "border-2 border-border bg-card hover:border-muted-foreground/50 hover:bg-muted/50 cursor-pointer";
                                    if (checked) {
                                        if (isSelected && isCorrectOpt) cls = "border-2 border-emerald-400 bg-emerald-50";
                                        else if (isSelected && !isCorrectOpt) cls = "border-2 border-red-400 bg-red-50";
                                        else cls = "border-2 border-border bg-card hover:border-muted-foreground/50 hover:bg-muted/50 cursor-pointer";
                                    } else if (isSelected && !isCrossed) {
                                        cls = "border-2 border-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue-soft))]";
                                    }
                                    if (isCrossed && !(checked && isSelected)) {
                                        cls = "border-2 border-red-400 bg-red-50/90 cursor-pointer hover:bg-red-50";
                                    }
                                    if (isCrossed && isSelected && !checked) {
                                        cls = "border-2 border-[hsl(var(--brand-blue))] bg-red-50/90 cursor-pointer";
                                    }

                                    const letterCls = checked && isSelected && isCorrectOpt
                                        ? "bg-emerald-500 border-emerald-400 text-white"
                                        : checked && isSelected && !isCorrectOpt
                                        ? "bg-red-500 border-red-400 text-white"
                                        : isCrossed
                                        ? "bg-red-500 border-red-400 text-white"
                                        : isSelected && !checked
                                        ? "bg-[hsl(var(--brand-blue))] border-[hsl(var(--brand-blue))] text-white"
                                        : "border-border text-muted-foreground";

                                    const railLetterCls = checked && isSelected && isCorrectOpt
                                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                                        : checked && isSelected && !isCorrectOpt
                                        ? "border-red-500 bg-red-50 text-red-800"
                                        : isCrossed
                                        ? "border-foreground bg-background text-foreground"
                                        : isSelected && !checked
                                        ? "border-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue-soft))] text-[hsl(var(--brand-blue))]"
                                        : "border-foreground bg-background text-foreground";

                                    return (
                                        <Fragment key={key}>
                                            <button
                                                type="button"
                                                onClick={() => { setAnswer(key); setChecked(false); }}
                                                className={`relative flex min-w-0 items-center gap-4 rounded-2xl p-4 text-left transition-all duration-200 ${cls}`}
                                            >
                                                {isCrossed && (
                                                    <span
                                                        className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center px-4 sm:px-6"
                                                        aria-hidden
                                                    >
                                                        <span className="h-0.5 w-full max-w-full rounded-full bg-neutral-700/85" />
                                                    </span>
                                                )}
                                                {!showCrossOutColumn && (
                                                    <span
                                                        className={`relative z-[2] flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold ${letterCls}`}
                                                    >
                                                        {key.toUpperCase()}
                                                    </span>
                                                )}
                                                <span className="relative z-[2] min-w-0 flex-1 text-base font-medium text-foreground">
                                                    {val}
                                                </span>
                                                {checked && isSelected && isCorrectOpt && (
                                                    <CheckCircle2 className="relative z-[2] h-5 w-5 shrink-0 text-emerald-500" />
                                                )}
                                                {checked && isSelected && !isCorrectOpt && (
                                                    <XCircle className="relative z-[2] h-5 w-5 shrink-0 text-red-500" />
                                                )}
                                            </button>
                                            {showCrossOutColumn && (
                                                <div className="flex items-center justify-center self-center">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            toggleCrossOutOption(key);
                                                        }}
                                                        title={isCrossed ? "Снять зачёркивание" : "Зачеркнуть вариант"}
                                                        className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-serif text-sm font-bold transition-colors hover:opacity-90 ${railLetterCls}`}
                                                    >
                                                        {isCrossed && (
                                                            <span
                                                                className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center px-0.5"
                                                                aria-hidden
                                                            >
                                                                <span className="h-[2px] w-[calc(100%+4px)] rounded-full bg-foreground/90" />
                                                            </span>
                                                        )}
                                                        <span className="relative z-[2]">{key.toUpperCase()}</span>
                                                    </button>
                                                </div>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ─── EXPLANATION (after check) ─── */}
                    {checked && q?.explanation && (
                        <div className="mt-4">
                            <button type="button" onClick={() => setShowExplanation((v) => !v)}
                                className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-[hsl(var(--brand-blue))]/30 bg-[hsl(var(--brand-blue-soft))] text-[hsl(var(--brand-blue))] text-sm font-semibold hover:opacity-90 transition-all">
                                <span>Объяснение</span>
                                <ChevronRight className={`w-4 h-4 transition-transform ${showExplanation ? "rotate-90" : ""}`} />
                            </button>
                            {showExplanation && (
                                <div className="mt-2 px-4 py-4 rounded-xl bg-[hsl(var(--brand-blue-soft))]/50 border border-[hsl(var(--brand-blue))]/20 text-sm text-foreground leading-relaxed">
                                    {q.explanation}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Result feedback pill */}
                    {checked && answer && (() => {
                        const isCorrect = isText
                            ? answer.trim().toLowerCase() === q?.correctAnswer?.trim().toLowerCase()
                            : answer === q?.correctAnswer;
                        return (
                            <div className={`mt-4 flex items-center gap-2 px-4 py-3 rounded-xl ${
                                isCorrect ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                          : "bg-red-100 text-red-800 border border-red-200"
                            }`}>
                                {isCorrect
                                    ? <><CheckCircle2 className="w-5 h-5 shrink-0" /><span className="text-sm font-semibold">Правильно!</span></>
                                    : <><XCircle className="w-5 h-5 shrink-0" /><span className="text-sm font-semibold">Неверно. {!isText && `Правильный ответ: ${q?.correctAnswer?.toUpperCase()}`}</span></>
                                }
                            </div>
                        );
                    })()}

                    {/* Extra padding for bottom bar */}
                    <div className="h-24" />
                </div>
            </div>

            {/* ─── QUESTION BANK (tooltip слева в зоне контента, над нижней панелью) ─── */}
            {showBank && (
                <>
                    <button
                        type="button"
                        aria-label="Закрыть банк вопросов"
                        className="fixed inset-0 z-[44] bg-black/25 md:left-64"
                        onClick={() => setShowBank(false)}
                    />
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="question-bank-title"
                        className="fixed z-[50] flex w-[min(21rem,calc(100vw-1.5rem))] max-h-[min(72vh,calc(100dvh-6.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ring-1 ring-black/5 dark:ring-white/10 left-3 bottom-[4.75rem] md:left-[calc(16rem+0.75rem)] md:bottom-[5.5rem] sm:left-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                            <span id="question-bank-title" className="text-sm font-bold text-foreground">
                                Банк вопросов
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setGroupAnswered((v) => !v)}
                                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                        groupAnswered
                                            ? "border-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue-soft))] text-[hsl(var(--brand-blue))]"
                                            : "border-border bg-card text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                    Группировать
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowBank(false)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2 border-b border-border px-4 py-2.5 text-[11px] font-semibold text-muted-foreground sm:gap-3 sm:text-xs">
                            <span className="flex items-center gap-1.5">
                                <span className="h-3.5 w-3.5 rounded-sm bg-emerald-400 sm:h-4 sm:w-4 sm:rounded-md" />
                                Верно
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="h-3.5 w-3.5 rounded-sm bg-red-400 sm:h-4 sm:w-4 sm:rounded-md" />
                                Ошибка
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="h-3.5 w-3.5 rounded-sm border-2 border-amber-400 bg-amber-50 sm:h-4 sm:w-4" />
                                <Bookmark className="h-3 w-3 text-amber-500" />
                                Отмечен
                            </span>
                        </div>
                        <div className="flex shrink-0 gap-3 border-b border-border px-4 py-2 text-xs font-semibold sm:gap-4">
                            <span className="text-emerald-600">{correctCount} верно</span>
                            <span className="text-red-500">{errorCount} ошибок</span>
                            <span className="text-muted-foreground">{questions.length - answeredCount} осталось</span>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
                            <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                                {bankOrder.map((qi) => {
                                    const s = qStates[qi];
                                    const isCurrent = qi === idx;
                                    return (
                                        <button
                                            key={qi}
                                            type="button"
                                            onClick={() => goTo(qi)}
                                            className={`relative flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold border-2 transition-all sm:h-10 sm:w-10 sm:rounded-xl sm:text-sm ${
                                                isCurrent
                                                    ? "border-foreground bg-background text-foreground shadow-md ring-2 ring-foreground/20 dark:ring-white/30"
                                                    : s?.status === "correct"
                                                      ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                                                      : s?.status === "incorrect"
                                                        ? "border-red-400 bg-red-100 text-red-800"
                                                        : "border-border bg-card text-muted-foreground hover:bg-muted"
                                            }`}
                                        >
                                            {qi + 1}
                                            {s?.marked && (
                                                <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5 items-center justify-center rounded-full border border-white bg-amber-400 sm:-right-1 sm:-top-1 sm:h-3 sm:w-3">
                                                    <Bookmark className="h-1 w-1 fill-white text-white sm:h-1.5 sm:w-1.5" />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ─── BOTTOM BAR ─── */}
            <div className="sticky bottom-0 z-20 shrink-0 bg-background/95 backdrop-blur border-t border-border">
                <div className="flex items-center justify-between px-4 py-3 gap-3">
                    {/* Left: Question Bank */}
                    <button
                        type="button"
                        onClick={() => setShowBank((v) => !v)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors shrink-0 ${
                            showBank
                                ? "border-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue-soft))] text-[hsl(var(--brand-blue))]"
                                : "border-border bg-card text-foreground hover:bg-muted"
                        }`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                        <span className="hidden sm:inline">Банк вопросов</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{answeredCount}/{questions.length}</span>
                        {showBank ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                            <ChevronRight className="h-4 w-4 rotate-90 text-muted-foreground" />
                        )}
                    </button>

                    {/* Right: nav buttons */}
                    <div className="flex items-center gap-2">
                        {/* Prev */}
                        <button type="button" onClick={() => idx > 0 && goTo(idx - 1)} disabled={idx === 0}
                            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card hover:bg-muted transition-colors disabled:opacity-40">
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        {/* Проверить — всегда видна */}
                        <button
                            type="button"
                            onClick={handleCheck}
                            disabled={!answer.trim() || checked}
                            className="px-5 py-2.5 rounded-xl bg-[hsl(var(--brand-blue))] text-white text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            Проверить
                        </button>

                        {/* Следующий / Завершить — всегда видна */}
                        {idx < questions.length - 1 ? (
                            <button type="button" onClick={handleSaveAndNext}
                                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-foreground text-background text-sm font-bold hover:opacity-90 active:scale-[0.98] transition-all">
                                Следующий<ChevronRight className="w-4 h-4" />
                            </button>
                        ) : (
                            <button type="button" onClick={handleSaveAndNext} disabled={isSaving}
                                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-1.5">
                                {isSaving ? <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Сохранение…</> : "Завершить"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
