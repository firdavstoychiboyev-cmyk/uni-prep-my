"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchUserBadges } from "@/lib/stats-utils";
import { ACHIEVEMENTS, AchievementDef } from "@/lib/achievements";
import { Trophy, Lock, Calendar } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

const SERIES_META: Record<string, { label: string; labelRu: string; color: string }> = {
    sniper:  { label: "Sniper",  labelRu: "Снайпер",          color: "text-rose-500" },
    veteran: { label: "Veteran", labelRu: "Ветеран",           color: "text-amber-500" },
    focused: { label: "Focused", labelRu: "Сфокусированный",   color: "text-blue-500" },
    sharp:   { label: "Sharp",   labelRu: "Меткий",            color: "text-violet-500" },
    expert:  { label: "Expert",  labelRu: "Эксперт",           color: "text-emerald-500" },
};

const SERIES_ORDER = ["sniper", "veteran", "focused", "sharp", "expert"] as const;

type RawBadge = {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    unlockedAt?: Date | { toDate: () => Date } | string | { seconds: number };
};

function parseDate(unlockedAt?: RawBadge["unlockedAt"]): Date | null {
    if (!unlockedAt) return null;
    if (typeof unlockedAt === "string") return new Date(unlockedAt);
    if (unlockedAt instanceof Date) return unlockedAt;
    if ("toDate" in unlockedAt && typeof unlockedAt.toDate === "function") return unlockedAt.toDate();
    if ("seconds" in unlockedAt && typeof unlockedAt.seconds === "number") return new Date(unlockedAt.seconds * 1000);
    return null;
}

export default function AchievementsPage() {
    const { user } = useAuthStore();
    const { t, language } = useTranslation();
    const isRu = language === "ru";

    const [earnedMap, setEarnedMap] = useState<Map<string, RawBadge>>(new Map());
    const [otherBadges, setOtherBadges] = useState<RawBadge[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        fetchUserBadges(user.id).then((data) => {
            const achievementIds = new Set(ACHIEVEMENTS.map(a => a.id as string));
            const map = new Map<string, RawBadge>();
            const others: RawBadge[] = [];
            data.forEach(b => {
                if (achievementIds.has(b.id)) map.set(b.id, b);
                else others.push(b);
            });
            setEarnedMap(map);
            setOtherBadges(others);
            setIsLoading(false);
        });
    }, [user]);

    const totalEarned = ACHIEVEMENTS.filter(a => earnedMap.has(a.id)).length;

    return (
        <div className="flex animate-in fade-in slide-in-from-bottom-4 flex-col gap-10 py-4 duration-700">
            {/* Header */}
            <section>
                <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
                    {t("nav.achievements")}
                </h1>
                <p className="mt-2 text-muted-foreground">
                    {isLoading ? "…" : `${totalEarned} / ${ACHIEVEMENTS.length} ${isRu ? "разблокировано" : "razblokiylangan"}`}
                </p>
            </section>

            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-40 animate-pulse rounded-2xl border border-border bg-muted" />
                    ))}
                </div>
            ) : (
                <>
                    {/* Achievement series */}
                    {SERIES_ORDER.map((series) => {
                        const meta = SERIES_META[series];
                        const seriesAchievements = ACHIEVEMENTS.filter(a => a.series === series);
                        const earnedCount = seriesAchievements.filter(a => earnedMap.has(a.id)).length;

                        return (
                            <section key={series}>
                                <div className="flex items-center gap-3 mb-4">
                                    <h2 className={`text-xl font-bold ${meta.color}`}>
                                        {isRu ? meta.labelRu : meta.label}
                                    </h2>
                                    <span className="text-sm text-muted-foreground font-medium">
                                        {earnedCount}/{seriesAchievements.length}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {seriesAchievements.map((ach) => {
                                        const earned = earnedMap.get(ach.id);
                                        const isWar = ach.tier === 7;
                                        const date = earned ? parseDate(earned.unlockedAt) : null;

                                        return (
                                            <div
                                                key={ach.id}
                                                className={`relative flex flex-col items-center rounded-2xl border p-5 text-center transition-all duration-200
                                                    ${isWar
                                                        ? earned
                                                            ? "border-amber-400 bg-amber-50 dark:bg-amber-950/20 shadow-md"
                                                            : "border-amber-200 bg-amber-50/40 dark:bg-amber-950/10 grayscale opacity-60"
                                                        : earned
                                                            ? "border-border bg-card hover:shadow-sm"
                                                            : "border-border bg-muted/40 grayscale opacity-50"
                                                    }
                                                `}
                                            >
                                                {/* War badge glow */}
                                                {isWar && earned && (
                                                    <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-400/60 pointer-events-none" />
                                                )}

                                                {/* Lock overlay */}
                                                {!earned && (
                                                    <div className="absolute top-2 right-2">
                                                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                                    </div>
                                                )}

                                                <div className={`text-4xl mb-3 ${isWar ? "text-5xl" : ""}`}>
                                                    {ach.icon}
                                                </div>
                                                <div className={`font-bold text-foreground leading-tight ${isWar ? "text-base" : "text-sm"}`}>
                                                    {isRu ? ach.nameRu : ach.name}
                                                </div>
                                                <div className="mt-1 text-xs text-muted-foreground leading-snug">
                                                    {isRu ? ach.descriptionRu : ach.description}
                                                </div>

                                                {earned && date && (
                                                    <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>{date.toLocaleDateString(isRu ? "ru-RU" : "uz-UZ")}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        );
                    })}

                    {/* Other badges (textbook completions etc) */}
                    {otherBadges.length > 0 && (
                        <section>
                            <div className="flex items-center gap-3 mb-4">
                                <h2 className="text-xl font-bold text-foreground">
                                    {isRu ? "Другие награды" : "Boshqa mukofotlar"}
                                </h2>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                {otherBadges.map((badge) => {
                                    const date = parseDate(badge.unlockedAt);
                                    return (
                                        <div
                                            key={badge.id}
                                            className="flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center hover:shadow-sm transition-all"
                                        >
                                            <div className="text-4xl mb-3">{badge.icon || "🏆"}</div>
                                            <div className="font-bold text-sm text-foreground leading-tight">{badge.name}</div>
                                            {badge.description && (
                                                <div className="mt-1 text-xs text-muted-foreground leading-snug">{badge.description}</div>
                                            )}
                                            {date && (
                                                <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />
                                                    <span>{date.toLocaleDateString(isRu ? "ru-RU" : "uz-UZ")}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* Empty state if no earned achievements */}
                    {totalEarned === 0 && otherBadges.length === 0 && (
                        <div className="rounded-2xl border border-border bg-muted/50 py-16 text-center dark:bg-muted/30">
                            <Trophy size={48} className="mx-auto mb-4 text-muted-foreground" />
                            <h3 className="text-lg font-bold text-foreground">{t("ach.empty")}</h3>
                            <p className="mt-2 text-muted-foreground text-sm">{t("ach.emptyHint")}</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
