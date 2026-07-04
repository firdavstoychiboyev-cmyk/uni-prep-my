"use client";

import Link from "next/link";
import { Subject } from "@/lib/firestore-schema";
import { ChevronRight } from "lucide-react";
import { getSubjectTheme } from "@/lib/subject-theme";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface SubjectCardProps {
    subject: Subject;
    stars?: number;
    medals?: { green: number; grey: number; bronze: number };
    progress?: number;
}

export default function SubjectCard({ subject, progress = 0 }: SubjectCardProps) {
    const { language } = useTranslation();
    const { Icon, gradFrom, gradTo, ink } = getSubjectTheme(subject.name, subject.id);
    const pct = Math.max(0, Math.min(100, progress));

    return (
        <Link
            href={`/subject/${subject.id}`}
            className="group relative flex min-h-[172px] flex-col overflow-hidden rounded-2xl p-5 shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
            style={{ background: `linear-gradient(135deg, ${gradFrom} 0%, ${gradTo} 100%)` }}
        >
            {/* Глянцевый блик сверху-слева для объёма */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{ background: "radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,0.22), transparent 55%)" }}
            />

            <div className="relative z-10 flex flex-1 flex-col">
                {/* Иконка + бейдж прогресса */}
                <div className="mb-auto flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white ring-1 ring-white/25 backdrop-blur-sm">
                        <Icon width={28} height={28} strokeWidth={2} />
                    </div>
                    {pct > 0 && (
                        <span className="rounded-full bg-white/25 px-2.5 py-1 text-[11px] font-bold text-white">
                            {pct}%
                        </span>
                    )}
                </div>

                {/* Название */}
                <h3 className="mb-3 mt-4 text-[17px] font-extrabold leading-tight text-white drop-shadow-sm" style={{ letterSpacing: "-.01em" }}>
                    {subject.name}
                </h3>

                {/* Прогресс-бар */}
                {pct > 0 && (
                    <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
                        <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                )}

                {/* Кнопка «Ochish» — сплошная белая пилюля, акцентный текст, тень */}
                <span
                    className="inline-flex items-center gap-1.5 self-start rounded-full bg-white px-4 py-2 text-[13px] font-bold shadow-md transition-transform duration-150 group-hover:scale-[1.03]"
                    style={{ color: ink }}
                >
                    {language === "uz" ? "Ochish" : "Открыть"}
                    <ChevronRight size={14} strokeWidth={2.75} />
                </span>
            </div>
        </Link>
    );
}
