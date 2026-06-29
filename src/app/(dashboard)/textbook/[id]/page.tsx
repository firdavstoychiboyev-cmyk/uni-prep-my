"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Topic, Textbook, Subject } from "@/lib/firestore-schema";
import { fetchTextbookById, fetchTopicsByTextbook, fetchSubjectById } from "@/lib/data-fetching";
import { BookOpen, PlayCircle, ChevronRight } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function TextbookPage() {
    const { id } = useParams();
    const { t } = useTranslation();

    const [textbook, setTextbook] = useState<Textbook | null>(null);
    const [subject, setSubject] = useState<Subject | null>(null);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [loadError, setLoadError] = useState(false);

    useEffect(() => {
        if (!id) return;

        const load = async () => {
            try {
                const [textbookData, topicsData] = await Promise.all([
                    fetchTextbookById(id as string),
                    fetchTopicsByTextbook(id as string)
                ]);

                setTextbook(textbookData);
                setTopics(topicsData);

                if (textbookData?.subjectId) {
                    const subjectData = await fetchSubjectById(textbookData.subjectId);
                    setSubject(subjectData);
                }
            } catch {
                setLoadError(true);
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [id]);

    if (loadError) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-muted-foreground text-lg font-medium">{t("tb.loadError")}</p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex flex-col gap-6 py-4 animate-pulse">
                <div className="h-4 w-40 bg-gray-200 rounded-full" />
                <div className="h-10 w-72 bg-gray-200 rounded-2xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                    {[1, 2, 3].map((n) => (
                        <div key={n} className="h-44 bg-gray-100 border border-gray-200 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!textbook) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-gray-400 text-lg font-medium">{t("tb.notFound")}</p>
            </div>
        );
    }

    const topicsCount = topics.length;
    const totalQuestions = topics.reduce(
        (sum, topic) => sum + (topic.totalQuestions || 0),
        0
    );

    return (
        <div className="flex flex-col gap-10 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Breadcrumbs */}
            <nav className="flex items-center justify-between gap-4 text-xs sm:text-sm font-medium">
                <div className="flex items-center gap-2 text-gray-400">
                    <Link href="/home" className="hover:text-gray-700 transition-colors">
                        {t("nav.home")}
                    </Link>
                    {subject && (
                        <>
                            <ChevronRight size={14} className="text-gray-300" />
                            <Link href={`/subject/${subject.id}`} className="hover:text-gray-700 transition-colors">
                                {subject.name}
                            </Link>
                        </>
                    )}
                    <ChevronRight size={14} className="text-gray-300" />
                    <span className="text-gray-900">{t("tb.textbook")}</span>
                </div>

                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.25em] text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-3 py-1">
                    {t("card.grade", { grade: String(textbook.grade) })}
                </span>
            </nav>

            {/* Header */}
            <section className="flex flex-col gap-3">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200 self-start">
                    <BookOpen className="w-4 h-4 text-gray-500" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-500">
                        {t("tb.textbook")}
                    </span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight max-w-3xl">
                    {textbook.title}
                </h1>

                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs sm:text-sm text-gray-500">
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {t("subject.topicsCount", { count: topicsCount })}
                    </span>
                    {topicsCount > 0 && (
                        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            {t("subject.questionsCount", { count: totalQuestions })}
                        </span>
                    )}
                </div>
            </section>

            {/* Topics Grid */}
            <section>
                {topicsCount > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {topics.map((topic, index) => (
                            <div
                                key={topic.id}
                                className="group relative p-5 rounded-2xl bg-gray-50 border border-gray-200 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-300"
                                style={{ animationDelay: `${index * 80}ms`, animationFillMode: "both" }}
                            >
                                <div className="flex flex-col h-full gap-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                            <h3 className="text-base font-semibold text-gray-900 tracking-tight leading-snug line-clamp-2">
                                                {topic.title}
                                            </h3>
                                        </div>

                                        <div className="ml-2 inline-flex flex-col items-end gap-2">
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                                                {t("tb.topicN", { n: index + 1 })}
                                            </span>
                                            {typeof topic.totalQuestions === "number" && (
                                                <span className="text-[11px] font-medium text-gray-500 bg-white border border-gray-200 rounded-full px-2 py-0.5">
                                                    {t("tb.questionsShort", { count: topic.totalQuestions })}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-auto flex items-center justify-between gap-3 pt-1">
                                        <Link
                                            href={`/test/${topic.id}`}
                                            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-gray-900 text-white text-xs sm:text-sm font-semibold hover:bg-gray-800 active:scale-[0.97] transition-all shadow-sm"
                                        >
                                            <PlayCircle className="w-4 h-4" />
                                            {t("tb.startTest")}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 px-6 text-center rounded-2xl border border-gray-200 bg-gray-50">
                        <p className="text-gray-400 font-medium">
                            {t("tb.noTopics")}
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}
