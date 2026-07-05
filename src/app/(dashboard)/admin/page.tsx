"use client";

import { useEffect, useState } from "react";
import { fetchAdminStats, AdminStats } from "@/lib/admin-utils";
import { useAdminScope } from "@/store/useAdminScopeStore";
import { useAuthStore } from "@/store/useAuthStore";
import { isRegistanAdmin } from "@/lib/roles";
import {
    Users,
    GraduationCap,
    BookOpen,
    Library,
    ListTree,
    HelpCircle,
    ArrowRight,
    Landmark,
    Info,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function AdminDashboard() {
    const { t } = useTranslation();
    const { scope } = useAdminScope();
    const { user } = useAuthStore();
    // Registan-админу не показываем ярлыки управления глобальным контентом
    const showContentMgmt = !isRegistanAdmin(user);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        fetchAdminStats(scope).then((data) => {
            setStats(data);
            setIsLoading(false);
        });
    }, [scope]);

    // Счётчики контента (общие для платформы) помечаем, когда scope=Registan
    const statCards = [
        { label: t("admin.students"), value: stats?.students, icon: GraduationCap, color: "text-blue-600", content: false },
        { label: t("admin.teachers"), value: stats?.teachers, icon: Users, color: "text-purple-600", content: false },
        { label: t("nav.subjects"), value: stats?.subjects, icon: BookOpen, color: "text-green-600", content: true },
        { label: t("subject.textbooks"), value: stats?.textbooks, icon: Library, color: "text-orange-600", content: true },
        { label: t("stats.topics"), value: stats?.topics, icon: ListTree, color: "text-rose-600", content: true },
        { label: t("admin.questions"), value: stats?.questions, icon: HelpCircle, color: "text-amber-600", content: true },
    ];

    return (
        <div className="flex flex-col gap-12">
            <section>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("admin.overview")}</h1>
                <p className="mt-4 max-w-xl leading-relaxed text-muted-foreground">
                    {t("admin.overviewSubtitle")}
                </p>
                {scope === "registan" && (
                    <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-violet-300 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300">
                        <Landmark size={15} />
                        {t("adminScope.registanNote")}
                    </div>
                )}
            </section>

            <section className="flex flex-col gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
                                    <p className="mt-1 flex items-center gap-1.5 text-sm font-medium uppercase tracking-wider text-muted-foreground">
                                        {card.label}
                                        {scope === "registan" && card.content && (
                                            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-normal text-muted-foreground/70">
                                                {t("adminScope.all").toLowerCase()}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className={`rounded-xl bg-muted p-4 ${card.color} dark:opacity-90`}>
                                    <card.icon size={24} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
                {scope === "registan" && (
                    <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                        <Info size={13} className="mt-0.5 shrink-0" />
                        {t("adminScope.contentShared")}
                    </p>
                )}
            </section>

            {showContentMgmt && (
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
            )}
        </div>
    );
}
