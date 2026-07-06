"use client";
import { useEffect, useState, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { Clock, Play, ChevronLeft, ChevronRight, ClipboardList, X, History, PenLine, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import MathText from "@/components/MathText";
import MockReview from "@/components/mock-review";
import { useAuthStore } from "@/store/useAuthStore";
import { saveMockResult } from "@/lib/homework-utils";
import { MockResult } from "@/lib/firestore-schema";

interface MockData {
    id: string;
    title: string;
    description?: string;
    category?: string;
    questions?: QuestionData[];
    questionIds?: string[];
    language?: string;
    active?: boolean;
}

interface QuestionData {
    text: string;
    options?: { a: string; b: string; c: string; d: string };
    // Для type "open" — намунавий (эталонный) ответ для самопроверки
    correctAnswer: string;
    type?: string; // "mc" (по умолчанию) | "open"
    explanation?: string;
    imageUrl?: string;
}

const OPTION_KEYS = ["a", "b", "c", "d"] as const;
const TOTAL_TIME = 120 * 60;

// Открытые вопросы не автопроверяются и не входят в счёт правильных/неправильных
const countScore = (qs: QuestionData[], ans: (string | null)[]) => {
    const gradableTotal = qs.filter(q => q.type !== "open").length;
    const correct = ans.filter((a, i) => qs[i]?.type !== "open" && a === qs[i]?.correctAnswer).length;
    return { correct, gradableTotal, openCount: qs.length - gradableTotal };
};

export default function MockTestPage() {
    const { id } = useParams();
    const router = useRouter();
    const { t, language } = useTranslation();

    const [mock, setMock] = useState<MockData | null>(null);
    const [questions, setQuestions] = useState<QuestionData[]>([]);
    const [loadError, setLoadError] = useState(false);

    const [started, setStarted] = useState(false);
    const [finished, setFinished] = useState(false);
    const [idx, setIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Simple answer state — null means unanswered
    const [answers, setAnswers] = useState<(string | null)[]>([]);
    // Eliminated options per question
    const [eliminated, setEliminated] = useState<string[][]>([]);

    const [showGrid, setShowGrid] = useState(false);
    const [showFinishDialog, setShowFinishDialog] = useState(false);

    // Сохранённый ранее результат мока — для повторного просмотра разбора
    const [savedResult, setSavedResult] = useState<MockResult | null>(null);
    const [reviewMode, setReviewMode] = useState(false);

    useEffect(() => {
        const load = async () => {
            const mockDoc = await getDoc(doc(db, "mocks", id as string));
            if (!mockDoc.exists()) { setLoadError(true); return; }
            const mockData = { id: mockDoc.id, ...mockDoc.data() } as MockData;
            setMock(mockData);

            let qs: QuestionData[] = [];
            if (mockData.questionIds?.length) {
                const qDocs = await Promise.all(
                    mockData.questionIds.map(qid => getDoc(doc(db, "questions", qid)))
                );
                qs = qDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() } as unknown as QuestionData));
            } else if (mockData.questions?.length) {
                qs = mockData.questions;
            }

            setQuestions(qs);
            setAnswers(qs.map(() => null));
            setEliminated(qs.map(() => []));
        };
        load();
    }, [id]);

    // Отметка о завершении мока — по ней считается выполнение домашних заданий;
    // ответы и счёт сохраняются для повторного просмотра разбора
    const { user } = useAuthStore();
    useEffect(() => {
        if (finished && user && id) {
            const { correct, gradableTotal } = countScore(questions, answers);
            saveMockResult(user.id, id as string, {
                answers,
                correct,
                total: gradableTotal,
            }).catch((e) => console.error("Error saving mock result:", e));
        }
    }, [finished, user, id, answers, questions]);

    // Загрузка сохранённого результата для кнопки «Посмотреть результаты»
    useEffect(() => {
        if (!user || !id) return;
        getDoc(doc(db, "users", user.id, "mockResults", id as string))
            .then(snap => { if (snap.exists()) setSavedResult(snap.data() as MockResult); })
            .catch(() => {});
    }, [user, id]);

    const openReview = (saved: MockResult) => {
        if (!saved.answers) return;
        setAnswers(saved.answers);
        setReviewMode(true);
    };

    // Открытие разбора по ссылке /mocks/{id}?review=1 (со списка моков)
    useEffect(() => {
        if (started || finished || reviewMode) return;
        if (!savedResult?.answers || questions.length === 0) return;
        if (new URLSearchParams(window.location.search).get("review") === "1") {
            setAnswers(savedResult.answers);
            setReviewMode(true);
        }
    }, [savedResult, questions.length, started, finished, reviewMode]);

    useEffect(() => {
        if (!started || finished) {
            if (timerRef.current) clearInterval(timerRef.current);
            return;
        }
        timerRef.current = setInterval(() => {
            setTimeLeft(t => {
                if (t <= 1) { setFinished(true); return 0; }
                return t - 1;
            });
        }, 1000);
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [started, finished]);

    const formatTime = (s: number) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    };

    const selectAnswer = (key: string) => {
        setAnswers(prev => {
            const next = [...prev];
            next[idx] = key;
            return next;
        });
    };

    const toggleEliminate = (key: string) => {
        setEliminated(prev => {
            const next = [...prev];
            if (next[idx].includes(key)) {
                next[idx] = next[idx].filter(k => k !== key);
            } else {
                next[idx] = [...next[idx], key];
            }
            return next;
        });
    };

    // ── Load / error states ───────────────────────────────────────────────────

    if (loadError) return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4">
            <ClipboardList className="w-12 h-12 text-muted-foreground/30" />
            <p className="font-bold text-foreground">
                {language === "uz" ? "Mock topilmadi" : "Мок не найден"}
            </p>
            <button onClick={() => router.push("/mocks")} className="text-sm text-blue-600 hover:underline">
                {language === "uz" ? "Mocklarga qaytish" : "Вернуться к мокам"}
            </button>
        </div>
    );

    if (!mock) return (
        <div className="p-8 text-muted-foreground">
            {language === "uz" ? "Yuklanmoqda..." : "Загрузка..."}
        </div>
    );

    // ── Intro screen ──────────────────────────────────────────────────────────

    if (!started && !reviewMode) return (
        <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col items-center text-center gap-6">
            <div className="p-4 rounded-2xl bg-blue-100 dark:bg-blue-950">
                <Clock className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "var(--font-montserrat)" }}>
                {mock.title}
            </h1>
            {mock.description && (
                <p className="text-muted-foreground">{mock.description}</p>
            )}
            <div className="grid grid-cols-2 gap-4 w-full">
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400" style={{ fontFamily: "var(--font-montserrat)" }}>
                        {questions.length || 55}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {language === "uz" ? "Savollar" : "Вопросов"}
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-4 text-center">
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400" style={{ fontFamily: "var(--font-montserrat)" }}>
                        2:00:00
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                        {language === "uz" ? "Vaqt" : "Время"}
                    </div>
                </div>
            </div>
            <div className="rounded-xl border border-yellow-200 dark:border-yellow-900 bg-yellow-50 dark:bg-yellow-950/30 p-4 w-full text-sm text-yellow-800 dark:text-yellow-300 text-left flex flex-col gap-1">
                <p className="font-bold">{language === "uz" ? "Qoidalar:" : "Правила:"}</p>
                <p>• {language === "uz" ? "55 ta savol, 2 soat vaqt" : "55 вопросов, 2 часа"}</p>
                <p>• {language === "uz" ? "Har bir savol uchun 1 ta javob tanlang" : "Выберите 1 ответ на каждый вопрос"}</p>
                <p>• {language === "uz" ? "Natijalar oxirida ko'rsatiladi" : "Результаты показываются в конце"}</p>
            </div>
            {questions.length === 0 && (
                <p className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 font-medium">
                    <AlertTriangle size={14} className="shrink-0" strokeWidth={2} />
                    {language === "uz" ? "Hali savollar qo'shilmagan" : "Вопросы ещё не добавлены"}
                </p>
            )}
            <button
                onClick={() => setStarted(true)}
                disabled={questions.length === 0}
                className="mt-2 px-8 py-4 rounded-full bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-40"
            >
                <Play className="w-5 h-5" />
                {language === "uz" ? "Boshlash" : "Начать"}
            </button>
            {savedResult?.answers && questions.length > 0 && (
                <button
                    onClick={() => openReview(savedResult)}
                    className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                    <History className="w-4 h-4" />
                    {t("mock.review.viewResults")}
                    {typeof savedResult.correct === "number" && ` (${savedResult.correct} / ${savedResult.total})`}
                </button>
            )}
        </div>
    );

    // ── Results screen (после завершения и повторный просмотр разбора) ───────

    if (finished || reviewMode) {
        const { correct, gradableTotal: total, openCount } = countScore(questions, answers);
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

        return (
            <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col items-center text-center gap-6">
                <div className="text-6xl">🏆</div>
                <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "var(--font-montserrat)" }}>
                    {reviewMode ? mock.title : (language === "uz" ? "Mock tugadi!" : "Мок завершён!")}
                </h1>
                <div className="text-6xl font-black text-foreground" style={{ fontFamily: "var(--font-montserrat)" }}>
                    {correct} / {total}
                </div>
                <p className="text-muted-foreground text-lg -mt-4">
                    {language === "uz" ? "ta to'g'ri javob" : "правильных ответов"}
                </p>
                <div className="w-full">
                    <div className="w-full bg-muted rounded-full h-3">
                        <div
                            className="h-3 rounded-full bg-blue-600 transition-all"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{pct}%</p>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                        <div className="text-3xl font-black text-green-500">{correct}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {language === "uz" ? "To'g'ri" : "Правильно"}
                        </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4 text-center">
                        <div className="text-3xl font-black text-red-500">{total - correct}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            {language === "uz" ? "Noto'g'ri" : "Неправильно"}
                        </div>
                    </div>
                </div>
                {openCount > 0 && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-medium -mt-2">
                        ✍️ {t("mock.results.openNote", { count: openCount })}
                    </p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-3">
                    {reviewMode && (
                        <button
                            onClick={() => {
                                setReviewMode(false);
                                setAnswers(questions.map(() => null));
                                setEliminated(questions.map(() => []));
                                setIdx(0);
                                setTimeLeft(TOTAL_TIME);
                            }}
                            className="px-8 py-4 rounded-full border border-border text-foreground font-bold hover:bg-muted transition-colors"
                        >
                            {t("mock.review.retake")}
                        </button>
                    )}
                    <button
                        onClick={() => router.push("/mocks")}
                        className="px-8 py-4 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                    >
                        {language === "uz" ? "Mocklarga qaytish" : "К списку моков"}
                    </button>
                </div>

                {/* Detailed per-question review */}
                <div className="w-full mt-6 text-left">
                    <h2
                        className="text-xl font-black text-foreground mb-4"
                        style={{ fontFamily: "var(--font-montserrat)" }}
                    >
                        {t("mock.review.title")}
                    </h2>
                    <MockReview questions={questions} answers={answers} />
                </div>
            </div>
        );
    }

    // ── Test screen (full-screen) ─────────────────────────────────────────────

    const q = questions[idx];
    const answeredCount = answers.filter(a => a !== null).length;

    return (
        <>
            <div className="fixed inset-0 z-50 bg-background flex flex-col">

                {/* Top bar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background shrink-0">
                    <button
                        onClick={() => setShowFinishDialog(true)}
                        className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted"
                    >
                        {language === "uz" ? "Tugatish" : "Завершить"}
                    </button>
                    <div
                        className="text-xl font-black tabular-nums"
                        style={{
                            fontFamily: "var(--font-montserrat)",
                            color: timeLeft < 600 ? "#ef4444" : undefined,
                        }}
                    >
                        {formatTime(timeLeft)}
                    </div>
                    <div className="text-sm font-semibold text-muted-foreground">
                        {idx + 1} / {questions.length}
                    </div>
                </div>

                {/* Question area */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-6 py-8">
                        <div
                            className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center font-black text-sm mb-4"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                        >
                            {idx + 1}
                        </div>

                        {q?.imageUrl && (
                            <div className="w-full flex justify-center mb-4">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={q.imageUrl}
                                    alt="Question image"
                                    className="max-h-72 max-w-full rounded-xl object-contain border border-border"
                                />
                            </div>
                        )}

                        <div className="mb-6 ql-content">
                            <MathText
                                content={q?.text ?? ""}
                                className="text-foreground"
                                style={{
                                    fontFamily: "var(--font-source-serif), Georgia, serif",
                                    fontSize: "1.2rem",
                                    lineHeight: "1.8",
                                    letterSpacing: "0.01em",
                                }}
                            />
                        </div>

                        {q?.type === "open" ? (
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                <PenLine className="w-3.5 h-3.5" />
                                {t("mock.open.badge")}
                            </div>
                            <textarea
                                value={answers[idx] ?? ""}
                                onChange={e => {
                                    const v = e.target.value;
                                    setAnswers(prev => {
                                        const next = [...prev];
                                        next[idx] = v.trim() ? v : null;
                                        return next;
                                    });
                                }}
                                rows={4}
                                placeholder={t("test.openAnswerPlaceholder")}
                                className="w-full rounded-2xl border-2 border-border bg-card px-5 py-4 text-foreground focus:outline-none focus:border-blue-500 resize-y"
                                style={{
                                    fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                                    fontSize: "1rem",
                                    lineHeight: "1.6",
                                }}
                            />
                        </div>
                        ) : (
                        <div className="flex flex-col gap-3">
                            {OPTION_KEYS.map(key => {
                                const val = q?.options?.[key];
                                if (!val) return null;
                                const isEliminated = eliminated[idx]?.includes(key);
                                const isSelected = answers[idx] === key;

                                return (
                                    <div key={key} className="flex items-center gap-2">
                                        {/* Cross-out toggle */}
                                        <button
                                            onClick={() => toggleEliminate(key)}
                                            className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center hover:border-red-400 hover:text-red-400 transition-colors shrink-0"
                                            title={language === "uz" ? "Bu javobni chiqarib tashlash" : "Исключить этот вариант"}
                                        >
                                            {isEliminated && <X className="w-3 h-3 text-red-400" />}
                                        </button>

                                        {/* Answer option */}
                                        <button
                                            onClick={() => selectAnswer(key)}
                                            className={`flex-1 flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all ${
                                                isEliminated
                                                    ? "border-border bg-muted/30 opacity-50"
                                                    : isSelected
                                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                                                    : "border-border bg-card hover:border-muted-foreground/50"
                                            }`}
                                        >
                                            <div className={`w-9 h-9 text-sm rounded-xl flex items-center justify-center font-bold shrink-0 border-2 ${
                                                isEliminated
                                                    ? "border-border text-muted-foreground"
                                                    : isSelected
                                                    ? "bg-blue-500 border-blue-500 text-white"
                                                    : "border-border text-muted-foreground"
                                            }`}>
                                                {key.toUpperCase()}
                                            </div>
                                            <span
                                                className={`font-medium ql-content ${
                                                    isEliminated ? "line-through text-muted-foreground" : "text-foreground"
                                                }`}
                                                style={{
                                                    fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                                                    fontSize: "1rem",
                                                    lineHeight: "1.6",
                                                }}
                                            >
                                                <MathText content={val} as="span" />
                                            </span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                        )}
                    </div>
                </div>

                {/* Bottom bar */}
                <div className="relative shrink-0">
                    {/* Question grid panel */}
                    {showGrid && (
                        <div className="absolute bottom-full left-0 right-0 bg-background border-t border-border p-4 shadow-lg max-h-64 overflow-y-auto">
                            <div className="grid grid-cols-8 gap-2">
                                {questions.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => { setIdx(i); setShowGrid(false); }}
                                        className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${
                                            answers[i] !== null
                                                ? "bg-indigo-600 text-white"
                                                : "bg-muted text-muted-foreground"
                                        } ${i === idx ? "ring-2 ring-offset-1 ring-indigo-400" : ""}`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background">
                        <button
                            onClick={() => { setIdx(i => Math.max(0, i - 1)); setShowGrid(false); }}
                            disabled={idx === 0}
                            className="p-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-30"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => setShowGrid(s => !s)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
                        >
                            <span className="font-bold text-foreground">{answeredCount} / {questions.length}</span>
                            <span className="text-xs text-muted-foreground">
                                {language === "uz" ? "javob berildi" : "отвечено"}
                            </span>
                        </button>

                        <button
                            onClick={() => {
                                setShowGrid(false);
                                if (idx === questions.length - 1) {
                                    setShowFinishDialog(true);
                                } else {
                                    setIdx(i => i + 1);
                                }
                            }}
                            className="p-2 rounded-xl hover:bg-muted transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Finish confirmation dialog */}
            {showFinishDialog && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
                    <div className="bg-background rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl">
                        <h2
                            className="text-xl font-black mb-2"
                            style={{ fontFamily: "var(--font-montserrat)" }}
                        >
                            {language === "uz" ? "Mockni tugatmoqchimisiz?" : "Завершить мок?"}
                        </h2>
                        <p className="text-muted-foreground text-sm mb-2">
                            {language === "uz"
                                ? `Javob berilgan: ${answeredCount} / ${questions.length}`
                                : `Отвечено: ${answeredCount} / ${questions.length}`}
                        </p>
                        {answeredCount < questions.length && (
                            <p className="inline-flex items-center gap-1.5 text-red-500 text-sm mb-6">
                                <AlertTriangle size={14} className="shrink-0" strokeWidth={2} />
                                {questions.length - answeredCount}{" "}
                                {language === "uz" ? "ta savol javobsiz qolmoqda!" : "вопросов остались без ответа!"}
                            </p>
                        )}
                        <div className={`flex gap-3 ${answeredCount < questions.length ? "" : "mt-6"}`}>
                            <button
                                onClick={() => setShowFinishDialog(false)}
                                className="flex-1 py-3 rounded-xl border border-border font-semibold hover:bg-muted transition-colors text-foreground"
                            >
                                {language === "uz" ? "Davom etish" : "Продолжить"}
                            </button>
                            <button
                                onClick={() => { setShowFinishDialog(false); setFinished(true); }}
                                className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors"
                            >
                                {language === "uz" ? "Tugatish" : "Завершить"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
