"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, ChevronRight, AlertCircle, CalendarDays } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fetchStudentMistakes, MistakeEntry } from "@/lib/mistakes-utils";
import MathText from "@/components/MathText";

const OPTION_KEYS = ["a", "b", "c", "d"] as const;
const BATCH = 15; // вопросы с MathText/KaTeX — раскрываем порциями

/** Ответ ученика/правильный: для mc — «B. текст», для open/text — сам текст */
function AnswerText({ entry, value }: { entry: MistakeEntry; value: string }) {
    const { t } = useTranslation();
    if (!value) return <span className="text-muted-foreground">{t("mock.review.noAnswer")}</span>;

    const isChoice = entry.type !== "open" && entry.type !== "text";
    if (isChoice && (OPTION_KEYS as readonly string[]).includes(value)) {
        const optText = entry.options?.[value as (typeof OPTION_KEYS)[number]];
        return (
            <span className="inline-flex items-baseline gap-1.5">
                <span className="font-bold">{value.toUpperCase()}.</span>
                {optText ? <MathText content={optText} as="span" /> : null}
            </span>
        );
    }
    return <MathText content={value} as="span" />;
}

function MistakeCard({ entry }: { entry: MistakeEntry }) {
    const { t } = useTranslation();
    const [showExplanation, setShowExplanation] = useState(false);
    const hasExplanation = Boolean(entry.explanation?.trim());

    // Формат DD.MM.YYYY — локале-независимо (uz-UZ даёт неудачные «M07»)
    const dateLabel = useMemo(() => {
        if (!entry.lastAttemptAt) return null;
        const d = new Date(entry.lastAttemptAt);
        if (isNaN(d.getTime())) return null;
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
    }, [entry.lastAttemptAt]);

    return (
        <div className="rounded-2xl border border-border bg-card p-5 text-left">
            {/* Subject / topic + date */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    {entry.subjectName && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                            {entry.subjectEmoji && <span>{entry.subjectEmoji}</span>}
                            {entry.subjectName}
                        </span>
                    )}
                    {entry.topicTitle && (
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {entry.topicTitle}
                        </span>
                    )}
                </div>
                {dateLabel && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <CalendarDays size={12} />
                        {dateLabel}
                    </span>
                )}
            </div>

            {/* Question */}
            <div className="mb-4 ql-content">
                <MathText
                    content={entry.questionText}
                    className="text-foreground"
                    style={{
                        fontFamily: "var(--font-source-serif), Georgia, serif",
                        fontSize: "1.05rem",
                        lineHeight: "1.7",
                    }}
                />
            </div>

            {/* Your answer (wrong) */}
            <div className="mb-2 flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950/40">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
                <div className="min-w-0">
                    <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                        {t("mock.review.yourAnswer")}
                    </div>
                    <div className="text-sm text-foreground">
                        <AnswerText entry={entry} value={entry.yourAnswer} />
                    </div>
                </div>
            </div>

            {/* Correct answer */}
            <div className="flex items-start gap-3 rounded-xl border border-green-300 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950/40">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                <div className="min-w-0">
                    <div className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
                        {t("mock.review.correctAnswer")}
                    </div>
                    <div className="text-sm text-foreground">
                        {entry.type === "open" && entry.acceptedAnswers && entry.acceptedAnswers.length > 1
                            ? entry.acceptedAnswers.join(" / ")
                            : <AnswerText entry={entry} value={entry.correctAnswer} />}
                    </div>
                </div>
            </div>

            {/* Explanation (collapsible) + practice link */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
                {hasExplanation && (
                    <button
                        type="button"
                        onClick={() => setShowExplanation((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                        {t("mock.review.explanation")}
                        <ChevronRight size={14} className={`transition-transform ${showExplanation ? "rotate-90" : ""}`} />
                    </button>
                )}
                {entry.topicId && (
                    <Link
                        href={`/test/${entry.topicId}`}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400"
                    >
                        {t("mistakes.practiceTopic")}
                        <ChevronRight size={14} />
                    </Link>
                )}
            </div>
            {hasExplanation && showExplanation && (
                <div className="mt-2 rounded-xl border border-border bg-card px-4 py-4 text-sm leading-relaxed text-foreground">
                    {entry.explanation}
                </div>
            )}
        </div>
    );
}

export default function MistakesPage() {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const [entries, setEntries] = useState<MistakeEntry[] | null>(null);
    const [visible, setVisible] = useState(BATCH);

    useEffect(() => {
        if (!user) { setEntries([]); return; }
        let cancelled = false;
        setEntries(null);
        fetchStudentMistakes(user.id)
            .then((data) => { if (!cancelled) { setEntries(data); setVisible(BATCH); } })
            .catch((e) => { console.error("Error loading mistakes:", e); if (!cancelled) setEntries([]); });
        return () => { cancelled = true; };
    }, [user]);

    return (
        <div className="flex flex-col gap-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    {t("mistakes.title")}
                </h1>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
                    {t("mistakes.subtitle")}
                </p>
            </div>

            {!user ? (
                <div className="rounded-2xl border border-border bg-muted/50 px-6 py-16 text-center dark:bg-muted/30">
                    <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="font-medium text-muted-foreground">{t("mistakes.loginPrompt")}</p>
                </div>
            ) : entries === null ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="h-40 animate-pulse rounded-2xl bg-muted" />
                    ))}
                </div>
            ) : entries.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/50 px-6 py-20 text-center dark:bg-muted/30">
                    <div className="mb-3 text-4xl">🎉</div>
                    <p className="text-lg font-bold text-foreground">{t("mistakes.empty")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("mistakes.emptyHint")}</p>
                </div>
            ) : (
                <>
                    <p className="-mt-4 text-sm font-medium text-muted-foreground">
                        {t("mistakes.count", { count: entries.length })}
                    </p>
                    <div className="flex flex-col gap-4">
                        {entries.slice(0, visible).map((entry) => (
                            <MistakeCard key={entry.questionId} entry={entry} />
                        ))}
                    </div>
                    {visible < entries.length && (
                        <div className="flex justify-center">
                            <button
                                type="button"
                                onClick={() => setVisible((v) => v + BATCH)}
                                className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                                {t("mock.review.showMore")} ({visible} / {entries.length})
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
