"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Subject, Topic, UserProgress } from "@/lib/firestore-schema";
import { fetchTextbooksBySubject, fetchSubjectById, fetchTopicsByTextbook, fetchTopicsBySubject } from "@/lib/data-fetching";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
    ChevronRight,
    Filter,
    ChevronDown,
    Check,
    Bookmark,
    BookmarkCheck,
    Trophy,
} from "lucide-react";

type Medal = "none" | "green" | "grey" | "bronze";

function medalColor(medal: Medal): string {
    if (medal === "green") return "text-emerald-500";
    if (medal === "grey") return "text-slate-400 dark:text-slate-500";
    if (medal === "bronze") return "text-amber-500";
    return "";
}

function accuracyColor(accuracy: number): string {
    if (accuracy >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (accuracy >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-500 dark:text-red-400";
}

function accuracyDot(accuracy: number): string {
    if (accuracy >= 80) return "bg-emerald-500";
    if (accuracy >= 50) return "bg-amber-500";
    return "bg-red-500";
}

type TopicGroup = {
    textbookId: string | null;
    textbookTitle: string;
    topics: Topic[];
};

type DiffFilter = "all" | "easy" | "medium" | "hard";
type SavedFilter = "all" | "saved" | "not_marked";
type CompletedFilter = "all" | "solved" | "unsolved";
type AnswerFilter = "all" | "incorrect" | "correct";

/* ─── helpers ────────────────────────────────────────────── */


function TopicCheckbox({
    checked,
    onChange,
    disabled,
    stopPropagation,
}: {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
    stopPropagation?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={(e) => {
                if (stopPropagation) e.stopPropagation();
                onChange();
            }}
            disabled={disabled}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
                checked ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-muted-foreground/40"
            } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        >
            {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
        </button>
    );
}

function FilterButton<T extends string>({
    icon,
    label,
    value,
    options,
    onChange,
}: {
    icon?: React.ReactNode;
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (v: T) => void;
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const isActive = value !== "all";
    const activeLabel = options.find((o) => o.value === value)?.label;

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div ref={ref} className="relative">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-semibold transition-colors duration-200 ${
                    isActive
                        ? "border-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue-soft))] text-[hsl(var(--brand-blue))]"
                        : "border-border bg-card text-foreground hover:bg-muted"
                }`}
            >
                {icon && <span className="text-muted-foreground">{icon}</span>}
                {label}
                {isActive && (
                    <span className="text-xs font-medium text-[hsl(var(--brand-blue))]/80">· {activeLabel}</span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
                <div className="absolute left-0 top-full mt-2 z-50 w-52 rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                    <div className="py-1.5">
                        {options.map((opt) => {
                            const selected = opt.value === value;
                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => { onChange(opt.value); setOpen(false); }}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-muted transition-colors text-left"
                                >
                                    <span
                                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                            selected
                                                ? "border-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue))]"
                                                : "border-border"
                                        }`}
                                    >
                                        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                                    </span>
                                    <span className={`text-sm ${selected ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                                        {opt.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── page ────────────────────────────────────────────────── */

export default function SubjectPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuthStore();
    const { t, language } = useTranslation();
    const [groups, setGroups] = useState<TopicGroup[]>([]);
    const [subject, setSubject] = useState<Subject | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [multiSelect] = useState(true);
    const [randomize] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Filter bar visibility
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Collapsed textbook groups
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
    const toggleGroupCollapse = (key: string) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    // Filter values
    const [diffFilter, setDiffFilter] = useState<DiffFilter>("all");
    const [savedFilter, setSavedFilter] = useState<SavedFilter>("all");
    const [completedFilter, setCompletedFilter] = useState<CompletedFilter>("all");
    const [answerFilter, setAnswerFilter] = useState<AnswerFilter>("all");

    // Filter data
    const [savedTopics, setSavedTopics] = useState<Set<string>>(new Set());
    const [progressMap, setProgressMap] = useState<Record<string, UserProgress>>({});
    const [topicDifficulty, setTopicDifficulty] = useState<Record<string, DiffFilter>>({});

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            try {
                const [subData, textData, directTopics] = await Promise.all([
                    fetchSubjectById(id as string),
                    fetchTextbooksBySubject(id as string),
                    fetchTopicsBySubject(id as string),
                ]);
                setSubject(subData);

                const topicGroups: TopicGroup[] = [];
                // Only show topics without a textbookId in the direct/standalone column.
                // Topics that have a textbookId also come back from fetchTopicsBySubject
                // (because they share subjectId), which would cause them to appear in both columns.
                const standaloneTopics = directTopics.filter(tp => !tp.textbookId);
                if (standaloneTopics.length > 0) {
                    topicGroups.push({ textbookId: null, textbookTitle: "Общие темы", topics: standaloneTopics });
                }

                // Fetch topics for all textbooks in parallel
                const textbooksWithTopics = await Promise.all(
                    textData.map(async (tb) => {
                        const topics = await fetchTopicsByTextbook(tb.id);
                        return { textbookId: tb.id, textbookTitle: tb.title, topics };
                    })
                );
                
                topicGroups.push(...textbooksWithTopics);
                setGroups(topicGroups);

                // Collapse all textbook groups by default, leave "direct" open
                const textbookKeys = topicGroups
                    .filter(g => g.textbookId !== null)
                    .map(g => g.textbookId as string);
                setCollapsedGroups(new Set(textbookKeys));
            } catch (error) {
                console.error("Failed to load subject data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [id]);

    // Load saved topics from localStorage
    useEffect(() => {
        try {
            const raw = localStorage.getItem("savedTopics");
            if (raw) setSavedTopics(new Set(JSON.parse(raw) as string[]));
        } catch { /* ignore */ }
    }, []);

    // Load user progress (подколлекция users/{uid}/userProgress/{topicId})
    useEffect(() => {
        if (!user || groups.length === 0) return;
        const allIds = groups.flatMap((g) => g.topics.map((t) => t.id));
        if (allIds.length === 0) return;
        const idSet = new Set(allIds);
        let cancelled = false;
        const fetchProgress = async () => {
            try {
                const snap = await getDocs(collection(db, "users", user.id, "userProgress"));
                if (cancelled) return;
                const map: Record<string, UserProgress> = {};
                snap.forEach((d) => {
                    if (!idSet.has(d.id)) return;
                    const raw = d.data() as UserProgress;
                    map[d.id] = { ...raw, topicId: raw.topicId ?? d.id };
                });
                setProgressMap(map);
            } catch (e) {
                console.error("subject progress fetch failed", e);
            }
        };
        void fetchProgress();
        const onVisible = () => {
            if (document.visibilityState === "visible") void fetchProgress();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            cancelled = true;
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [user, groups]);

    // Load difficulty data lazily when filter is activated
    useEffect(() => {
        if (diffFilter === "all") return;
        const allIds = groups.flatMap((g) => g.topics.map((t) => t.id));
        if (allIds.length === 0) return;
        const fetchDifficulties = async () => {
            const chunks: string[][] = [];
            for (let i = 0; i < allIds.length; i += 10) chunks.push(allIds.slice(i, i + 10));
            const counts: Record<string, Record<string, number>> = {};
            await Promise.all(
                chunks.map(async (chunk) => {
                    const q = query(collection(db, "questions"), where("topicId", "in", chunk));
                    const snap = await getDocs(q);
                    snap.docs.forEach((d) => {
                        const data = d.data() as { topicId: string; difficulty: string };
                        if (!counts[data.topicId]) counts[data.topicId] = {};
                        counts[data.topicId][data.difficulty] = (counts[data.topicId][data.difficulty] || 0) + 1;
                    });
                })
            );
            const diffMap: Record<string, DiffFilter> = {};
            for (const topicId of Object.keys(counts)) {
                const c = counts[topicId];
                diffMap[topicId] = (Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "all") as DiffFilter;
            }
            setTopicDifficulty(diffMap);
        };
        fetchDifficulties().catch(() => {});
    }, [diffFilter, groups]);

    const toggleSaved = useCallback((topicId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSavedTopics((prev) => {
            const next = new Set(prev);
            if (next.has(topicId)) next.delete(topicId); else next.add(topicId);
            localStorage.setItem("savedTopics", JSON.stringify(Array.from(next)));
            return next;
        });
    }, []);

    const flatTopics = useMemo(() => {
        const list: { topic: Topic; textbookId: string | null }[] = [];
        for (const g of groups)
            for (const t of g.topics)
                list.push({ topic: t, textbookId: g.textbookId });
        return list;
    }, [groups]);

    const activeFilterCount = useMemo(() => {
        let n = 0;
        if (diffFilter !== "all") n++;
        if (savedFilter !== "all") n++;
        if (completedFilter !== "all") n++;
        if (answerFilter !== "all") n++;
        return n;
    }, [diffFilter, savedFilter, completedFilter, answerFilter]);

    const resetFilters = useCallback(() => {
        setDiffFilter("all");
        setSavedFilter("all");
        setCompletedFilter("all");
        setAnswerFilter("all");
    }, []);

    const topicPassesFilters = useCallback(
        (topic: Topic): boolean => {
            if (savedFilter === "saved" && !savedTopics.has(topic.id)) return false;
            if (savedFilter === "not_marked" && savedTopics.has(topic.id)) return false;
            const prog = progressMap[topic.id];
            if (completedFilter === "solved" && (!prog || prog.medal === "none")) return false;
            if (completedFilter === "unsolved" && prog && prog.medal !== "none") return false;
            if (answerFilter === "correct" && (!prog || prog.accuracy < 70)) return false;
            if (answerFilter === "incorrect" && (!prog || prog.accuracy >= 70)) return false;
            if (diffFilter !== "all") {
                const diff = topicDifficulty[topic.id];
                if (diff && diff !== diffFilter) return false;
            }
            return true;
        },
        [savedFilter, savedTopics, completedFilter, progressMap, answerFilter, diffFilter, topicDifficulty]
    );

    const displayGroups = useMemo(() => {
        const base = randomize
            ? groups.map((g) => ({ ...g, topics: [...g.topics].sort(() => Math.random() - 0.5) }))
            : groups;
        return base
            .map((g) => ({ ...g, topics: g.topics.filter(topicPassesFilters) }))
            .filter((g) => g.topics.length > 0 || (activeFilterCount === 0 && g.textbookId !== null));
    }, [groups, randomize, topicPassesFilters, activeFilterCount]);

    const totalQuestions = useMemo(
        () => flatTopics.reduce((s, { topic }) => s + (topic.totalQuestions || 0), 0),
        [flatTopics]
    );

    const completedTopicsCount = useMemo(
        () => flatTopics.filter(({ topic }) => {
            const prog = progressMap[topic.id];
            return prog && prog.medal && prog.medal !== "none";
        }).length,
        [flatTopics, progressMap]
    );

    const subjectCompletionPct = useMemo(
        () => flatTopics.length === 0 ? 0 : Math.round((completedTopicsCount / flatTopics.length) * 100),
        [completedTopicsCount, flatTopics.length]
    );


    const toggleTopic = useCallback(
        (topicId: string) => {
            setSelectedIds((prev) => {
                const next = new Set(multiSelect ? prev : []);
                if (next.has(topicId)) next.delete(topicId);
                else { if (!multiSelect) next.clear(); next.add(topicId); }
                return next;
            });
        },
        [multiSelect]
    );

    const selectAll = useCallback(() => {
        if (selectedIds.size === flatTopics.length) { setSelectedIds(new Set()); return; }
        setSelectedIds(new Set(flatTopics.map(({ topic }) => topic.id)));
    }, [flatTopics, selectedIds.size]);

    // Тест сохраняет прогресс/результаты — без входа отправляем на логин с возвратом обратно на тест
    const startTest = useCallback((url: string) => {
        if (!user) {
            router.push(`/login?returnTo=${encodeURIComponent(url)}`);
            return;
        }
        router.push(url);
    }, [user, router]);

    const startPractice = () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        const params = ids.length > 1 ? `?t=${ids.join(",")}` : "";
        startTest(`/test/${ids[0]}${params}`);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 py-4 animate-pulse">
                <div className="h-4 w-40 bg-muted rounded-full" />
                <div className="h-10 w-72 bg-muted rounded-2xl" />
                <div className="h-14 rounded-2xl bg-muted" />
                <div className="h-40 rounded-3xl bg-muted" />
            </div>
        );
    }

    if (!subject) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-muted-foreground text-lg font-medium">{t("subject.notFound")}</p>
            </div>
        );
    }

    const hasGroups = groups.length > 0;
    const hasTopics = flatTopics.length > 0;

    return (
        <div className="mx-auto w-full max-w-4xl flex flex-col gap-7 pb-28 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <Link href="/home" className="hover:text-foreground transition-colors duration-200">
                    {t("nav.home")}
                </Link>
                <ChevronRight size={14} className="text-border" />
                <span className="text-foreground">{subject.name}</span>
            </nav>

            {/* Title */}
            <div>
                <h1 className="text-[30px] sm:text-[38px] font-extrabold text-foreground leading-[1.05]" style={{ letterSpacing: "-.025em" }}>{subject.name}</h1>
                <p className="text-[14px] sm:text-[15px] mt-1.5 text-muted-foreground font-medium">
                    {totalQuestions} {pluralQuestions(totalQuestions, language)} · {t("subject.questionBank")}
                </p>
            </div>

            {/* Toolbar row 1: Filters toggle + toggles */}
            <div className="flex flex-wrap items-center gap-3">
                <button
                    type="button"
                    onClick={() => setFiltersOpen((v) => !v)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors duration-200 shadow-sm ${
                        filtersOpen || activeFilterCount > 0
                            ? "border-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue-soft))] text-[hsl(var(--brand-blue))] dark:bg-[hsl(var(--brand-blue))]/15 dark:border-[hsl(var(--brand-blue))]/50"
                            : "border-border bg-card text-foreground hover:bg-muted dark:bg-muted/30 dark:hover:bg-muted/50"
                    }`}
                >
                    <Filter className="w-4 h-4" />
                    {t("subject.filters")}
                    {activeFilterCount > 0 && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--brand-blue))] text-white text-[11px] font-bold">
                            {activeFilterCount}
                        </span>
                    )}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`} />
                </button>

            </div>

            {/* Toolbar row 2: individual filter buttons (shown when filtersOpen) */}
            {filtersOpen && (
                <div className="flex flex-wrap items-center gap-2">
                    <FilterButton<DiffFilter>
                        label={t("subject.difficulty")}
                        value={diffFilter}
                        onChange={setDiffFilter}
                        options={[
                            { value: "all", label: t("common.all") },
                            { value: "easy", label: t("subject.diff.easy") },
                            { value: "medium", label: t("subject.diff.medium") },
                            { value: "hard", label: t("subject.diff.hard") },
                        ]}
                    />
                    <FilterButton<SavedFilter>
                        label={t("subject.saved")}
                        value={savedFilter}
                        onChange={setSavedFilter}
                        options={[
                            { value: "all", label: t("common.all") },
                            { value: "saved", label: t("subject.saved.only") },
                            { value: "not_marked", label: t("subject.saved.notMarked") },
                        ]}
                    />
                    <FilterButton<CompletedFilter>
                        label={t("subject.completedFilter")}
                        value={completedFilter}
                        onChange={setCompletedFilter}
                        options={[
                            { value: "all", label: t("common.all") },
                            { value: "solved", label: t("subject.completed.solved") },
                            { value: "unsolved", label: t("subject.completed.unsolved") },
                        ]}
                    />
                    <FilterButton<AnswerFilter>
                        label={t("subject.answerStatus")}
                        value={answerFilter}
                        onChange={setAnswerFilter}
                        options={[
                            { value: "all", label: t("common.all") },
                            { value: "incorrect", label: t("subject.answer.incorrect") },
                            { value: "correct", label: t("subject.answer.correct") },
                        ]}
                    />
                    {activeFilterCount > 0 && (
                        <button
                            type="button"
                            onClick={resetFilters}
                            className="px-3.5 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                        >
                            {t("common.reset")}
                        </button>
                    )}
                </div>
            )}

            {/* Overall progress — unboxed summary */}
            {hasTopics && (
                <div className="flex flex-col gap-3">
                    <div className="flex items-end justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <TopicCheckbox
                                checked={selectedIds.size === flatTopics.length}
                                onChange={selectAll}
                                disabled={!hasTopics}
                            />
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70">{t("subject.overallProgress")}</p>
                                <p className="text-[15px] font-semibold text-foreground tabular-nums">
                                    {completedTopicsCount} / {flatTopics.length} {t("subject.topicsWord")}
                                </p>
                            </div>
                        </div>
                        <span className="text-3xl sm:text-4xl font-extrabold tabular-nums text-foreground leading-none">{subjectCompletionPct}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full overflow-hidden bg-muted">
                        <div
                            className="h-full rounded-full transition-all duration-700 bg-foreground"
                            style={{ width: `${subjectCompletionPct}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Topic tree */}
            {!hasGroups ? (
                <div className="py-16 text-center rounded-3xl border border-border bg-muted/30">
                    <p className="text-muted-foreground font-medium">{t("subject.noContent")}</p>
                </div>
            ) : displayGroups.length === 0 ? (
                <div className="py-16 text-center rounded-3xl border border-border bg-muted/30">
                    <p className="text-muted-foreground font-medium">{t("subject.noFilterMatch")}</p>
                    <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-4 px-5 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                    >
                        {t("subject.resetFilters")}
                    </button>
                </div>
            ) : (() => {
                const directGroup = displayGroups.find(g => g.textbookId === null);
                const textbookGroups = displayGroups.filter(g => g.textbookId !== null);
                const orderedGroups: TopicGroup[] = [
                    ...(directGroup ? [{ ...directGroup, textbookTitle: t("subject.generalTopics") }] : []),
                    ...textbookGroups,
                ];

                const renderTopicRow = (topic: Topic) => {
                    const q = topic.totalQuestions || 0;
                    const selected = selectedIds.has(topic.id);
                    const isSaved = savedTopics.has(topic.id);
                    const prog = progressMap[topic.id];
                    const isCompleted = Boolean(prog && prog.medal && prog.medal !== "none");
                    const solved = prog?.correctFirstCount ?? prog?.solvedQuestions ?? 0;
                    const topicPct = q > 0 ? Math.min(100, Math.round((solved / q) * 100)) : 0;
                    const acc = prog?.accuracy;
                    const showAcc = prog !== undefined && typeof acc === "number" && (acc > 0 || isCompleted);
                    return (
                        <li key={topic.id}>
                            <div
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                        e.preventDefault();
                                        if (multiSelect) toggleTopic(topic.id);
                                        else startTest(`/test/${topic.id}`);
                                    }
                                }}
                                onClick={() => {
                                    if (multiSelect) toggleTopic(topic.id);
                                    else startTest(`/test/${topic.id}`);
                                }}
                                className={`group flex cursor-pointer items-center gap-3.5 py-4 px-3 -mx-3 rounded-2xl transition-colors duration-200 ${
                                    selected ? "bg-[hsl(var(--brand-blue-soft))]/50 dark:bg-[hsl(var(--brand-blue))]/15" : "hover:bg-muted/60 dark:hover:bg-white/5"
                                }`}
                            >
                                <TopicCheckbox
                                    checked={selected}
                                    onChange={() => toggleTopic(topic.id)}
                                    stopPropagation
                                />
                                <div className="min-w-0 flex-1 flex flex-col gap-2">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="truncate text-[15px] font-semibold text-foreground leading-snug">
                                            {topic.title}
                                        </span>
                                        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3.5">
                                            {/* Accuracy dot + % */}
                                            {showAcc && (
                                                <span className="hidden sm:inline-flex items-center gap-1.5" title={t("subject.colAccuracy")}>
                                                    <span className={`h-2 w-2 rounded-full ${accuracyDot(acc!)}`} />
                                                    <span className={`text-[13px] font-semibold tabular-nums ${accuracyColor(acc!)}`}>{Math.round(acc!)}%</span>
                                                </span>
                                            )}
                                            {/* Progress fraction */}
                                            <span className="text-[13px] font-medium text-muted-foreground tabular-nums whitespace-nowrap">
                                                {q > 0 ? `${solved}/${q}` : "—"}
                                            </span>
                                            {isCompleted && <Trophy size={14} className={medalColor(prog!.medal as Medal)} />}
                                            <button
                                                type="button"
                                                onClick={(e) => toggleSaved(topic.id, e)}
                                                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                                    isSaved
                                                        ? "text-[hsl(var(--brand-blue))] hover:bg-[hsl(var(--brand-blue-soft))]"
                                                        : "text-muted-foreground/40 hover:bg-muted hover:text-foreground"
                                                }`}
                                                title={isSaved ? t("subject.unsave") : t("subject.saveTopic")}
                                            >
                                                {isSaved
                                                    ? <BookmarkCheck className="w-4 h-4" />
                                                    : <Bookmark className="w-4 h-4" />
                                                }
                                            </button>
                                        </div>
                                    </div>
                                    {/* Progress bar — always present */}
                                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                isCompleted ? "bg-emerald-500 dark:bg-emerald-400" : "bg-[hsl(var(--brand-blue))] opacity-70"
                                            }`}
                                            style={{ width: `${topicPct}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                };

                return (
                    <div className="flex flex-col gap-9">
                        {/* Column headers */}
                        <div className="flex items-center justify-between px-3 pb-2 border-b border-border text-[11px] font-bold uppercase tracking-wide text-muted-foreground/60">
                            <span>{t("subject.colTopic")}</span>
                            <span className="hidden sm:block">{t("subject.colAccuracy")} · {t("subject.colProgress")}</span>
                        </div>

                        {orderedGroups.map((group) => {
                            const isTextbook = group.textbookId !== null;
                            const groupKey = (group.textbookId as string) ?? "__general__";
                            const isCollapsed = isTextbook && collapsedGroups.has(groupKey);
                            return (
                                <section key={groupKey}>
                                    {isTextbook ? (
                                        <button
                                            type="button"
                                            onClick={() => toggleGroupCollapse(groupKey)}
                                            className="flex w-full items-center justify-between gap-3 mb-2 text-left"
                                        >
                                            <h2 className="text-[19px] sm:text-[21px] font-bold text-foreground tracking-tight">{group.textbookTitle}</h2>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-[13px] text-muted-foreground font-medium tabular-nums">{t("subject.topicsCount", { count: group.topics.length })}</span>
                                                <ChevronDown
                                                    size={18}
                                                    className={`text-muted-foreground transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                                                />
                                            </div>
                                        </button>
                                    ) : (
                                        <div className="flex items-center justify-between gap-3 mb-2">
                                            <h2 className="text-[19px] sm:text-[21px] font-bold text-foreground tracking-tight">{group.textbookTitle}</h2>
                                            <span className="text-[13px] text-muted-foreground font-medium tabular-nums">{t("subject.topicsCount", { count: group.topics.length })}</span>
                                        </div>
                                    )}
                                    {!isCollapsed && (
                                        group.topics.length > 0 ? (
                                            <ul className="flex flex-col divide-y divide-border/50">
                                                {group.topics.map(renderTopicRow)}
                                            </ul>
                                        ) : (
                                            <p className="text-sm text-muted-foreground py-6 italic font-medium">{t("subject.topicsComingSoon")}</p>
                                        )
                                    )}
                                </section>
                            );
                        })}
                    </div>
                );
            })()}


            {/* FAB */}
            {hasTopics && (
                <div className="fixed bottom-6 left-1/2 z-40 w-[min(92vw,22rem)] -translate-x-1/2 sm:left-auto sm:right-10 sm:translate-x-0 sm:w-auto">
                    <button
                        type="button"
                        onClick={startPractice}
                        disabled={selectedIds.size === 0}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-8 py-3.5 text-sm font-bold text-background shadow-lg transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                    >
                        {selectedIds.size === 0
                            ? t("subject.selectToPractice")
                            : t("subject.startPracticeN", { count: selectedIds.size })}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

function pluralQuestions(n: number, language: string) {
    if (language === "uz") return "ta savol";
    const m = n % 100; const m10 = n % 10;
    if (m >= 11 && m <= 14) return "вопросов";
    if (m10 === 1) return "вопрос";
    if (m10 >= 2 && m10 <= 4) return "вопроса";
    return "вопросов";
}
