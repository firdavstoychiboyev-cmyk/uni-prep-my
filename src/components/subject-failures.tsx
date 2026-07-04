"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
    SubjectFailure,
    fetchSubjectFailures,
    fetchClassSubjectFailures,
} from "@/lib/subject-failures-utils";

/**
 * Рейтинг предметов по числу ошибок — худший сверху, горизонтальные полосы.
 * Один из режимов: userId (личная статистика ученика) или studentIds
 * (аналитика класса для учителя). Данные грузит сам.
 */
export default function SubjectFailures({
    userId,
    studentIds,
}: {
    userId?: string;
    studentIds?: string[];
}) {
    const { t } = useTranslation();
    const [rows, setRows] = useState<SubjectFailure[] | null>(null);

    // Стабильный ключ для эффекта, чтобы не перезапрашивать на каждый рендер
    const idsKey = studentIds ? studentIds.join(",") : "";

    useEffect(() => {
        let cancelled = false;
        setRows(null);
        const run = userId
            ? fetchSubjectFailures(userId)
            : studentIds
            ? fetchClassSubjectFailures(studentIds)
            : Promise.resolve([]);
        run
            .then((data) => { if (!cancelled) setRows(data); })
            .catch((e) => { console.error("Error loading subject failures:", e); if (!cancelled) setRows([]); });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, idsKey]);

    const maxWrong = rows && rows.length > 0 ? rows[0].wrong : 0;

    return (
        <section className="rounded-xl p-5 sm:p-6 bg-card border border-border">
            <div className="mb-1 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <h2 className="text-[15px] font-bold text-foreground">{t("stats.weakSubjects")}</h2>
            </div>
            <p className="mb-5 text-[12px] text-muted-foreground">{t("stats.weakSubjectsHint")}</p>

            {rows === null ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="h-9 animate-pulse rounded-lg bg-muted" />
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <p className="py-6 text-center text-sm font-medium text-muted-foreground">
                    {t("stats.noWrongYet")}
                </p>
            ) : (
                <ul className="flex flex-col gap-4">
                    {rows.map((row, i) => (
                        <li key={row.subjectId}>
                            <div className="mb-1.5 flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2">
                                    <span className="w-5 shrink-0 text-center text-[12px] font-bold tabular-nums text-muted-foreground">
                                        {i + 1}
                                    </span>
                                    {row.subjectEmoji && <span className="shrink-0">{row.subjectEmoji}</span>}
                                    <span className="truncate text-sm font-semibold text-foreground">
                                        {row.subjectName}
                                    </span>
                                </div>
                                <div className="flex shrink-0 items-baseline gap-2">
                                    <span className="text-sm font-bold tabular-nums text-foreground">
                                        {row.wrong} <span className="text-[11px] font-medium text-muted-foreground">{t("stats.wrongAnswersShort")}</span>
                                    </span>
                                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                                        {row.wrongPct}%
                                    </span>
                                </div>
                            </div>
                            {/* Полоса — относительно худшего предмета (первый = 100%) */}
                            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full bg-red-500/80 transition-all duration-500"
                                    style={{ width: `${maxWrong > 0 ? Math.max(4, Math.round((row.wrong / maxWrong) * 100)) : 0}%` }}
                                />
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
