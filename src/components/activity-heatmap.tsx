"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Tip = { x: number; y: number; text: string; below: boolean };

const MONTHS = {
    ru: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    uz: ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"],
};
// Даты в подсказке: ru — родительный падеж, uz — как в примере «16-mart».
const MONTHS_GEN = {
    ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
    uz: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
};
const DOW = {
    ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    uz: ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"],
};

const cellColor = (count: number) => {
    if (!count) return "bg-muted";
    if (count <= 5) return "bg-[hsl(var(--brand-blue))]/35";
    if (count <= 15) return "bg-[hsl(var(--brand-blue))]/60";
    if (count <= 30) return "bg-[hsl(var(--brand-blue))]/85";
    return "bg-[hsl(var(--brand-blue))]";
};

export default function ActivityHeatmap({
    dailyActivity,
    totalSolved,
}: {
    dailyActivity: Record<string, number>;
    totalSolved: number;
}) {
    const { t, language } = useTranslation();
    const lang: "ru" | "uz" = language === "uz" ? "uz" : "ru";
    const [tip, setTip] = useState<Tip | null>(null);

    // Тап вне ячейки (мобильные) — закрыть подсказку.
    useEffect(() => {
        if (!tip) return;
        const dismiss = () => setTip(null);
        document.addEventListener("click", dismiss);
        document.addEventListener("scroll", dismiss, true);
        return () => {
            document.removeEventListener("click", dismiss);
            document.removeEventListener("scroll", dismiss, true);
        };
    }, [tip]);

    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - 5 + i);
        return { year: d.getFullYear(), month: d.getMonth() };
    });

    const tipText = (day: number, month: number, year: number, count: number) => {
        const date = lang === "uz"
            ? `${day}-${MONTHS_GEN.uz[month]}, ${year}`
            : `${day} ${MONTHS_GEN.ru[month]} ${year}`;
        return count > 0
            ? `${date}: ${t("stats.solvedN", { count })}`
            : `${date} · ${t("stats.noneSolved")}`;
    };

    const showTip = (e: React.MouseEvent, text: string) => {
        const vw = typeof window !== "undefined" ? window.innerWidth : 360;
        const x = Math.min(Math.max(e.clientX, 78), vw - 78);
        const below = e.clientY < 64;
        setTip({ x, y: below ? e.clientY + 18 : e.clientY - 12, text, below });
    };

    return (
        <div className="rounded-xl p-5 sm:p-6 bg-card border border-border">
            <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-3">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <div>
                        <div className="font-bold text-foreground text-[15px]">{t("stats.activity")}</div>
                        <div className="text-[12px] text-muted-foreground">
                            {t("stats.totalSolvedLabel")} <span className="font-semibold text-foreground">{totalSolved}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {months.map(({ year, month }) => {
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
                    return (
                        <div key={`${year}-${month}`}>
                            <div className="text-xs font-semibold text-foreground mb-2">
                                {MONTHS[lang][month]} {year}
                            </div>
                            <div className="grid grid-cols-7 gap-[3px] mb-1">
                                {DOW[lang].map((d) => (
                                    <div key={d} className="text-[9px] text-muted-foreground text-center">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-[3px]">
                                {Array.from({ length: firstDow }).map((_, i) => (
                                    <div key={`empty-${i}`} />
                                ))}
                                {Array.from({ length: daysInMonth }, (_, d) => {
                                    const day = d + 1;
                                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                                    const count = dailyActivity[dateStr] ?? 0;
                                    const text = tipText(day, month, year, count);
                                    const dayTextColor = count === 0
                                        ? "text-muted-foreground/70"
                                        : count > 15 ? "text-white" : "text-foreground";
                                    return (
                                        <div
                                            key={dateStr}
                                            onMouseEnter={(e) => showTip(e, text)}
                                            onMouseMove={(e) => showTip(e, text)}
                                            onMouseLeave={() => setTip(null)}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setTip((prev) => (prev && prev.text === text ? null : ((): Tip => {
                                                    const vw = window.innerWidth;
                                                    const x = Math.min(Math.max(e.clientX, 78), vw - 78);
                                                    const below = e.clientY < 64;
                                                    return { x, y: below ? e.clientY + 18 : e.clientY - 12, text, below };
                                                })()));
                                            }}
                                            className={`w-full aspect-square rounded-sm flex items-center justify-center cursor-default ${cellColor(count)}`}
                                        >
                                            <span className={`text-[9px] leading-none font-medium tabular-nums ${dayTextColor}`}>
                                                {day}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{t("stats.less")}</span>
                <span className="w-3 h-3 rounded-sm bg-muted border border-border" />
                <span className="w-3 h-3 rounded-sm bg-[hsl(var(--brand-blue))]/35" />
                <span className="w-3 h-3 rounded-sm bg-[hsl(var(--brand-blue))]/60" />
                <span className="w-3 h-3 rounded-sm bg-[hsl(var(--brand-blue))]/85" />
                <span className="w-3 h-3 rounded-sm bg-[hsl(var(--brand-blue))]" />
                <span>{t("stats.more")}</span>
            </div>

            {tip && (
                <div
                    style={{ position: "fixed", left: tip.x, top: tip.y, transform: `translate(-50%, ${tip.below ? "0" : "-100%"})` }}
                    className="pointer-events-none z-[60] rounded-lg bg-foreground px-2.5 py-1.5 text-[11px] font-semibold text-background shadow-lg whitespace-nowrap"
                >
                    {tip.text}
                </div>
            )}
        </div>
    );
}
