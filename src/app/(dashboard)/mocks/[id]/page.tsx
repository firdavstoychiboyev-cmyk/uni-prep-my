"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useParams, useRouter } from "next/navigation";
import { Clock, Play, ChevronLeft, ChevronRight, CheckCircle2, XCircle, ClipboardList } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import MathText from "@/components/MathText";

interface MockData {
    id: string;
    title: string;
    description?: string;
    category?: string;
    questions?: QuestionData[];
    language?: string;
    active?: boolean;
}

interface QuestionData {
    text: string;
    options?: { a: string; b: string; c: string; d: string };
    correctAnswer: string;
    imageUrl?: string;
}

type QState = {
    answer: string;
    checked: boolean;
    triedWrong: string[];
    solvedCorrect: string | null;
};

const OPTION_KEYS = ["a", "b", "c", "d"] as const;
const TOTAL_TIME = 120 * 60; // 2 hours, always

export default function MockTestPage() {
    const { id } = useParams();
    const router = useRouter();
    const { language } = useTranslation();
    const [mock, setMock] = useState<MockData | null>(null);
    const [questions, setQuestions] = useState<QuestionData[]>([]);
    const [loadError, setLoadError] = useState(false);
    const [started, setStarted] = useState(false);
    const [finished, setFinished] = useState(false);
    const [idx, setIdx] = useState(0);
    const [qStates, setQStates] = useState<QState[]>([]);
    const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const load = async () => {
            const mockDoc = await getDoc(doc(db, "mocks", id as string));
            if (!mockDoc.exists()) { setLoadError(true); return; }
            const mockData = { id: mockDoc.id, ...mockDoc.data() } as MockData;
            setMock(mockData);
            const qs: QuestionData[] = mockData.questions ?? [];
            setQuestions(qs);
            setQStates(qs.map(() => ({ answer: "", checked: false, triedWrong: [], solvedCorrect: null })));
        };
        load();
    }, [id]);

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

    const handleCheck = useCallback(() => {
        const q = questions[idx];
        const state = qStates[idx];
        if (!state.answer || state.solvedCorrect) return;

        if (state.answer === q.correctAnswer) {
            setQStates(prev => {
                const next = [...prev];
                next[idx] = { ...next[idx], solvedCorrect: state.answer, checked: true };
                return next;
            });
        } else {
            setQStates(prev => {
                const next = [...prev];
                next[idx] = { ...next[idx], triedWrong: [...next[idx].triedWrong, state.answer], checked: true };
                return next;
            });
        }
    }, [questions, qStates, idx]);

    const selectAnswer = useCallback((key: string) => {
        setQStates(prev => {
            const next = [...prev];
            if (next[idx].solvedCorrect) return next;
            next[idx] = { ...next[idx], answer: key, checked: false };
            return next;
        });
    }, [idx]);

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
    if (!started) return (
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
                        55
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
            {questions.length === 0 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">
                    {language === "uz" ? "⚠️ Hali savollar qo'shilmagan" : "⚠️ Вопросы ещё не добавлены"}
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
        </div>
    );

    // ── Results screen ────────────────────────────────────────────────────────
    if (finished) {
        const correct = qStates.filter((s, i) => s.solvedCorrect === questions[i]?.correctAnswer).length;
        const total = questions.length;
        const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

        return (
            <div className="max-w-2xl mx-auto px-6 py-16 flex flex-col items-center text-center gap-6">
                <div className="text-6xl">🏆</div>
                <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "var(--font-montserrat)" }}>
                    {language === "uz" ? "Mock tugadi!" : "Мок завершён!"}
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
                <button
                    onClick={() => router.push("/mocks")}
                    className="px-8 py-4 rounded-full bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                >
                    {language === "uz" ? "Mocklarga qaytish" : "К списку моков"}
                </button>
            </div>
        );
    }

    // ── Test screen ───────────────────────────────────────────────────────────
    const q = questions[idx];
    const state = qStates[idx];

    return (
        <div className="flex flex-col h-screen">
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-background shrink-0">
                <button
                    onClick={() => setFinished(true)}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    {language === "uz" ? "Tugatish" : "Завершить"}
                </button>
                <div
                    className="text-xl font-black"
                    style={{ fontFamily: "var(--font-montserrat)", color: timeLeft < 600 ? "#ef4444" : undefined }}
                >
                    {formatTime(timeLeft)}
                </div>
                <div className="text-sm font-semibold text-muted-foreground">{idx + 1} / {questions.length}</div>
            </div>

            {/* Question area */}
            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto px-6 py-8">
                    <div className="w-10 h-10 rounded-xl bg-foreground text-background flex items-center justify-center font-black text-sm mb-4" style={{ fontFamily: "var(--font-montserrat)" }}>
                        {idx + 1}
                    </div>
                    {q.imageUrl && (
                        <div className="w-full flex justify-center mb-4">
                            <img
                                src={q.imageUrl}
                                alt="Question image"
                                className="max-h-72 max-w-full rounded-xl object-contain border border-border"
                            />
                        </div>
                    )}
                    <div className="text-lg font-medium text-foreground leading-relaxed mb-6 ql-content">
                        <MathText content={q.text ?? ""} />
                    </div>
                    <div className="flex flex-col gap-3">
                        {OPTION_KEYS.map(key => {
                            const val = q.options?.[key];
                            if (!val) return null;
                            const isWrong = state.triedWrong.includes(key);
                            const isCorrect = state.solvedCorrect === key;
                            const isSelected = state.answer === key && !state.checked;
                            return (
                                <button
                                    key={key}
                                    onClick={() => selectAnswer(key)}
                                    disabled={!!state.solvedCorrect || isWrong}
                                    className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                                        isWrong
                                            ? "border-red-500 bg-red-50 dark:bg-red-950/30 cursor-not-allowed"
                                            : isCorrect
                                            ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                                            : isSelected
                                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                                            : "border-border bg-card hover:border-muted-foreground/50"
                                    }`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                                        isWrong
                                            ? "bg-red-500 text-white"
                                            : isCorrect
                                            ? "bg-green-500 text-white"
                                            : isSelected
                                            ? "bg-blue-500 text-white"
                                            : "border-2 border-border text-muted-foreground"
                                    }`}>
                                        {isWrong ? <XCircle className="w-4 h-4" /> :
                                         isCorrect ? <CheckCircle2 className="w-4 h-4" /> :
                                         key.toUpperCase()}
                                    </div>
                                    <span className="text-foreground font-medium ql-content">
                                        <MathText content={val} as="span" />
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-background shrink-0">
                <button
                    onClick={() => setIdx(i => Math.max(0, i - 1))}
                    disabled={idx === 0}
                    className="p-2 rounded-xl hover:bg-muted transition-colors disabled:opacity-30"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                    onClick={handleCheck}
                    disabled={!state.answer || !!state.solvedCorrect || state.triedWrong.includes(state.answer)}
                    className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
                >
                    {language === "uz" ? "Tekshirish" : "Проверить"}
                </button>
                <button
                    onClick={() => {
                        if (idx === questions.length - 1) setFinished(true);
                        else setIdx(i => i + 1);
                    }}
                    className="p-2 rounded-xl hover:bg-muted transition-colors"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
