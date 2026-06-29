"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubjectsStore } from "@/store/useSubjectsStore";
import { useStatsStore } from "@/store/useStatsStore";
import SubjectCard from "@/components/subject-card";
import { fetchUserSubjectRatings, fetchSubjectProgress } from "@/lib/stats-utils";
import { fetchSubjects, fetchTextbooksBySubject, fetchTopicsByTextbook } from "@/lib/data-fetching";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function SubjectsPage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { subjects, loaded: subjectsLoaded, setSubjects } = useSubjectsStore();
    const {
        subjectProgress,
        loadedForUser,
        setSubjectProgress, setRatings, setLoadedForUser,
    } = useStatsStore();

    const isLoading = !subjectsLoaded;

    useEffect(() => {
        if (!subjectsLoaded) {
            fetchSubjects().then(setSubjects);
        }
    }, [subjectsLoaded, setSubjects]);

    useEffect(() => {
        if (!user || !subjectsLoaded) return;
        if (loadedForUser === user.id) return;

        const load = async () => {
            const ratings = await fetchUserSubjectRatings(user.id);
            setRatings(ratings);
            setLoadedForUser(user.id);

            await Promise.all(
                subjects.map(async (subject) => {
                    const textbooks = await fetchTextbooksBySubject(subject.id);
                    const allTopicIds = (
                        await Promise.all(textbooks.map((tb) => fetchTopicsByTextbook(tb.id)))
                    ).flat().map((tp) => tp.id);
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
    }, [user, subjectsLoaded, subjects, loadedForUser, setRatings, setLoadedForUser, setSubjectProgress]);

    return (
        <div className="flex flex-col gap-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("home.availableSubjects")}</h2>
                    <span className="self-start rounded-xl border border-border bg-muted px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground sm:self-auto sm:text-sm">
                        {t("home.subjectsCount", { count: subjects.length })}
                    </span>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div key={n} className="h-[168px] animate-pulse rounded-2xl bg-muted" />
                        ))}
                    </div>
                ) : (
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
                )}
            </section>

            <section className="rounded-3xl border border-border bg-muted/50 py-16 text-center dark:bg-muted/30">
                <div className="px-8">
                    <h2 className="mb-4 text-3xl font-bold text-foreground">{t("home.needHelp")}</h2>
                    <p className="mx-auto mb-8 max-w-md font-medium text-muted-foreground">
                        {t("home.supportText")}
                    </p>
                    <button
                        type="button"
                        className="rounded-2xl bg-foreground px-9 py-3.5 font-bold text-background shadow-sm transition-all hover:opacity-90 active:scale-95"
                    >
                        {t("home.contactSupport")}
                    </button>
                </div>
            </section>
        </div>
    );
}
