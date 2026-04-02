"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Subject } from "@/lib/firestore-schema";
import SubjectCard from "@/components/subject-card";
import ChartsMetrics from "@/components/charts-metrics";
import { fetchUserGlobalStats, GlobalStats, fetchUserSubjectRatings, fetchSubjectProgress } from "@/lib/stats-utils";
import { fetchSubjects, fetchTextbooksBySubject, fetchTopicsByTextbook } from "@/lib/data-fetching";

interface SubjectProgress {
    stars: number;
    medals: { green: number; grey: number; bronze: number };
    progress: number;
}

export default function HomePage() {
    const { user } = useAuthStore();
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [subjectProgress, setSubjectProgress] = useState<Record<string, SubjectProgress>>({});
    const [topicsBySubjectId, setTopicsBySubjectId] = useState<Record<string, string[]>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            const subjectsData = await fetchSubjects();
            setSubjects(subjectsData);
            setIsLoading(false);

            if (!user) return;

            const [globalStats, ratings] = await Promise.all([
                fetchUserGlobalStats(user.id),
                fetchUserSubjectRatings(user.id)
            ]);
            setStats(globalStats);

            const topicTitlesMap: Record<string, string[]> = {};

            const progressEntries = await Promise.all(
                subjectsData.map(async (subject) => {
                    const textbooks = await fetchTextbooksBySubject(subject.id);

                    const allTopicIds: string[] = [];
                    const topicTitles: string[] = [];
                    for (const textbook of textbooks) {
                        const topics = await fetchTopicsByTextbook(textbook.id);
                        allTopicIds.push(...topics.map((t) => t.id));
                        topicTitles.push(...topics.sort((a, b) => a.order - b.order).map((t) => t.title));
                    }

                    const n = subject.name.toLowerCase();
                    const isEnglish =
                        subject.id === "english" || n.includes("англ") || n.includes("иностран");
                    const isMath = subject.id === "math" || n.includes("матем");
                    if (isEnglish || isMath) {
                        topicTitlesMap[subject.id] = topicTitles;
                    }

                    const progress = await fetchSubjectProgress(user.id, subject.id, allTopicIds);

                    const subjectProgress: SubjectProgress = {
                        stars: ratings[subject.id] || 0,
                        medals: progress.medals,
                        progress: progress.progress
                    };

                    return [subject.id, subjectProgress] as const;
                })
            );

            setSubjectProgress(Object.fromEntries(progressEntries));
            setTopicsBySubjectId(topicTitlesMap);
        };

        loadData();
    }, [user]);

    return (
        <div className="flex flex-col gap-12 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <ChartsMetrics
                stats={stats}
                subjects={subjects}
                subjectProgress={subjectProgress}
                topicsBySubjectId={topicsBySubjectId}
            />

            {/* Subjects Grid */}
            <section>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">Доступные предметы</h2>
                    <span className="self-start rounded-xl border border-border bg-muted px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground sm:self-auto sm:text-sm">
                        {subjects.length} предметов
                    </span>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div key={n} className="h-[116px] animate-pulse rounded-2xl border border-border bg-muted" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subjects.map((subject) => {
                            const progress = subjectProgress[subject.id] || {
                                stars: 0,
                                medals: { green: 0, grey: 0, bronze: 0 },
                                progress: 0
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
                )}
            </section>

            {/* Footer Support */}
            <section className="rounded-3xl border border-border bg-muted/50 py-16 text-center dark:bg-muted/30">
                <div className="px-8">
                    <h2 className="mb-4 text-3xl font-bold text-foreground">Нужна помощь?</h2>
                    <p className="mx-auto mb-8 max-w-md font-medium text-muted-foreground">
                        Наша команда всегда на связи, чтобы помочь вам с любыми вопросами по обучению.
                    </p>
                    <button
                        type="button"
                        className="rounded-2xl bg-foreground px-9 py-3.5 font-bold text-background shadow-sm transition-all hover:opacity-90 active:scale-95"
                    >
                        Написать в поддержку
                    </button>
                </div>
            </section>
        </div>
    );
}
