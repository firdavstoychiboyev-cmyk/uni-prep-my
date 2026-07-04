"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubjectsStore } from "@/store/useSubjectsStore";
import { useStatsStore } from "@/store/useStatsStore";
import SubjectGridCard from "@/components/subject-grid-card";
import { fetchUserSubjectRatings, fetchSubjectProgress } from "@/lib/stats-utils";
import { fetchSubjects, fetchTextbooksBySubject, fetchTopicsByTextbook } from "@/lib/data-fetching";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function SubjectsPage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { subjects, loaded: subjectsLoaded, setSubjects } = useSubjectsStore();
    const {
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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
                    <h2 className="text-[22px] font-extrabold text-foreground">{t("home.availableSubjects")}</h2>
                    <span className="self-start rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest sm:self-auto bg-muted text-muted-foreground border border-border">
                        {t("home.subjectsCount", { count: subjects.length })}
                    </span>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 min-[1180px]:grid-cols-2 gap-5">
                        {[1, 2, 3, 4].map((n) => (
                            <div key={n} className="animate-pulse rounded-3xl bg-muted" style={{ minHeight: 224 }} />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 min-[1180px]:grid-cols-2 gap-5">
                        {subjects.map((subject) => (
                            <SubjectGridCard key={subject.id} subject={subject} />
                        ))}
                    </div>
                )}
            </section>

            <section className="rounded-xl py-12 text-center bg-card border border-border">
                <div className="px-8">
                    <h2 className="mb-3 text-[22px] font-bold text-foreground">{t("home.needHelp")}</h2>
                    <p className="mx-auto mb-6 max-w-md text-[14px] text-muted-foreground">
                        {t("home.supportText")}
                    </p>
                    <button type="button"
                        className="rounded-lg px-7 py-2.5 font-bold text-[14px] bg-foreground text-background transition-all hover:opacity-90 active:scale-95">
                        {t("home.contactSupport")}
                    </button>
                </div>
            </section>
        </div>
    );
}
