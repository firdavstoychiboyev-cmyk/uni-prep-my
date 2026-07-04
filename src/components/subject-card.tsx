"use client";

import Link from "next/link";
import { Subject } from "@/lib/firestore-schema";
import { ChevronRight } from "lucide-react";
import { getSubjectTheme, rgba } from "@/lib/subject-theme";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface SubjectCardProps {
    subject: Subject;
    stars?: number;
    medals?: { green: number; grey: number; bronze: number };
    progress?: number;
}

export default function SubjectCard({ subject, progress = 0 }: SubjectCardProps) {
    const { language } = useTranslation();
    const { Icon, base, iconBg, iconText, buttonText } = getSubjectTheme(subject.name, subject.id);
    const pct = Math.max(0, Math.min(100, progress));

    return (
        <Link
            href={`/subject/${subject.id}`}
            className="group relative flex min-h-[172px] flex-col overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            style={{ borderColor: rgba(base, 0.22) }}
        >
            {/* Мягкий двухтональный градиент идентичности предмета — светлее в
                верхнем-левом углу, чуть глубже в нижнем-правом; поверх темы
                карточки, поэтому сам адаптируется под светлую/тёмную тему. */}
            <div
                className="pointer-events-none absolute inset-0"
                style={{ background: `linear-gradient(135deg, ${rgba(base, 0.10)} 0%, ${rgba(base, 0.05)} 45%, ${rgba(base, 0.20)} 100%)` }}
            />

            <div className="relative z-10 flex flex-1 flex-col">
                {/* Иконка + бейдж прогресса */}
                <div className="mb-auto flex items-start justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}>
                        <Icon className={iconText} width={22} height={22} />
                    </div>
                    {pct > 0 && (
                        <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                            style={{ background: rgba(base, 0.14), color: base }}
                        >
                            {pct}%
                        </span>
                    )}
                </div>

                {/* Название */}
                <h3 className="mb-3 mt-4 text-[17px] font-extrabold leading-tight text-foreground" style={{ letterSpacing: "-.01em" }}>
                    {subject.name}
                </h3>

                {/* Прогресс-бар */}
                {pct > 0 && (
                    <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full" style={{ background: rgba(base, 0.16) }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: base }} />
                    </div>
                )}

                {/* Кнопка «Ochish» — светлая/полупрозрачная пилюля, акцентный текст */}
                <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/85 px-4 py-2 text-[13px] font-bold shadow-sm ring-1 ring-black/5 backdrop-blur-sm transition-colors group-hover:bg-white dark:bg-white/10 dark:ring-white/10 dark:group-hover:bg-white/15">
                    <span className={buttonText}>{language === "uz" ? "Ochish" : "Открыть"}</span>
                    <ChevronRight size={14} strokeWidth={2.5} className={buttonText} />
                </span>
            </div>
        </Link>
    );
}
