"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubjectsStore } from "@/store/useSubjectsStore";
import { useStatsStore } from "@/store/useStatsStore";
import { Topic } from "@/lib/firestore-schema";
import {
    fetchUserGlobalStats,
    GlobalStats,
    fetchUserSubjectRatings,
    fetchSubjectProgress,
    fetchUserDailyActivity,
} from "@/lib/stats-utils";
import { fetchSubjects, fetchTextbooksBySubject, fetchTopicsByTextbook, fetchTopicsBySubject } from "@/lib/data-fetching";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import SubjectCard from "@/components/subject-card";
import SubjectFailures from "@/components/subject-failures";
import ActivityHeatmap from "@/components/activity-heatmap";
import {
    Target, Flame, ListChecks, TrendingUp, Trophy,
    CheckCircle2, ChevronRight, BookOpen,
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface SubjectTopics {
    [subjectId: string]: string[];
}

export default function StatisticsPage() {
    const { user, isLoading: authLoading } = useAuthStore();
    const { t } = useTranslation();
    const { subjects, loaded: subjectsLoaded, setSubjects } = useSubjectsStore();
    const {
        stats: cachedStats,
        subjectProgress,
        setStats,
        setSubjectProgress,
        setRatings,
        setLoadedForUser,
    } = useStatsStore();

    const [globalStats, setGlobalStats] = useState<GlobalStats | null>(cachedStats);
    const [topicsBySubject, setTopicsBySubject] = useState<SubjectTopics>({});
    const [dailyActivity, setDailyActivity] = useState<Record<string, number>>({});
    const [streakDays, setStreakDays] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(!subjectsLoaded);

    // Серия дней — хранится в документе пользователя
    useEffect(() => {
        if (!user) return;
        getDoc(doc(db, "users", user.id))
            .then((snap) => setStreakDays(snap.data()?.streakDays ?? 0))
            .catch(() => setStreakDays(0));
    }, [user]);

    // Load subjects if not yet loaded
    useEffect(() => {
        if (!subjectsLoaded) {
            fetchSubjects().then(setSubjects);
        }
    }, [subjectsLoaded, setSubjects]);

    // Load stats — skip if already loaded for this user
    useEffect(() => {
        if (!user || !subjectsLoaded) return;

        const load = async () => {
            setIsLoading(false);

            // Global stats (always refresh for the stats page, but uses cache internally)
            const [gs, activity] = await Promise.all([
                fetchUserGlobalStats(user.id),
                fetchUserDailyActivity(user.id),
            ]);
            setGlobalStats(gs);
            setStats(gs);
            setDailyActivity(activity);

            const ratings = await fetchUserSubjectRatings(user.id);
            setRatings(ratings);
            setLoadedForUser(user.id);

            await Promise.all(
                subjects.map(async (subject) => {
                    const textbooks = await fetchTextbooksBySubject(subject.id);
                    const topicsPerTextbook = await Promise.all(
                        textbooks.map((tb) => fetchTopicsByTextbook(tb.id))
                    );
                    const textbookTopics = topicsPerTextbook.flat();

                    const directTopics = await fetchTopicsBySubject(subject.id);

                    const allTopicsMap = new Map<string, Topic>();
                    [...textbookTopics, ...directTopics].forEach((t) => allTopicsMap.set(t.id, t));
                    const allTopics = Array.from(allTopicsMap.values())
                        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

                    const allTopicIds = allTopics.map((t) => t.id);
                    const titles = allTopics.map((t) => t.title);

                    setTopicsBySubject((prev) => ({ ...prev, [subject.id]: titles }));

                    const progress = await fetchSubjectProgress(user.id, subject.id, allTopicIds);
                    setSubjectProgress(subject.id, {
                        stars: ratings[subject.id] || 0,
                        medals: progress.medals,
                        progress: progress.progress,
                    });
                })
            );
        };

        load();
    }, [user, subjectsLoaded, subjects, setStats, setRatings, setLoadedForUser, setSubjectProgress]);

    const totalMedals = (globalStats?.medals.green ?? 0) + (globalStats?.medals.grey ?? 0) + (globalStats?.medals.bronze ?? 0);

    // Статистика персональна — анонимному пользователю показываем приглашение войти вместо редиректа
    if (!authLoading && !user) {
        return (
            <div className="flex flex-col gap-10 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div>
                    <h1 className="text-[28px] font-extrabold text-foreground" style={{ letterSpacing: "-.02em" }}>{t("nav.statistics")}</h1>
                    <p className="text-[14px] mt-1 text-muted-foreground">{t("stats.subtitle")}</p>
                </div>
                <div className="rounded-xl bg-card border border-border px-6 py-14 flex flex-col items-center gap-5 text-center">
                    <TrendingUp className="w-8 h-8 text-muted-foreground/40" />
                    <p className="text-[15px] font-medium text-muted-foreground max-w-sm">{t("authPrompt.statistics")}</p>
                    <Link href="/login?returnTo=/statistics"
                        className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-bold transition-all duration-150 bg-foreground text-background hover:opacity-90 active:scale-95">
                        {t("authPrompt.login")}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-10 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Header */}
            <div>
                <h1 className="text-[28px] font-extrabold text-foreground" style={{ letterSpacing: "-.02em" }}>{t("nav.statistics")}</h1>
                <p className="text-[14px] mt-1 text-muted-foreground">{t("stats.subtitle")}</p>
            </div>

            {/* Global metric cards — horizontal with dividers */}
            <div className="rounded-xl overflow-hidden bg-card border border-border">
                <div className="grid grid-cols-2 lg:grid-cols-4">
                {[
                    { title: t("stats.solved"), value: String(globalStats?.totalSolved ?? 0), icon: ListChecks },
                    { title: t("stats.accuracy"), value: `${globalStats?.accuracy ?? 0}%`, icon: Target },
                    { title: t("stats.medals"), value: String(totalMedals), icon: Trophy },
                    { title: t("stats.streak"), value: streakDays === null ? "—" : String(streakDays), icon: Flame },
                ].map(({ title, value, icon: Icon }, i) => (
                    <div key={title} className={`p-5 sm:p-6 ${i !== 0 ? "border-l border-border" : ""}`}>
                        <div className="text-[11px] font-semibold mb-3 uppercase tracking-wider text-muted-foreground">{title}</div>
                        <div className="flex items-end justify-between gap-2">
                            <div className="text-[34px] font-extrabold tabular-nums text-foreground" style={{ letterSpacing: "-.02em" }}>{value}</div>
                            <Icon className="w-4 h-4 mb-2 text-muted-foreground/40" />
                        </div>
                    </div>
                ))}
                </div>
            </div>

            {/* Most failing subjects — ranked by wrong-answer count */}
            {user && <SubjectFailures userId={user.id} />}

            {/* Activity heatmap — calendar grid, last 6 months */}
            <ActivityHeatmap dailyActivity={dailyActivity} totalSolved={globalStats?.totalSolved ?? 0} />

            {/* Per-subject detailed cards */}
            <section>
                <h2 className="text-[17px] font-bold text-foreground mb-4">{t("stats.bySubjects")}</h2>

                {isLoading ? (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((n) => (
                            <div key={n} className="h-72 animate-pulse rounded-xl bg-muted" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {subjects.map((subject) => {
                            const data = subjectProgress[subject.id];
                            const pct = data?.progress ?? 0;
                            const medals = data?.medals ?? { green: 0, grey: 0, bronze: 0 };
                            const stars = data?.stars ?? 0;
                            const topics = topicsBySubject[subject.id] ?? [];
                            const showTopics = topics.slice(0, 14);
                            const rest = Math.max(0, topics.length - showTopics.length);
                            const totalMedalsSubject = medals.green + medals.grey + medals.bronze;
                            const loaded = !!data;

                            return (
                                <div key={subject.id} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                                    {/* Header */}
                                    <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-[hsl(var(--brand-blue-soft))] dark:bg-blue-950/30">
                                                <BookOpen className="h-4 w-4 text-[hsl(var(--brand-blue))] dark:text-blue-300" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-foreground truncate">{subject.name}</div>
                                                <div className="text-xs text-muted-foreground">{t("subject.topicsCount", { count: topics.length })}</div>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/subject/${subject.id}`}
                                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-border bg-card hover:bg-muted transition-colors"
                                        >
                                            {t("stats.toSubject")}
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>

                                    <div className="px-5 sm:px-6 py-5 flex flex-col gap-5">
                                        {/* Stats grid */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="rounded-xl border border-border bg-muted/50 p-4">
                                                <div className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground">{t("stats.stars")}</div>
                                                <div className="mt-2 text-2xl font-extrabold tabular-nums text-foreground">
                                                    {loaded ? stars : <span className="text-muted-foreground/40">—</span>}
                                                </div>
                                            </div>
                                            <div className="rounded-xl border border-border bg-muted/50 p-4">
                                                <div className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground">{t("stats.progress")}</div>
                                                <div className="mt-2 text-2xl font-extrabold tabular-nums text-foreground">
                                                    {loaded ? `${pct}%` : <span className="text-muted-foreground/40">—</span>}
                                                </div>
                                                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden border border-border">
                                                    <div
                                                        className="h-full rounded-full bg-[hsl(var(--brand-blue))] transition-all duration-700"
                                                        style={{ width: `${Math.min(100, pct)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Medals */}
                                        <div className="rounded-xl border border-border bg-muted/50 p-4">
                                            <div className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground mb-3">{t("stats.medalsByTopic")}</div>
                                            {loaded ? (
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm font-bold text-emerald-800 dark:text-emerald-200">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        {t("stats.greenMedals", { count: medals.green })}
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm font-bold text-foreground">
                                                        {t("stats.greyMedals", { count: medals.grey })}
                                                    </span>
                                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 text-sm font-bold text-orange-800 dark:text-orange-200">
                                                        {t("stats.bronzeMedals", { count: medals.bronze })}
                                                    </span>
                                                    {totalMedalsSubject > 0 && (
                                                        <span className="text-xs text-muted-foreground self-center">{t("stats.total", { count: totalMedalsSubject })}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="flex gap-2">
                                                    {[1, 2, 3].map(n => <div key={n} className="h-8 w-24 rounded-lg bg-muted animate-pulse" />)}
                                                </div>
                                            )}
                                        </div>

                                        {/* Topic list */}
                                        {showTopics.length > 0 && (
                                            <div>
                                                <div className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground mb-3">{t("stats.topics")}</div>
                                                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                                    {showTopics.map((t) => (
                                                        <div key={t} className="flex items-center justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
                                                            <span className="text-sm font-medium text-foreground truncate">{t}</span>
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {Array.from({ length: 4 }).map((_, i) => (
                                                                    <div key={i} className="w-4 h-4 rounded-md border border-border bg-muted/60" />
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {rest > 0 && (
                                                        <p className="text-xs text-muted-foreground pt-1">{t("stats.moreTopics", { count: rest })}</p>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Subject cards grid */}
            <section>
                <h2 className="text-lg font-bold text-foreground mb-4">{t("stats.quickAccess")}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.map((subject) => {
                        const progress = subjectProgress[subject.id] || {
                            stars: 0,
                            medals: { green: 0, grey: 0, bronze: 0 },
                            progress: 0,
                        };
                        return (
                            <SubjectCard
                                key={subject.id}
                                subject={subject}
                                stars={progress.stars}
                                medals={progress.medals}
                                progress={progress.progress}
                            />
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
