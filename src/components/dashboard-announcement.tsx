"use client";

import { Sparkles } from "lucide-react";

export default function DashboardAnnouncement() {
    return (
        <div className="shrink-0 border-b border-[hsl(var(--brand-blue))]/18 bg-[hsl(var(--brand-blue-soft))] px-6 py-3 transition-colors duration-200 sm:px-8 dark:border-blue-400/20 dark:bg-blue-950/40">
            <p className="flex items-start gap-2.5 text-sm leading-relaxed text-[hsl(var(--brand-blue-ink))] dark:text-blue-100/90">
                <Sparkles
                    className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--brand-blue))] dark:text-blue-300"
                    aria-hidden
                />
                <span>
                    <span className="font-semibold">Kulcha</span> — графики прогресса на главной, тренировка по
                    темам в карточке каждого предмета.
                </span>
            </p>
        </div>
    );
}
