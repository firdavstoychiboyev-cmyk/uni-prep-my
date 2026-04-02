"use client";

import Link from "next/link";
import type { GlobalStats } from "@/lib/stats-utils";
import type { Subject } from "@/lib/firestore-schema";
import {
    BarChart3,
    Bookmark,
    CheckCircle2,
    Flame,
    ListChecks,
    Target,
    TrendingUp,
    BookOpen,
    ChevronRight,
} from "lucide-react";

export interface SubjectProgressSnapshot {
    stars: number;
    medals: { green: number; grey: number; bronze: number };
    progress: number;
}

function findSubject(subjects: Subject[], id: string, nameHints: string[]) {
    const byId = subjects.find((s) => s.id === id);
    if (byId) return byId;
    const lower = nameHints.map((h) => h.toLowerCase());
    return subjects.find((s) => {
        const n = s.name.toLowerCase();
        return lower.some((h) => n.includes(h));
    });
}

function MetricCard({
    title,
    value,
    subtitle,
    icon: Icon,
    tone = "neutral",
}: {
    title: string;
    value: string;
    subtitle?: string;
    icon: React.ComponentType<{ className?: string }>;
    tone?: "neutral" | "blue" | "green" | "amber" | "purple";
}) {
    const toneBg =
        tone === "blue"
            ? "bg-[hsl(var(--brand-blue-soft))] dark:bg-sky-950/25"
            : tone === "purple"
              ? "bg-[hsl(var(--brand-purple-soft))] dark:bg-purple-950/25"
              : tone === "green"
                ? "bg-emerald-50 dark:bg-emerald-950/30"
                : tone === "amber"
                  ? "bg-amber-50 dark:bg-amber-950/30"
                  : "bg-muted";

    return (
        <div
            className={`group rounded-2xl border border-border ${toneBg} p-5 transition-all hover:shadow-sm hover:border-border/80`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-muted-foreground">{title}</div>
                    <div className="mt-2 text-3xl font-extrabold tracking-tight text-foreground tabular-nums">{value}</div>
                    {subtitle ? <div className="mt-1.5 text-sm font-medium text-muted-foreground">{subtitle}</div> : null}
                </div>
                <div className="shrink-0 w-11 h-11 rounded-xl border border-border/60 bg-card/80 flex items-center justify-center shadow-sm group-hover:bg-card transition-colors">
                    <Icon className="w-5 h-5 text-foreground/80" />
                </div>
            </div>
        </div>
    );
}

function ActivityHeatmap({ activityHint }: { activityHint: number }) {
    const weeks = 26;
    const days = 7;
    const cells = weeks * days;
    const filled = Math.min(cells, Math.max(0, Math.floor(activityHint)));

    return (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                        <div className="text-lg font-bold tracking-tight text-foreground">Активность</div>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Всего: <span className="font-semibold text-foreground tabular-nums">{activityHint}</span>
                        </p>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-[auto_1fr] gap-3 sm:gap-4 items-start">
                <div className="pt-1 text-[10px] sm:text-[11px] text-muted-foreground leading-6">
                    <div className="h-4" />
                    <div className="h-6 flex items-center">Пн</div>
                    <div className="h-6" />
                    <div className="h-6 flex items-center">Ср</div>
                    <div className="h-6" />
                    <div className="h-6 flex items-center">Пт</div>
                </div>

                <div className="overflow-x-auto pb-1">
                    <div
                        className="grid gap-1 w-max"
                        style={{ gridTemplateColumns: `repeat(${weeks}, 10px)` }}
                    >
                        {Array.from({ length: cells }).map((_, i) => {
                            const active = i < filled;
                            const level = active
                                ? i % 4 === 0
                                    ? "bg-[hsl(var(--brand-blue))]"
                                    : i % 3 === 0
                                      ? "bg-[hsl(var(--brand-blue))]/70"
                                      : "bg-[hsl(var(--brand-blue))]/45"
                                : "bg-muted";
                            return <div key={i} className={`w-[10px] h-[10px] rounded-[3px] ${level}`} />;
                        })}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <span>Меньше</span>
                            <span className="inline-flex items-center gap-1">
                                <span className="w-2.5 h-2.5 rounded-[3px] bg-muted border border-border" />
                                <span className="w-2.5 h-2.5 rounded-[3px] bg-[hsl(var(--brand-blue))]/35" />
                                <span className="w-2.5 h-2.5 rounded-[3px] bg-[hsl(var(--brand-blue))]/65" />
                                <span className="w-2.5 h-2.5 rounded-[3px] bg-[hsl(var(--brand-blue))]" />
                            </span>
                            <span>Больше</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function TopicList({
    subject,
    topicTitles,
}: {
    subject: Subject;
    topicTitles: string[];
}) {
    const show = topicTitles.slice(0, 14);
    const rest = Math.max(0, topicTitles.length - show.length);

    return (
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-[hsl(var(--brand-blue-soft))] dark:bg-sky-950/30">
                        <BookOpen className="h-4 w-4 text-[hsl(var(--brand-blue))] dark:text-sky-300" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-lg font-bold tracking-tight text-foreground truncate">{subject.name}</div>
                        <div className="text-xs text-muted-foreground">Темы</div>
                    </div>
                </div>
                <Link
                    href={`/subject/${subject.id}`}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-border bg-card hover:bg-muted transition-colors active:scale-[0.98]"
                >
                    К предмету
                    <ChevronRight className="w-4 h-4" />
                </Link>
            </div>

            <div className="px-5 sm:px-6 py-4">
                {show.length === 0 ? (
                    <p className="mt-1 text-sm text-muted-foreground">Тем пока нет.</p>
                ) : (
                    <div className="mt-4 space-y-2.5 max-h-[min(420px,55vh)] overflow-y-auto pr-1">
                        {show.map((t) => (
                            <div key={t} className="flex items-center justify-between gap-3 py-1.5">
                                <div className="text-sm font-medium text-foreground truncate">{t}</div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="w-4 h-4 sm:w-5 sm:h-5 rounded-md border border-border bg-muted/60"
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                        {rest > 0 ? (
                            <p className="text-xs text-muted-foreground pt-2">+ ещё {rest} тем</p>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}

function SubjectStatsPanel({
    title,
    progress,
}: {
    title: string;
    progress: SubjectProgressSnapshot;
}) {
    const totalMedals =
        progress.medals.green + progress.medals.grey + progress.medals.bronze;

    return (
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
                <h3 className="text-sm font-bold text-foreground">{title}</h3>
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">{progress.progress}% тем</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <div className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground">Звёзды (рейтинг)</div>
                    <div className="mt-2 text-2xl font-extrabold tabular-nums text-foreground">{progress.stars}</div>
                </div>

                <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <div className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground">Прогресс</div>
                    <div className="mt-2 text-2xl font-extrabold tabular-nums text-foreground">{progress.progress}%</div>
                    <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden border border-border">
                        <div
                            className="h-full rounded-full bg-[hsl(var(--brand-blue))] transition-all"
                            style={{ width: `${Math.min(100, progress.progress)}%` }}
                        />
                    </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/50 p-4 sm:col-span-2">
                    <div className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground">Медали по темам</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm font-bold text-emerald-800 dark:text-emerald-200">
                            <CheckCircle2 className="w-4 h-4" />
                            {progress.medals.green} зелёных
                        </span>
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border text-sm font-bold text-foreground">
                            {progress.medals.grey} серых
                        </span>
                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900 text-sm font-bold text-orange-800 dark:text-orange-200">
                            {progress.medals.bronze} бронзовых
                        </span>
                        <span className="text-xs text-muted-foreground self-center">Всего с медалью: {totalMedals}</span>
                    </div>
                </div>
            </div>

        </div>
    );
}

export default function ChartsMetrics({
    stats,
    subjects,
    subjectProgress,
    topicsBySubjectId,
}: {
    stats: GlobalStats | null;
    subjects: Subject[];
    subjectProgress: Record<string, SubjectProgressSnapshot>;
    topicsBySubjectId: Record<string, string[]>;
}) {
    const totalSolved = stats?.totalSolved ?? 0;
    const accuracy = stats?.accuracy ?? 0;
    const medals = stats?.medals ?? { green: 0, grey: 0, bronze: 0 };

    const english = findSubject(subjects, "english", ["англ", "иностран"]);
    const math = findSubject(subjects, "math", ["матем", "алгебр"]);

    const engProg = english ? subjectProgress[english.id] : undefined;
    const mathProg = math ? subjectProgress[math.id] : undefined;

    const correctSubtitle =
        totalSolved === 0 && accuracy === 0
            ? undefined
            : accuracy === 100 && totalSolved > 0
              ? "Отличный результат"
              : `Медали: зел. ${medals.green}, сер. ${medals.grey}, бронз. ${medals.bronze}`;

    return (
        <section className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-[hsl(var(--brand-blue-soft))] shadow-sm dark:bg-sky-950/30">
                    <BarChart3 className="h-5 w-5 text-[hsl(var(--brand-blue))] dark:text-sky-300" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Графики и метрики</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Решено (рейтинг)" value={String(totalSolved)} icon={ListChecks} tone="blue" />
                <MetricCard
                    title="Точность"
                    value={`${accuracy}%`}
                    subtitle={correctSubtitle}
                    icon={Target}
                    tone="green"
                />
                <MetricCard title="Серия" value="—" icon={Flame} tone="amber" />
                <MetricCard title="Сохранено" value="—" icon={Bookmark} tone="purple" />
            </div>

            <ActivityHeatmap activityHint={totalSolved} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {english ? (
                    <div className="space-y-4">
                        <TopicList subject={english} topicTitles={topicsBySubjectId[english.id] ?? []} />
                        {engProg ? (
                            <SubjectStatsPanel title={`Статистика: ${english.name}`} progress={engProg} />
                        ) : null}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        Нет предмета «Английский».
                    </div>
                )}

                {math ? (
                    <div className="space-y-4">
                        <TopicList subject={math} topicTitles={topicsBySubjectId[math.id] ?? []} />
                        {mathProg ? (
                            <SubjectStatsPanel title={`Статистика: ${math.name}`} progress={mathProg} />
                        ) : null}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        Нет предмета «Математика».
                    </div>
                )}
            </div>

        </section>
    );
}
