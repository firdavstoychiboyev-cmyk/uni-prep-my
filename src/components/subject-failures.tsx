"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getSubjectTheme } from "@/lib/subject-theme";
import { ILLUSTRATIONS, BADGE_VIEWBOX, IllustrationKey } from "@/components/subject-illustrations";
import {
    TopicFailure,
    fetchTopicFailures,
    fetchClassTopicFailures,
} from "@/lib/subject-failures-utils";

/** Сколько худших тем показывать в списке — иначе он может растянуться на десятки строк. */
const MAX_ROWS = 8;

interface Row {
    key: string;
    illustration: IllustrationKey;
    gradFrom: string;
    gradTo: string;
    topicTitle: string;
    subjectName: string;
    wrong: number;
    total: number;
    wrongPct: number;
}

/**
 * Рейтинг ТЕМ (mavzu) по числу ошибок — худшая сверху, горизонтальные полосы.
 * В отличие от предметов, темы уже уникальны по topicId в userProgress,
 * поэтому строки не нужно схлопывать — только раскрасить иконкой предмета.
 */
export default function SubjectFailures({
    userId,
    studentIds,
}: {
    userId?: string;
    studentIds?: string[];
}) {
    const { t } = useTranslation();
    const [rows, setRows] = useState<TopicFailure[] | null>(null);

    const idsKey = studentIds ? studentIds.join(",") : "";

    useEffect(() => {
        let cancelled = false;
        setRows(null);
        const run = userId
            ? fetchTopicFailures(userId)
            : studentIds
            ? fetchClassTopicFailures(studentIds)
            : Promise.resolve([]);
        run
            .then((data) => { if (!cancelled) setRows(data); })
            .catch((e) => { console.error("Error loading topic failures:", e); if (!cancelled) setRows([]); });
        return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, idsKey]);

    // Уже отсортировано худшими сверху — берём иконку/цвет предмета темы и обрезаем список
    const merged = useMemo<Row[]>(() => {
        if (!rows) return [];
        return rows.slice(0, MAX_ROWS).map((r) => {
            const theme = getSubjectTheme(r.subjectName, r.subjectId);
            return {
                key: r.topicId,
                illustration: theme.illustration,
                gradFrom: theme.gradFrom,
                gradTo: theme.gradTo,
                topicTitle: r.topicTitle,
                subjectName: r.subjectName,
                wrong: r.wrong,
                total: r.total,
                wrongPct: r.wrongPct,
            };
        });
    }, [rows]);

    const maxWrong = merged.length > 0 ? merged[0].wrong : 0;

    return (
        <section className="rounded-2xl p-5 sm:p-6 bg-card border border-border">
            <div className="mb-1 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" strokeWidth={2} />
                <h2 className="text-[15px] font-bold text-foreground">{t("stats.weakTopics")}</h2>
            </div>
            <p className="mb-5 text-[12px] text-muted-foreground">{t("stats.weakTopicsHint")}</p>

            {rows === null ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="h-9 animate-pulse rounded-lg bg-muted" />
                    ))}
                </div>
            ) : merged.length === 0 ? (
                <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" /> {t("stats.noWrongTopicsYet")}
                </p>
            ) : (
                <ul className="flex flex-col gap-4">
                    {merged.map((row, i) => {
                        const Illustration = ILLUSTRATIONS[row.illustration];
                        return (
                            <li key={row.key}>
                                <div className="mb-1.5 flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <span className="w-4 shrink-0 text-center text-[12px] font-bold tabular-nums text-muted-foreground">
                                            {i + 1}
                                        </span>
                                        {/* Иллюстрация предмета (как в Fanlar / сайдбаре), уменьшенная */}
                                        <span
                                            className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md ring-1 ring-white/10"
                                            style={{ background: `linear-gradient(135deg, ${row.gradFrom}, ${row.gradTo})` }}
                                        >
                                            <Illustration viewBox={BADGE_VIEWBOX[row.illustration]} width={22} height={22} preserveAspectRatio="xMidYMid slice" />
                                        </span>
                                        <span className="min-w-0 truncate">
                                            <span className="text-sm font-semibold text-foreground">{row.topicTitle}</span>
                                            {row.subjectName && (
                                                <span className="ml-1.5 text-[11px] font-medium text-muted-foreground">· {row.subjectName}</span>
                                            )}
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
                                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                                    <div
                                        className="h-full rounded-full bg-red-500/80 transition-all duration-500"
                                        style={{ width: `${maxWrong > 0 ? Math.max(4, Math.round((row.wrong / maxWrong) * 100)) : 0}%` }}
                                    />
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
