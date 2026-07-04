"use client";

import { useState } from "react";
import { ChevronRight, Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { HomeworkProgress } from "@/lib/homework-utils";

/**
 * Учительский индикатор выполнения одного ДЗ: полоса прогресса с процентом,
 * счётчик «сдали» и раскрываемый список ещё не выполнивших учеников.
 * Прогресс считается на стороне вызывающего ([[fetchHomeworkProgress]]);
 * пока он не загружен, показывается плейсхолдер.
 */
export default function HomeworkProgressView({ progress }: { progress?: HomeworkProgress }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);

    if (!progress) {
        return (
            <div className="w-full sm:w-64">
                <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
            </div>
        );
    }

    const { total, completed, percent, notCompleted } = progress;

    if (total === 0) {
        return (
            <span className="text-xs font-medium text-muted-foreground">
                {t("hw.noStudentsYet")}
            </span>
        );
    }

    const allDone = notCompleted.length === 0;

    return (
        <div className="w-full sm:w-64">
            <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t("hw.progress")}
                </span>
                <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        allDone
                            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground"
                    }`}
                >
                    {percent}%
                </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                    className={`h-full rounded-full transition-all duration-500 ${
                        allDone ? "bg-emerald-500" : "bg-foreground"
                    }`}
                    style={{ width: `${percent}%` }}
                />
            </div>

            <div className="mt-1.5 text-xs font-medium text-muted-foreground">
                {t("hw.completedCount", { done: completed, total })}
            </div>

            {allDone ? (
                <div className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    <Check size={13} /> {t("hw.allDone")}
                </div>
            ) : (
                <>
                    <button
                        type="button"
                        onClick={() => setOpen((v) => !v)}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-foreground transition-colors hover:text-muted-foreground"
                    >
                        {t("hw.notDoneCount", { count: notCompleted.length })}
                        <ChevronRight size={14} className={`transition-transform ${open ? "rotate-90" : ""}`} />
                    </button>

                    {open && (
                        <div className="mt-2 rounded-xl border border-border bg-muted/40 p-2">
                            <p className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                                {t("hw.notDoneTitle")}
                            </p>
                            <ul className="flex flex-col gap-0.5">
                                {notCompleted.map((s) => (
                                    <li
                                        key={s.id}
                                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-foreground"
                                    >
                                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-card text-[11px] font-bold text-muted-foreground">
                                            {s.name?.[0] || "?"}
                                        </span>
                                        <span className="min-w-0 truncate">
                                            {s.name} {s.surname || ""}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
