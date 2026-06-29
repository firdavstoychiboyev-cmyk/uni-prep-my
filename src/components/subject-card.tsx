"use client";

import Link from "next/link";
import { Subject } from "@/lib/firestore-schema";
import { ChevronRight } from "lucide-react";
import { getSubjectMeta, AccentKey } from "@/lib/subject-icons";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface SubjectCardProps {
    subject: Subject;
    stars?: number;
    medals?: { green: number; grey: number; bronze: number };
    progress?: number;
}

const CARD_GRADIENTS: Record<AccentKey, string> = {
    purple: "from-purple-600 to-purple-800",
    blue:   "from-blue-500 to-blue-700",
    sky:    "from-sky-500 to-blue-600",
    emerald:"from-emerald-500 to-teal-600",
    teal:   "from-teal-500 to-teal-700",
    indigo: "from-indigo-500 to-indigo-700",
    amber:  "from-amber-500 to-orange-600",
    rose:   "from-rose-500 to-pink-600",
    orange: "from-orange-500 to-red-500",
    neutral:"from-slate-600 to-slate-800",
};

export default function SubjectCard({
    subject,
    medals = { green: 0, grey: 0, bronze: 0 },
    progress = 0,
}: SubjectCardProps) {
    const { t, language } = useTranslation();
    const { icon: Icon, accent: accentKey } = getSubjectMeta(subject.name, subject.id);
    const gradient = CARD_GRADIENTS[accentKey];
    const totalMedals = medals.green + medals.grey + medals.bronze;

    return (
        <Link
            href={`/subject/${subject.id}`}
            className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20`}
        >
            {/* Subtle noise texture overlay */}
            <div className="absolute inset-0 bg-black/10 pointer-events-none" />

            <div className="relative p-5 flex flex-col min-h-[168px]">
                {/* Icon */}
                <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon size={20} className="text-white" />
                </div>

                {/* Subject name + status */}
                <div className="mt-3 flex-1">
                    <h3 className="font-bold text-[15px] text-white leading-snug">
                        {subject.name}
                    </h3>
                    <p className="text-[12px] text-white/65 mt-0.5">
                        {progress >= 100
                            ? t("card.completed")
                            : progress > 0
                            ? t("card.percentDone", { percent: progress })
                            : totalMedals > 0
                            ? `${totalMedals} ${language === "uz" ? "mavzu" : "тем"}`
                            : t("card.notStarted")}
                    </p>
                </div>

                {/* Bottom row: progress bar + open button */}
                <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-1 rounded-full bg-white/20 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-white/70 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <div className="inline-flex items-center gap-1 bg-white/20 group-hover:bg-white/30 px-3 py-1.5 rounded-full text-white text-[11px] font-bold transition-colors shrink-0">
                        {language === "uz" ? "Ochish" : "Открыть"}
                        <ChevronRight size={11} />
                    </div>
                </div>
            </div>
        </Link>
    );
}
