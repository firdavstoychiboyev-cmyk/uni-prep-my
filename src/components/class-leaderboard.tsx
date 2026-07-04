"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAuthStore } from "@/store/useAuthStore";
import { User } from "@/lib/firestore-schema";
import { buildClassLeaderboard } from "@/lib/leaderboard-utils";

const MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

/**
 * Рейтинг учеников класса по числу верно решённых заданий. Используется и в
 * учительском виде класса, и в виде ученика. Считает метрики сам по
 * переданному списку учеников; ничьи делят место, ученики без активности —
 * внизу без медали.
 */
export default function ClassLeaderboard({
    students,
    title,
}: {
    students: User[];
    title?: string;
}) {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const rows = useMemo(() => buildClassLeaderboard(students), [students]);

    return (
        <section>
            <div className="mb-4 flex items-center gap-2.5">
                <Trophy size={18} className="text-amber-500" />
                <h2 className="text-xl font-bold tracking-tight text-foreground">
                    {title ?? t("lb.title")}
                </h2>
            </div>

            {rows.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/50 px-6 py-12 text-center dark:bg-muted/30">
                    <p className="font-medium text-muted-foreground">{t("lb.empty")}</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    {/* Header */}
                    <div className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                        <span className="text-center">{t("lb.rank")}</span>
                        <span>{t("lb.student")}</span>
                        <span className="text-right">{t("lb.solved")}</span>
                    </div>

                    <ul className="divide-y divide-border">
                        {rows.map((row) => {
                            const isYou = user?.id === row.user.id;
                            const medal = row.hasActivity ? MEDALS[row.rank] : undefined;
                            return (
                                <li
                                    key={row.user.id}
                                    className={`grid grid-cols-[3rem_1fr_auto] items-center gap-3 px-4 py-3 transition-colors ${
                                        isYou ? "bg-amber-50/60 dark:bg-amber-950/20" : "hover:bg-muted/40"
                                    }`}
                                >
                                    {/* Rank / medal */}
                                    <span className="flex items-center justify-center">
                                        {medal ? (
                                            <span className="text-xl leading-none">{medal}</span>
                                        ) : (
                                            <span className={`text-sm font-bold tabular-nums ${
                                                row.hasActivity ? "text-foreground" : "text-muted-foreground/50"
                                            }`}>
                                                {row.rank}
                                            </span>
                                        )}
                                    </span>

                                    {/* Name */}
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-xs font-bold text-muted-foreground">
                                            {row.user.name?.[0] || "?"}
                                        </span>
                                        <span className="min-w-0 truncate">
                                            <span className={`font-semibold ${row.hasActivity ? "text-foreground" : "text-muted-foreground"}`}>
                                                {row.user.name} {row.user.surname || ""}
                                            </span>
                                            {isYou && (
                                                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
                                                    {t("lb.you")}
                                                </span>
                                            )}
                                        </span>
                                    </div>

                                    {/* Score */}
                                    <div className="text-right">
                                        {row.hasActivity ? (
                                            <div className="flex flex-col items-end leading-tight">
                                                <span className="text-base font-bold tabular-nums text-foreground">
                                                    {row.totalCorrect}
                                                </span>
                                                <span className="text-[11px] font-medium text-muted-foreground">
                                                    {row.accuracy}%
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-medium text-muted-foreground/60">
                                                {t("lb.noActivity")}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </section>
    );
}
