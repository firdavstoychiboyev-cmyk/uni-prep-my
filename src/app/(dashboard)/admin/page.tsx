"use client";

import { useEffect, useState } from "react";
import { fetchAdminStats } from "@/lib/admin-utils";
import {
    Users,
    GraduationCap,
    BookOpen,
    Library,
    ListTree,
    HelpCircle,
    ArrowRight
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function AdminDashboard() {
    const { t } = useTranslation();
    const [stats, setStats] = useState<{ subjects: number; textbooks: number; topics: number; questions: number; students: number; teachers: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchAdminStats().then((data) => {
            setStats(data);
            setIsLoading(false);
        });
    }, []);

    const statCards = [
        { label: t("admin.students"), value: stats?.students, icon: GraduationCap, color: "text-blue-600" },
        { label: t("admin.teachers"), value: stats?.teachers, icon: Users, color: "text-purple-600" },
        { label: t("nav.subjects"), value: stats?.subjects, icon: BookOpen, color: "text-green-600" },
        { label: t("subject.textbooks"), value: stats?.textbooks, icon: Library, color: "text-orange-600" },
        { label: t("stats.topics"), value: stats?.topics, icon: ListTree, color: "text-rose-600" },
        { label: t("admin.questions"), value: stats?.questions, icon: HelpCircle, color: "text-amber-600" },
    ];

    return (
        <div className="flex flex-col gap-12">
            <section>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("admin.overview")}</h1>
                <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                    {t("admin.overviewSubtitle")}
                </p>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    [1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card shadow-sm" />
                    ))
                ) : (
                    statCards.map((card, idx) => (
                        <div
                            key={idx}
                            className="flex items-center justify-between rounded-xl border border-border bg-card p-8 shadow-sm"
                        >
                            <div>
                                <p className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                                    {card.value || 0}
                                </p>
                                <p className="mt-1 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                    {card.label}
                                </p>
                            </div>
                            <div className={`rounded-xl bg-muted p-4 ${card.color} dark:opacity-90`}>
                                <card.icon size={24} />
                            </div>
                        </div>
                    ))
                )}
            </section>

            <section className="rounded-2xl border border-border bg-card p-8">
                <h2 className="mb-4 text-xl font-semibold tracking-tight text-foreground">{t("admin.contentMgmt")}</h2>
                <p className="max-w-2xl text-sm italic leading-relaxed text-muted-foreground">
                    {t("admin.hierarchyTip")}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                    <a
                        href="/admin/subjects"
                        className="group flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-muted"
                    >
                        <div className="flex items-center gap-3">
                            <BookOpen size={18} className="text-muted-foreground group-hover:text-foreground" />
                            <span className="font-medium text-foreground">{t("admin.manageSubjects")}</span>
                        </div>
                        <ArrowRight
                            size={16}
                            className="text-muted-foreground/60 group-hover:text-foreground"
                        />
                    </a>
                    <a
                        href="/admin/textbooks"
                        className="group flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-muted"
                    >
                        <div className="flex items-center gap-3">
                            <Library size={18} className="text-muted-foreground group-hover:text-foreground" />
                            <span className="font-medium text-foreground">{t("admin.manageTextbooks")}</span>
                        </div>
                        <ArrowRight
                            size={16}
                            className="text-muted-foreground/60 group-hover:text-foreground"
                        />
                    </a>
                    <a
                        href="/admin/topics"
                        className="group flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-muted"
                    >
                        <div className="flex items-center gap-3">
                            <ListTree size={18} className="text-muted-foreground group-hover:text-foreground" />
                            <span className="font-medium text-foreground">{t("admin.manageTopics")}</span>
                        </div>
                        <ArrowRight
                            size={16}
                            className="text-muted-foreground/60 group-hover:text-foreground"
                        />
                    </a>
                    <a
                        href="/admin/questions"
                        className="group flex items-center justify-between rounded-xl border border-border p-4 transition-colors hover:bg-muted"
                    >
                        <div className="flex items-center gap-3">
                            <HelpCircle size={18} className="text-muted-foreground group-hover:text-foreground" />
                            <span className="font-medium text-foreground">{t("admin.manageQuestions")}</span>
                        </div>
                        <ArrowRight
                            size={16}
                            className="text-muted-foreground/60 group-hover:text-foreground"
                        />
                    </a>
                </div>
            </section>
        </div>
    );
}
