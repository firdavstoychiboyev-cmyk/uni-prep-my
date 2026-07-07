"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, XCircle, ChevronRight, PenLine } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import MathText from "@/components/MathText";

export interface ReviewQuestion {
    text: string;
    options?: { a: string; b: string; c: string; d: string };
    optionImages?: { a?: string; b?: string; c?: string; d?: string };
    // Для type "open" — намунавий (эталонный) ответ для самопроверки
    correctAnswer: string;
    type?: string; // "mc" (по умолчанию) | "open"
    explanation?: string;
    imageUrl?: string;
}

const OPTION_KEYS = ["a", "b", "c", "d"] as const;
/* Каждый вопрос — 5 MathText (KaTeX + DOMPurify), поэтому 55 вопросов
   рендерим порциями по мере прокрутки, а не все сразу */
const BATCH_SIZE = 10;

function ReviewCard({ q, answer, index }: { q: ReviewQuestion; answer: string | null; index: number }) {
    const { t } = useTranslation();
    // Открытые вопросы не автопроверяются — самопроверка по эталонному ответу
    const isOpenQ = q.type === "open";
    const isCorrect = !isOpenQ && answer === q.correctAnswer;
    const hasExplanation = Boolean(q.explanation?.trim());
    // Раскрыто сразу для неправильных и открытых, для правильных — по клику
    const [showExplanation, setShowExplanation] = useState(isOpenQ || !isCorrect);

    return (
        <div className="rounded-2xl border border-border bg-card p-5 text-left">
            <div className="flex items-center justify-between mb-4">
                <div
                    className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-bold text-foreground"
                    style={{ fontFamily: "var(--font-montserrat)" }}
                >
                    {index + 1}
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                    isOpenQ
                        ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-900"
                        : isCorrect
                        ? "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-400 border-green-300 dark:border-green-900"
                        : "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-400 border-red-300 dark:border-red-900"
                }`}>
                    {isOpenQ ? <PenLine className="w-3.5 h-3.5" /> : isCorrect ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                    {isOpenQ ? t("mock.open.selfCheck") : isCorrect ? t("mock.review.correct") : t("mock.review.incorrect")}
                </div>
            </div>

            {q.imageUrl && (
                <div className="w-full flex justify-center mb-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={q.imageUrl}
                        alt="Question image"
                        loading="lazy"
                        className="max-h-72 max-w-full rounded-xl object-contain border border-border"
                    />
                </div>
            )}

            <div className="mb-4 ql-content">
                <MathText
                    content={q.text}
                    className="text-foreground"
                    style={{
                        fontFamily: "var(--font-source-serif), Georgia, serif",
                        fontSize: "1.05rem",
                        lineHeight: "1.7",
                    }}
                />
            </div>

            {answer === null && !isOpenQ && (
                <p className="mb-3 text-sm font-semibold text-red-500">{t("mock.review.noAnswer")}</p>
            )}

            {isOpenQ ? (
            /* Самопроверка: ответ ученика и намунавий (эталонный) ответ рядом */
            <div className="flex flex-col gap-2">
                <div className="rounded-xl border border-border bg-muted/40 px-4 py-3">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        {t("mock.review.yourAnswer")}
                    </div>
                    {answer?.trim() ? (
                        <p className="text-sm text-foreground whitespace-pre-wrap" style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", lineHeight: "1.6" }}>
                            {answer}
                        </p>
                    ) : (
                        <p className="text-sm font-semibold text-red-500">{t("mock.review.noAnswer")}</p>
                    )}
                </div>
                <div className="rounded-xl border border-blue-300 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 px-4 py-3">
                    <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">
                        {t("mock.open.referenceAnswer")}
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap" style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif", lineHeight: "1.6" }}>
                        {q.correctAnswer}
                    </p>
                </div>
            </div>
            ) : (
            <div className="flex flex-col gap-2">
                {OPTION_KEYS.map(key => {
                    const val = q.options?.[key];
                    if (!val) return null;
                    const isCorrectOpt = key === q.correctAnswer;
                    const isPicked = key === answer;

                    return (
                        <div
                            key={key}
                            className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${
                                isCorrectOpt
                                    ? "border-green-300 dark:border-green-900 bg-green-50 dark:bg-green-950/60"
                                    : isPicked
                                    ? "border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/60"
                                    : "border-border bg-card"
                            }`}
                        >
                            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold border ${
                                isCorrectOpt
                                    ? "border-green-400 text-green-700 dark:text-green-300"
                                    : isPicked
                                    ? "border-red-400 text-red-700 dark:text-red-300"
                                    : "border-border text-muted-foreground"
                            }`}>
                                {key.toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                                <span
                                    className="font-medium text-foreground ql-content"
                                    style={{
                                        fontFamily: "var(--font-dm-sans), system-ui, sans-serif",
                                        fontSize: "0.95rem",
                                        lineHeight: "1.6",
                                    }}
                                >
                                    <MathText content={val} as="span" />
                                </span>
                                {q.optionImages?.[key] && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={q.optionImages[key]}
                                        alt=""
                                        loading="lazy"
                                        className="mt-2 max-h-40 max-w-full rounded-lg object-contain border border-border"
                                    />
                                )}
                                {(isCorrectOpt || isPicked) && (
                                    <div className="mt-1.5 flex flex-wrap gap-2">
                                        {isPicked && (
                                            <span className={`text-[11px] font-semibold ${
                                                isCorrectOpt
                                                    ? "text-green-600 dark:text-green-400"
                                                    : "text-red-600 dark:text-red-400"
                                            }`}>
                                                {t("mock.review.yourAnswer")}
                                            </span>
                                        )}
                                        {isCorrectOpt && (
                                            <span className="text-[11px] font-semibold text-green-600 dark:text-green-400">
                                                {t("mock.review.correctAnswer")}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {isCorrectOpt
                                ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-1.5 text-green-600 dark:text-green-400" />
                                : isPicked
                                ? <XCircle className="w-4 h-4 shrink-0 mt-1.5 text-red-600 dark:text-red-400" />
                                : null}
                        </div>
                    );
                })}
            </div>
            )}

            {hasExplanation && (
                <div className="mt-4">
                    <button
                        type="button"
                        onClick={() => setShowExplanation(v => !v)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-muted border border-border text-muted-foreground hover:text-foreground"
                    >
                        <span>{t("mock.review.explanation")}</span>
                        <ChevronRight className={`w-4 h-4 transition-transform ${showExplanation ? "rotate-90" : ""}`} />
                    </button>
                    {showExplanation && (
                        <div className="mt-2 px-4 py-4 rounded-xl text-sm leading-relaxed bg-card border border-border text-foreground">
                            {q.explanation}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function MockReview({
    questions,
    answers,
}: {
    questions: ReviewQuestion[];
    answers: (string | null)[];
}) {
    const { t } = useTranslation();
    const [visibleCount, setVisibleCount] = useState(() => Math.min(BATCH_SIZE, questions.length));
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (visibleCount >= questions.length) return;
        const el = sentinelRef.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            entries => {
                if (entries.some(e => e.isIntersecting)) {
                    setVisibleCount(c => Math.min(c + BATCH_SIZE, questions.length));
                }
            },
            { rootMargin: "400px" }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [visibleCount, questions.length]);

    return (
        <div className="flex flex-col gap-4">
            {questions.slice(0, visibleCount).map((q, i) => (
                <ReviewCard key={i} q={q} answer={answers[i] ?? null} index={i} />
            ))}
            {visibleCount < questions.length && (
                <div ref={sentinelRef} className="flex justify-center py-2">
                    <button
                        type="button"
                        onClick={() => setVisibleCount(c => Math.min(c + BATCH_SIZE, questions.length))}
                        className="px-5 py-2.5 rounded-full border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                        {t("mock.review.showMore")} ({visibleCount} / {questions.length})
                    </button>
                </div>
            )}
        </div>
    );
}
