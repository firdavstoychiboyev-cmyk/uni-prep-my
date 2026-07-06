"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { getSubjectTheme } from "@/lib/subject-theme";
import { ILLUSTRATIONS, BADGE_VIEWBOX, IllustrationKey } from "@/components/subject-illustrations";
import {
    SubjectFailure,
    fetchSubjectFailures,
    fetchClassSubjectFailures,
} from "@/lib/subject-failures-utils";

interface MergedRow {
    key: string;
    illustration: IllustrationKey;
    gradFrom: string;
    gradTo: string;
    name: string;
    wrong: number;
    total: number;
    wrongPct: number;
}

/**
 * Рейтинг предметов по числу ошибок — худший сверху, горизонтальные полосы.
 * Строки схлопываются по ЯЗЫКОНЕЗАВИСИМОМУ ключу предмета (subject-theme.key),
 * поэтому English не двоится на «Английский» + «Ingliz tili» — суммируется в
 * одну строку с именем под текущий UI-язык и своей иллюстрацией.
 */
export default function SubjectFailures({
    userId,
    studentIds,
}: {
    userId?: string;
    studentIds?: string[];
}) {
    const { t, language } = useTranslation();
    const [rows, setRows] = useState<SubjectFailure[] | null>(null);

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

    // Слияние дублей одного предмета по разным языковым документам
    const merged = useMemo<MergedRow[]>(() => {
        if (!rows) return [];
        const map = new Map<string, MergedRow & { hasLangName: boolean }>();
        for (const r of rows) {
            const theme = getSubjectTheme(r.subjectName, r.subjectId);
            // известный предмет → общий ключ; неизвестный → по id (не сливать чужие)
            const groupKey = theme.key === "default" ? `id:${r.subjectId}` : theme.key;
            const cur = map.get(groupKey);
            const isLangName = (r.subjectLanguage ?? "ru") === language;
            if (!cur) {
                map.set(groupKey, {
                    key: groupKey, illustration: theme.illustration,
                    gradFrom: theme.gradFrom, gradTo: theme.gradTo,
                    name: r.subjectName, wrong: r.wrong, total: r.total, wrongPct: 0,
                    hasLangName: isLangName,
                });
            } else {
                cur.wrong += r.wrong;
                cur.total += r.total;
                // предпочитаем имя предмета на текущем языке интерфейса
                if (!cur.hasLangName && isLangName) { cur.name = r.subjectName; cur.hasLangName = true; }
            }
        }
        return Array.from(map.values())
            .map((v) => ({ ...v, wrongPct: v.total > 0 ? Math.round((v.wrong / v.total) * 100) : 0 }))
            .sort((a, b) => b.wrong - a.wrong || b.wrongPct - a.wrongPct || a.name.localeCompare(b.name));
    }, [rows, language]);

    const maxWrong = merged.length > 0 ? merged[0].wrong : 0;

    return (
        <section className="rounded-2xl p-5 sm:p-6 bg-card border border-border">
            <div className="mb-1 flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" strokeWidth={2} />
                <h2 className="text-[15px] font-bold text-foreground">{t("stats.weakSubjects")}</h2>
            </div>
            <p className="mb-5 text-[12px] text-muted-foreground">{t("stats.weakSubjectsHint")}</p>

            {rows === null ? (
                <div className="flex flex-col gap-3">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="h-9 animate-pulse rounded-lg bg-muted" />
                    ))}
                </div>
            ) : merged.length === 0 ? (
                <p className="py-6 text-center text-sm font-medium text-muted-foreground">
                    {t("stats.noWrongYet")}
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
                                        <span className="truncate text-sm font-semibold text-foreground">
                                            {row.name}
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
