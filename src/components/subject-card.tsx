"use client";

import Link from "next/link";
import { Subject } from "@/lib/firestore-schema";
import { Star, ChevronRight } from "lucide-react";
import { getSubjectMeta, AccentKey } from "@/lib/subject-icons";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface SubjectCardProps {
    subject: Subject;
    stars?: number;
    medals?: { green: number; grey: number; bronze: number };
    progress?: number;
}

const ACCENTS: Record<AccentKey, { iconBg: string; iconColor: string; bar: string; badge: string }> = {
    purple: {
        iconBg: "bg-purple-100 dark:bg-purple-950/50",
        iconColor: "text-purple-600 dark:text-purple-300",
        bar: "bg-purple-500",
        badge: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
    },
    blue: {
        iconBg: "bg-blue-100 dark:bg-blue-950/50",
        iconColor: "text-blue-600 dark:text-blue-300",
        bar: "bg-blue-500",
        badge: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    },
    sky: {
        iconBg: "bg-sky-100 dark:bg-sky-950/50",
        iconColor: "text-sky-600 dark:text-sky-300",
        bar: "bg-sky-500",
        badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    },
    emerald: {
        iconBg: "bg-emerald-100 dark:bg-emerald-950/50",
        iconColor: "text-emerald-600 dark:text-emerald-300",
        bar: "bg-emerald-500",
        badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    },
    teal: {
        iconBg: "bg-teal-100 dark:bg-teal-950/50",
        iconColor: "text-teal-600 dark:text-teal-300",
        bar: "bg-teal-500",
        badge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
    },
    indigo: {
        iconBg: "bg-indigo-100 dark:bg-indigo-950/50",
        iconColor: "text-indigo-600 dark:text-indigo-300",
        bar: "bg-indigo-500",
        badge: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
    },
    amber: {
        iconBg: "bg-amber-100 dark:bg-amber-950/50",
        iconColor: "text-amber-600 dark:text-amber-300",
        bar: "bg-amber-500",
        badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    },
    rose: {
        iconBg: "bg-rose-100 dark:bg-rose-950/50",
        iconColor: "text-rose-600 dark:text-rose-300",
        bar: "bg-rose-500",
        badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    },
    orange: {
        iconBg: "bg-orange-100 dark:bg-orange-950/50",
        iconColor: "text-orange-600 dark:text-orange-300",
        bar: "bg-orange-500",
        badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
    },
    neutral: {
        iconBg: "bg-muted",
        iconColor: "text-muted-foreground",
        bar: "bg-foreground",
        badge: "bg-muted text-muted-foreground border-border",
    },
};

export default function SubjectCard({
    subject,
    stars = 0,
    medals = { green: 0, grey: 0, bronze: 0 },
    progress = 0,
}: SubjectCardProps) {
    const { t } = useTranslation();
    const totalMedals = medals.green + medals.grey + medals.bronze;
    const { icon: Icon, accent: accentKey } = getSubjectMeta(subject.name, subject.id);
    const accent = ACCENTS[accentKey];
    const hasActivity = progress > 0 || stars > 0 || totalMedals > 0;

    return (
        <Link
            href={`/subject/${subject.id}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:border-border/80 hover:shadow-sm hover:-translate-y-0.5"
        >
            {/* Main row */}
            <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.iconBg}`}>
                    <Icon size={19} className={accent.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[13.5px] text-foreground leading-snug truncate">{subject.name}</h3>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                        {progress >= 100 ? t("card.completed") : progress > 0 ? t("card.percentDone", { percent: progress }) : t("card.notStarted")}
                    </p>
                </div>
                <ChevronRight size={15} className="text-muted-foreground/30 flex-shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground/60" />
            </div>

            {/* Progress bar */}
            <div className="px-4 pb-3">
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${accent.bar}`} style={{ width: `${progress}%` }} />
                </div>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 px-4 pb-4 min-h-[1.75rem]">
                {hasActivity ? (
                    <>
                        {medals.green > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                                {medals.green}
                            </span>
                        )}
                        {medals.bronze > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-orange-500 dark:text-orange-400">
                                <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                                {medals.bronze}
                            </span>
                        )}
                        {medals.grey > 0 && (
                            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground">
                                <span className="w-2 h-2 rounded-full bg-muted-foreground/35 flex-shrink-0" />
                                {medals.grey}
                            </span>
                        )}
                        {stars > 0 && (
                            <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-amber-500 ml-auto">
                                <Star size={11} className="fill-amber-400 text-amber-400" />
                                {stars}
                            </span>
                        )}
                    </>
                ) : (
                    <span className="text-[11px] text-muted-foreground/40 font-medium">{t("card.startLearning")}</span>
                )}
            </div>
        </Link>
    );
}
