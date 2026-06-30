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

const ACCENT_STYLES: Record<AccentKey, { color: string; soft: string }> = {
    purple: { color: "#8B5CF6", soft: "#F1ECFD" },
    blue:   { color: "#1C82E0", soft: "#E7F2FE" },
    sky:    { color: "#0EA5E9", soft: "#E0F5FE" },
    emerald:{ color: "#16A34A", soft: "#E6F7EC" },
    teal:   { color: "#0D9488", soft: "#E0F5F2" },
    indigo: { color: "#4F46E5", soft: "#EEF0FE" },
    amber:  { color: "#D97706", soft: "#FEF1DF" },
    rose:   { color: "#E8568F", soft: "#FCEAF2" },
    orange: { color: "#E2562F", soft: "#FDEDE7" },
    neutral:{ color: "#56616E", soft: "#F4F6F8" },
};

export default function SubjectCard({
    subject,
    progress = 0,
}: SubjectCardProps) {
    const { t, language } = useTranslation();
    const { icon: Icon, accent: accentKey } = getSubjectMeta(subject.name, subject.id);
    const { color, soft } = ACCENT_STYLES[accentKey];

    const statusText = progress >= 100
        ? t("card.completed")
        : progress > 0
        ? `${progress}% ${language === "uz" ? "bajarildi" : "выполнено"}`
        : language === "uz" ? "Boshlanmagan" : "Не начато";

    return (
        <div
            className="flex flex-col rounded-[18px] p-[22px] transition-all duration-200 cursor-pointer"
            style={{ background: "#fff", border: "1px solid #EAEDF0" }}
            onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.borderColor = "#D7DCE2";
                el.style.boxShadow = "0 10px 26px rgba(14,20,25,.06)";
            }}
            onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.borderColor = "#EAEDF0";
                el.style.boxShadow = "none";
            }}
        >
            {/* Top row: icon + progress badge */}
            <div className="flex items-center justify-between mb-5">
                <div
                    className="w-[46px] h-[46px] rounded-[13px] flex items-center justify-center flex-shrink-0"
                    style={{ background: soft }}
                >
                    <Icon size={22} style={{ color }} />
                </div>
                {progress > 0 && (
                    <span
                        className="text-[12px] font-bold rounded-[8px] px-[11px] py-[5px]"
                        style={{ background: soft, color }}
                    >
                        {progress}%
                    </span>
                )}
            </div>

            {/* Name + status */}
            <div className="mb-[18px]">
                <div className="text-[19px] font-extrabold leading-snug" style={{ color: "#0E1419", letterSpacing: "-.01em" }}>
                    {subject.name}
                </div>
                <div className="text-[13.5px] mt-[3px]" style={{ color: "#98A1AC" }}>
                    {statusText}
                </div>
            </div>

            {/* Progress bar */}
            <div className="h-[7px] rounded-full overflow-hidden mb-4" style={{ background: "#EEF0F3" }}>
                <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ background: color, width: `${Math.max(0, Math.min(100, progress))}%` }}
                />
            </div>

            {/* Open button */}
            <Link
                href={`/subject/${subject.id}`}
                className="w-full flex items-center justify-center gap-2 rounded-[11px] py-[11px] text-[14.5px] font-bold text-white transition-all duration-150"
                style={{ background: "#0E1217" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#1B212A")}
                onMouseLeave={e => (e.currentTarget.style.background = "#0E1217")}
            >
                {language === "uz" ? "Ochish" : "Открыть"}
                <ChevronRight size={16} strokeWidth={2.4} />
            </Link>
        </div>
    );
}
