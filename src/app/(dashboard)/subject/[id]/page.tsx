"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Subject, Topic } from "@/lib/firestore-schema";
import { fetchTextbooksBySubject, fetchSubjectById, fetchTopicsByTextbook } from "@/lib/data-fetching";
import {
    ChevronRight,
    Filter,
    ChevronDown,
    Check,
} from "lucide-react";

type TopicGroup = {
    textbookId: string;
    textbookTitle: string;
    topics: Topic[];
};

function Toggle({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (v: boolean) => void;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-blue))] focus-visible:ring-offset-2 ${
                checked
                    ? "border-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue))]"
                    : "border-border bg-muted"
            }`}
        >
            <span
                className={`pointer-events-none block h-6 w-6 translate-x-1 rounded-full bg-card shadow-sm ring-1 ring-border transition-transform duration-300 ${
                    checked ? "translate-x-7" : "translate-x-1"
                }`}
            />
            <span className="sr-only">{label}</span>
        </button>
    );
}

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
                checked
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:border-muted-foreground/40"
            } ${disabled ? "opacity-50 pointer-events-none" : ""}`}
        >
            {checked ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
        </button>
    );
}

export default function SubjectPage() {
    const { id } = useParams();
    const router = useRouter();
    const [groups, setGroups] = useState<TopicGroup[]>([]);
    const [subject, setSubject] = useState<Subject | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [multiSelect, setMultiSelect] = useState(true);
    const [randomize, setRandomize] = useState(false);
    const [showAttempts, setShowAttempts] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            const [subData, textData] = await Promise.all([
                fetchSubjectById(id as string),
                fetchTextbooksBySubject(id as string),
            ]);
            setSubject(subData);

            const topicGroups: TopicGroup[] = [];
            for (const tb of textData) {
                const topics = await fetchTopicsByTextbook(tb.id);
                topicGroups.push({
                    textbookId: tb.id,
                    textbookTitle: tb.title,
                    topics,
                });
            }
            setGroups(topicGroups);
            setIsLoading(false);
        };

        load();
    }, [id]);

    const flatTopics = useMemo(() => {
        const list: { topic: Topic; textbookId: string }[] = [];
        for (const g of groups) {
            for (const t of g.topics) {
                list.push({ topic: t, textbookId: g.textbookId });
            }
        }
        return list;
    }, [groups]);

    const displayGroups = useMemo(() => {
        if (!randomize) return groups;
        return groups.map((g) => ({
            ...g,
            topics: [...g.topics].sort(() => Math.random() - 0.5),
        }));
    }, [groups, randomize]);

    const totalQuestions = useMemo(
        () => flatTopics.reduce((s, { topic }) => s + (topic.totalQuestions || 0), 0),
        [flatTopics]
    );

    const gradientClass = useMemo(() => {
        const sid = (id as string)?.toLowerCase() ?? "";
        if (sid === "english" || sid.includes("англ") || subject?.name.toLowerCase().includes("англ"))
            return "from-[#a855f7] via-[#c026d3] to-[#e879f9]";
        if (sid === "math" || sid.includes("матем") || subject?.name.toLowerCase().includes("матем"))
            return "from-[hsl(var(--brand-blue))] via-sky-400 to-cyan-400";
        return "from-slate-600 via-slate-500 to-slate-400";
    }, [id, subject]);

    const toggleTopic = useCallback(
        (topicId: string) => {
            setSelectedIds((prev) => {
                const next = new Set(multiSelect ? prev : []);
                if (next.has(topicId)) {
                    next.delete(topicId);
                } else {
                    if (!multiSelect) next.clear();
                    next.add(topicId);
                }
                return next;
            });
        },
        [multiSelect]
    );

    const selectAll = useCallback(() => {
        if (selectedIds.size === flatTopics.length) {
            setSelectedIds(new Set());
            return;
        }
        setSelectedIds(new Set(flatTopics.map(({ topic }) => topic.id)));
    }, [flatTopics, selectedIds.size]);

    const startPractice = () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        router.push(`/test/${ids[0]}`);
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
                <p className="text-muted-foreground text-lg font-medium">Предмет не найден</p>
            </div>
        );
    }

    const hasTopics = flatTopics.length > 0;

    return (
        <div className="flex flex-col gap-6 pb-28 pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                <Link href="/" className="hover:text-foreground transition-colors duration-200">
                    Главная
                </Link>
                <ChevronRight size={14} className="text-border" />
                <span className="text-foreground">{subject.name}</span>
            </nav>

            {/* Title */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Банк вопросов</h1>
                <p className="text-sm text-muted-foreground mt-1">{subject.name}</p>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                <button
                    type="button"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors duration-200 shadow-sm"
                >
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    Фильтры
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>

                <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <label className="flex items-center gap-3 text-sm font-medium text-foreground cursor-pointer select-none">
                        <Toggle checked={multiSelect} onChange={setMultiSelect} label="Несколько тем" />
                        <span>Несколько тем</span>
                    </label>
                    <label className="flex items-center gap-3 text-sm font-medium text-foreground cursor-pointer select-none">
                        <Toggle checked={randomize} onChange={setRandomize} label="Случайный порядок" />
                        <span>Случайный порядок</span>
                    </label>
                    <label className="flex items-center gap-3 text-sm font-medium text-foreground cursor-pointer select-none">
                        <Toggle checked={showAttempts} onChange={setShowAttempts} label="Прошлые попытки" />
                        <span>Прошлые попытки</span>
                    </label>
                </div>
            </div>

            {/* Gradient header card */}
            <div
                className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${gradientClass} p-6 sm:p-8 text-white shadow-lg transition-all duration-300`}
            >
                <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                <div className="relative flex items-start gap-4">
                    <TopicCheckbox
                        checked={hasTopics && selectedIds.size === flatTopics.length}
                        onChange={selectAll}
                        disabled={!hasTopics}
                    />
                    <div className="min-w-0 flex-1">
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight drop-shadow-sm">{subject.name}</h2>
                        <p className="mt-1 text-sm text-white/90 font-medium">
                            {totalQuestions} {pluralQuestions(totalQuestions)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Topic tree */}
            {!hasTopics ? (
                <div className="py-16 text-center rounded-3xl border border-border bg-muted/30">
                    <p className="text-muted-foreground font-medium">Учебники и темы для этого предмета пока не добавлены.</p>
                </div>
            ) : (
                <div className="rounded-3xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border transition-shadow duration-300 hover:shadow-md">
                    {displayGroups.map((group) => (
                        <div key={group.textbookId} className="p-5 sm:p-6">
                            <h3 className="text-base font-bold text-foreground mb-4 tracking-tight">{group.textbookTitle}</h3>
                            <ul className="space-y-0">
                                {group.topics.map((topic) => {
                                    const q = topic.totalQuestions || 0;
                                    const selected = selectedIds.has(topic.id);
                                    return (
                                        <li key={topic.id}>
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        if (multiSelect) toggleTopic(topic.id);
                                                        else router.push(`/test/${topic.id}`);
                                                    }
                                                }}
                                                onClick={() => {
                                                    if (multiSelect) toggleTopic(topic.id);
                                                    else router.push(`/test/${topic.id}`);
                                                }}
                                                className={`flex cursor-pointer items-center gap-3 py-3 px-2 -mx-2 rounded-xl transition-colors duration-200 ${
                                                    selected ? "bg-[hsl(var(--brand-blue-soft))]/50" : "hover:bg-muted/60"
                                                }`}
                                            >
                                                <TopicCheckbox
                                                    checked={selected}
                                                    onChange={() => toggleTopic(topic.id)}
                                                    stopPropagation
                                                />
                                                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                                                    <span className="text-sm font-medium text-foreground truncate">
                                                        {topic.title}
                                                    </span>
                                                    <span className="text-xs sm:text-sm text-muted-foreground tabular-nums shrink-0">
                                                        {q} {pluralQuestionsShort(q)}
                                                    </span>
                                                </div>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            {/* FAB */}
            {hasTopics && (
                <div className="fixed bottom-6 left-1/2 z-40 w-[min(92vw,22rem)] -translate-x-1/2 sm:left-auto sm:right-10 sm:translate-x-0 sm:w-auto">
                    <button
                        type="button"
                        onClick={startPractice}
                        disabled={selectedIds.size === 0}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-8 py-3.5 text-sm font-bold text-background shadow-lg transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                    >
                        Начать практику ({selectedIds.size})
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}

function pluralQuestions(n: number) {
    const m = n % 100;
    const m10 = n % 10;
    if (m >= 11 && m <= 14) return "вопросов";
    if (m10 === 1) return "вопрос";
    if (m10 >= 2 && m10 <= 4) return "вопроса";
    return "вопросов";
}

function pluralQuestionsShort(n: number) {
    const m = n % 100;
    const m10 = n % 10;
    if (m >= 11 && m <= 14) return "вопросов";
    if (m10 === 1) return "вопрос";
    if (m10 >= 2 && m10 <= 4) return "вопроса";
    return "вопросов";
}
