"use client";

import Link from "next/link";
import { Subject } from "@/lib/firestore-schema";
import { getSubjectTheme } from "@/lib/subject-theme";
import { ILLUSTRATIONS } from "@/components/subject-illustrations";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * Большая карточка предмета для /subjects — точная реализация макета Claude
 * Design: насыщенный градиент, декоративная дымка, крупная иллюстрация
 * снизу-справа, текст ограничен 56% ширины, белая кнопка «Ochish».
 * Тёмная тема — базовый вид (карточка сама несёт цвет), отдельного варианта
 * не нужно, как и в остальном приложении.
 */
/**
 * Большая карточка предмета. По умолчанию — ссылка на /subject/{id}
 * (страница Fanlar). Можно переиспользовать как селектор: передать onSelect
 * (тогда рендерится кнопкой), свой subtitle и текст кнопки (cta).
 */
export default function SubjectGridCard({
    subject, onSelect, subtitle, cta,
}: {
    subject: Subject;
    onSelect?: () => void;
    subtitle?: string;
    cta?: string;
}) {
    const { t, language } = useTranslation();
    const { gradFrom, gradTo, illustration } = getSubjectTheme(subject.name, subject.id);
    const Illustration = ILLUSTRATIONS[illustration];
    const qCount = subject.questionCount ?? 0;

    const cardClass = "group relative block w-full text-left overflow-hidden transition-transform duration-200 hover:-translate-y-0.5";
    const cardStyle: React.CSSProperties = {
        borderRadius: 24,
        padding: 34,
        minHeight: 224,
        background: `linear-gradient(135deg, ${gradFrom} 0%, ${gradTo} 100%)`,
        boxShadow: `0 22px 44px -18px rgba(0,0,0,.7), 0 10px 24px -14px ${gradFrom}`,
    };

    const inner = (
        <>
            {/* 1. Дымка/сияние — чистая декорация */}
            <div
                aria-hidden
                className="pointer-events-none absolute"
                style={{
                    right: -30, bottom: -40, width: 340, height: 340,
                    background: "radial-gradient(circle at 60% 45%, rgba(255,255,255,.42), rgba(255,255,255,.12) 42%, rgba(255,255,255,0) 68%)",
                }}
            />

            {/* 2. Иллюстрация предмета */}
            <div
                aria-hidden
                className="pointer-events-none absolute"
                style={{
                    right: -14, bottom: -24, width: 262, height: 262,
                    filter: "drop-shadow(0 16px 22px rgba(0,0,0,.22))",
                }}
            >
                <Illustration width="100%" height="100%" />
            </div>

            {/* 3. Текст + кнопка (не заезжают на иллюстрацию) */}
            <div className="relative z-10" style={{ maxWidth: "56%" }}>
                <h3 className="text-white" style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-.02em" }}>
                    {subject.name}
                </h3>
                {(subtitle ?? (qCount > 0 ? t("subjects.qCount", { count: qCount }) : "")) && (
                    <p className="mt-2 font-semibold text-white/85" style={{ fontSize: 15 }}>
                        {subtitle ?? t("subjects.qCount", { count: qCount })}
                    </p>
                )}
                <span
                    className="mt-5 inline-flex items-center gap-1.5 bg-white font-bold transition-transform duration-150 group-hover:scale-[1.03]"
                    style={{
                        color: "#18181b",
                        borderRadius: 999,
                        padding: "12px 20px",
                        fontWeight: 700,
                        boxShadow: "0 6px 16px -6px rgba(0,0,0,.4)",
                    }}
                >
                    {cta ?? (language === "uz" ? "Ochish" : "Открыть")}
                    <span aria-hidden>→</span>
                </span>
            </div>
        </>
    );

    return onSelect ? (
        <button type="button" onClick={onSelect} className={cardClass} style={cardStyle}>{inner}</button>
    ) : (
        <Link href={`/subject/${subject.id}`} className={cardClass} style={cardStyle}>{inner}</Link>
    );
}
