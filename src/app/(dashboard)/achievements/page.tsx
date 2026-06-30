"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchUserBadges } from "@/lib/stats-utils";
import { ACHIEVEMENTS } from "@/lib/achievements";
import { Trophy, Lock, Calendar, Target, Shield, Crosshair, Zap, Brain } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

const seriesConfig = {
    sniper:  { icon: Target,    color: "text-red-500",    bg: "bg-red-100 dark:bg-red-950",    border: "border-red-200 dark:border-red-800" },
    veteran: { icon: Shield,    color: "text-blue-500",   bg: "bg-blue-100 dark:bg-blue-950",   border: "border-blue-200 dark:border-blue-800" },
    focused: { icon: Crosshair, color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-950", border: "border-orange-200 dark:border-orange-800" },
    sharp:   { icon: Zap,       color: "text-yellow-500", bg: "bg-yellow-100 dark:bg-yellow-950", border: "border-yellow-200 dark:border-yellow-800" },
    expert:  { icon: Brain,     color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-950", border: "border-purple-200 dark:border-purple-800" },
};

function AchievementIcon({ series, tier, unlocked }: { series: string; tier: number; unlocked: boolean }) {
    const config = seriesConfig[series as keyof typeof seriesConfig] ?? seriesConfig.sniper;
    const Icon = config.icon;
    const isWar = tier === 7;

    return (
        <div className={`relative w-16 h-16 rounded-2xl flex items-center justify-center ${unlocked ? config.bg : "bg-muted"} ${isWar && unlocked ? "ring-2 ring-yellow-400" : ""}`}>
            <Icon className={`w-8 h-8 ${unlocked ? config.color : "text-muted-foreground/40"}`} />
            {isWar && unlocked && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-[10px]">⭐</div>
            )}
            {!unlocked && (
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm" style={{ background: "#fff", border: "1px solid #EAEDF0" }}>
                    <Lock className="w-2.5 h-2.5" style={{ color: "#98A1AC" }} />
                </div>
            )}
        </div>
    );
}

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
                <h1 className="text-[28px] font-extrabold" style={{ color: "#0E1419", letterSpacing: "-.02em" }}>
                    {t("nav.achievements")}
                </h1>
                <p className="mt-1 text-[14px]" style={{ color: "#6B7480" }}>
                    {isLoading ? "…" : `${totalEarned} / ${ACHIEVEMENTS.length} ${isRu ? "разблокировано" : "razblokiylangan"}`}
                </p>
            </section>

            {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-40 animate-pulse rounded-2xl" style={{ border: "1px solid #EAEDF0", background: "#F8FAFB" }} />
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
                                    <h2 className="text-[19px] font-extrabold" style={{ color: "#0E1419" }}>
                                        {isRu ? meta.labelRu : meta.label}
                                    </h2>
                                    <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold" style={{ background: "#F4F6F8", color: "#6B7480" }}>
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
                                                className="relative flex flex-col items-center rounded-[18px] p-5 text-center transition-all duration-200"
                                                style={{
                                                    background: "#fff",
                                                    border: `1px solid ${isWar && earned ? "#FBBF24" : "#EAEDF0"}`,
                                                    boxShadow: isWar && earned ? "0 0 0 2px rgba(251,191,36,.2)" : "none",
                                                    opacity: !earned ? 0.7 : 1,
                                                    filter: !earned ? "grayscale(0.5)" : "none",
                                                }}
                                            >
                                                {/* War badge glow */}
                                                {isWar && earned && (
                                                    <div className="absolute inset-0 rounded-2xl ring-2 ring-amber-400/60 pointer-events-none" />
                                                )}

                                                <div className="mb-4">
                                                    <AchievementIcon series={ach.series} tier={ach.tier} unlocked={!!earned} />
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
                                            <div className="mb-4 w-16 h-16 rounded-2xl flex items-center justify-center bg-amber-100 dark:bg-amber-950">
                                                <Trophy className="w-8 h-8 text-amber-500" />
                                            </div>
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
