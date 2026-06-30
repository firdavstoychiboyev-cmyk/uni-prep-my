"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Play, BarChart2, GraduationCap, ArrowRight, RefreshCw } from "lucide-react";
import Link from "next/link";

// ── Daily quote ────────────────────────────────────────────────────────────────
const quotes = [
    { text: "Bilim — bu kuchning eng oliy shakli.", author: "Aristotel" },
    { text: "O'rganish — bu aql uchun mashq.", author: "Aristotel" },
    { text: "Muvaffaqiyat — bu tayyorgarlik imkoniyatga uchraganida yuz beradi.", author: "Aristotel" },
    { text: "Bir narsani bilishning yagona yo'li — uni sevish.", author: "Konfutsiy" },
    { text: "Qanchalik uzoqqa borsang ham, yo'lni bilmasang — hech yerga yetmaysan.", author: "Konfutsiy" },
    { text: "O'zingni bil, shunda sen hamma narsani bilasan.", author: "Sokrat" },
    { text: "Bugun qiyin narsalarni qil, ertaga oson bo'ladi.", author: "Konfutsiy" },
    { text: "Bilim — bu zabt etilgan qo'rquv.", author: "Marks Avreliy" },
    { text: "Har kun ozgina taraqqiyot — bu katta g'alaba.", author: "Marks Avreliy" },
    { text: "Xayol — bu bilimdan muhimroq.", author: "Albert Eynshteyn" },
    { text: "Muvaffaqiyatsizlik — bu boshqa yo'lni topish imkoniyati.", author: "Tomas Edison" },
    { text: "O'qish — bu fikrlashni o'rgatadi.", author: "Aristotel" },
    { text: "Eng uzun safar ham bitta qadam bilan boshlanadi.", author: "Lao-Tszy" },
    { text: "Bilim — bu eng ishonchli boylik.", author: "Konfutsiy" },
    { text: "Har qanday qiyinchilik — bu o'sish imkoniyati.", author: "Marks Avreliy" },
];

const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
);
const dailyQuote = quotes[dayOfYear % quotes.length];

// ── Upcoming exams ─────────────────────────────────────────────────────────────
const upcomingExams = [
    { name: "Ona tili imtihoni", nameRu: "Экзамен по родному языку", date: new Date("2026-04-25") },
    { name: "DTM ro'yxatdan o'tish", nameRu: "Регистрация ДТМ", date: new Date("2026-06-05") },
    { name: "DTM kirish imtihoni", nameRu: "Вступительный экзамен ДТМ", date: new Date("2026-07-01") },
];

// ── Top universities ───────────────────────────────────────────────────────────
const TOP_UNIVERSITIES = [
    { id: "jidu", name: "JIDU", fullName: "Jahon Iqtisodiyoti va Diplomatiya Universiteti", grant: 189.0, color: "#1C82E0", soft: "#E7F2FE" },
    { id: "tdyu", name: "TDYU", fullName: "Toshkent Davlat Yuridik Universiteti", grant: 189.0, color: "#8B5CF6", soft: "#F1ECFD" },
    { id: "tdiu", name: "TDIU", fullName: "Toshkent Davlat Iqtisodiyot Universiteti", grant: 185.5, color: "#0D9488", soft: "#E0F5F2" },
    { id: "nuu", name: "O'zMU", fullName: "O'zbekiston Milliy Universiteti", grant: 181.0, color: "#16A34A", soft: "#E6F7EC" },
    { id: "tuit", name: "TUIT", fullName: "Toshkent Axborot Texnologiyalari Universiteti", grant: 176.0, color: "#D97706", soft: "#FEF1DF" },
    { id: "tdtu", name: "TDTU", fullName: "Toshkent Davlat Texnika Universiteti", grant: 165.0, color: "#E2562F", soft: "#FDEDE7" },
    { id: "samdu", name: "SamDU", fullName: "Samarqand Davlat Universiteti", grant: 160.0, color: "#E8568F", soft: "#FCEAF2" },
    { id: "tashgiu", name: "ToshDShI", fullName: "Toshkent Davlat Sharqshunoslik Universiteti", grant: 170.0, color: "#4F46E5", soft: "#EEF0FE" },
];

const GREETING_UZ = ["Xayrli tong", "Xayrli kun", "Xayrli kech"];
const GREETING_RU = ["Доброе утро", "Добрый день", "Добрый вечер"];

function getGreeting(language: string) {
    const h = new Date().getHours();
    const i = h < 12 ? 0 : h < 18 ? 1 : 2;
    return language === "uz" ? GREETING_UZ[i] : GREETING_RU[i];
}

export default function HomePage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { language } = useLanguageStore();

    const [streakDays, setStreakDays] = useState(0);
    const [totalCorrect, setTotalCorrect] = useState(0);
    const [accuracy, setAccuracy] = useState(0);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    const [dreamUni, setDreamUni] = useState<string | null>(() =>
        typeof window !== "undefined" ? localStorage.getItem("dreamUni") : null
    );

    const futureExams = upcomingExams.filter((e) => e.date > new Date());
    const nextExam = futureExams[0] ?? null;

    const handleSelectUni = (id: string) => {
        setDreamUni(id);
        localStorage.setItem("dreamUni", id);
    };

    // Countdown
    useEffect(() => {
        if (!nextExam) return;
        const update = () => {
            const diff = nextExam.date.getTime() - Date.now();
            if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
            setTimeLeft({
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
                seconds: Math.floor((diff % 60000) / 1000),
            });
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [nextExam]);

    // User stats
    useEffect(() => {
        if (!user) return;
        getDoc(doc(db, "users", user.id)).then((snap) => {
            const data = snap.data();
            setStreakDays(data?.streakDays ?? 0);
            setTotalCorrect(data?.totalCorrect ?? 0);
            setAccuracy(data?.accuracy ?? 0);
        });
    }, [user]);

    const statCards = [
        { label: language === "uz" ? "Yechilgan savollar" : "Решено вопросов", value: String(totalCorrect) },
        { label: language === "uz" ? "Joriy aniqlik" : "Текущая точность", value: `${accuracy}%` },
        { label: language === "uz" ? "Kunlik seria" : "Серия дней", value: String(streakDays) },
        { label: language === "uz" ? "Universitetlar" : "Университеты", value: String(TOP_UNIVERSITIES.length), hasBtn: true, btnLabel: language === "uz" ? "Ko'rish" : "Смотреть" },
    ];

    return (
        <div className="flex flex-col gap-10 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── Hero: greeting + CTA + countdown ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 items-start">
                <div>
                    <h1 className="text-[42px] sm:text-[46px] font-extrabold leading-[1.05] mb-7"
                        style={{ color: "#0E1419", letterSpacing: "-.03em" }}>
                        {getGreeting(language)},{" "}
                        <span style={{ color: "#A6AEB8" }}>{user?.name}</span>
                    </h1>
                    <div className="flex items-center gap-5">
                        <Link
                            href="/subjects"
                            className="inline-flex items-center gap-2.5 rounded-[13px] px-6 py-3.5 text-[15.5px] font-bold text-white transition-all duration-150"
                            style={{ background: "#1C9FEF", boxShadow: "0 8px 18px rgba(28,159,239,.28)" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#1488D6"; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#1C9FEF"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
                        >
                            <Play size={17} fill="currentColor" />
                            {language === "uz" ? "Bugungi mashqni boshlash" : "Начать сегодняшнюю сессию"}
                        </Link>
                        <Link
                            href="/statistics"
                            className="inline-flex items-center gap-2 text-[15px] font-bold transition-colors duration-150"
                            style={{ color: "#44505E" }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "#0E1419")}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "#44505E")}
                        >
                            {language === "uz" ? "Haftalik reja" : "Недельный план"}
                            <ArrowRight size={15} />
                        </Link>
                    </div>
                </div>

                {/* Countdown card */}
                {nextExam && (
                    <div className="rounded-[18px] p-7" style={{ background: "#fff", border: "1px solid #EAEDF0" }}>
                        <div className="text-[14.5px] font-semibold mb-5" style={{ color: "#6B7480" }}>
                            {language === "uz" ? "DTM imtihoniga qoldi" : "До экзамена DTM осталось"}
                        </div>
                        <div className="flex gap-5 items-baseline mb-6">
                            {[
                                { value: timeLeft.days, label: language === "uz" ? "kun" : "д" },
                                { value: timeLeft.hours, label: language === "uz" ? "soat" : "ч" },
                                { value: timeLeft.minutes, label: language === "uz" ? "daq" : "м" },
                            ].map((item) => (
                                <div key={item.label} className="flex items-baseline gap-1.5">
                                    <span className="text-[38px] font-extrabold tabular-nums" style={{ color: "#0E1419", letterSpacing: "-.02em" }}>
                                        {String(item.value).padStart(2, "0")}
                                    </span>
                                    <span className="text-[14px] font-semibold" style={{ color: "#98A1AC" }}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid #F0F2F4" }}>
                            <span className="text-[14.5px] font-semibold" style={{ color: "#44505E" }}>
                                {language === "uz" ? nextExam.name : nextExam.nameRu}
                            </span>
                            <button className="flex items-center gap-1.5 text-[13.5px] font-bold" style={{ color: "#1C9FEF", background: "none", border: "none", cursor: "pointer" }}>
                                <RefreshCw size={13} />
                                {language === "uz" ? "O'zgartirish" : "Изменить"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Analytics / stats grid ── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                        <BarChart2 size={19} style={{ color: "#0E1419" }} />
                        <span className="text-[21px] font-extrabold" style={{ color: "#0E1419", letterSpacing: "-.01em" }}>
                            {language === "uz" ? "Tahlil" : "Аналитика"}
                        </span>
                    </div>
                    <Link href="/statistics"
                        className="rounded-[11px] px-4 py-2 text-[13.5px] font-bold transition-colors"
                        style={{ background: "#F4F6F8", border: "1px solid #EAEDF0", color: "#44505E" }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#ECEFF2")}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#F4F6F8")}
                    >
                        {language === "uz" ? "Hammasini ko'rish" : "Показать всё"}
                    </Link>
                </div>
                <div className="rounded-[18px] overflow-hidden" style={{ background: "#fff", border: "1px solid #EAEDF0" }}>
                    <div className="grid grid-cols-2 lg:grid-cols-4">
                        {statCards.map((sc, i) => (
                            <div key={sc.label} className="p-6 sm:p-7" style={{ borderLeft: i === 0 ? "none" : "1px solid #EAEDF0" }}>
                                <div className="text-[14px] font-semibold mb-3.5" style={{ color: "#6B7480" }}>{sc.label}</div>
                                <div className="text-[36px] font-extrabold tabular-nums" style={{ color: "#0E1419", letterSpacing: "-.02em" }}>{sc.value}</div>
                                {sc.hasBtn && (
                                    <Link href="/statistics" className="mt-3.5 inline-block rounded-[9px] px-3 py-1.5 text-[12.5px] font-bold transition-colors"
                                        style={{ background: "#F4F6F8", border: "1px solid #EAEDF0", color: "#44505E" }}>
                                        {sc.btnLabel}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Daily quote (newspaper style — kept) ── */}
            <div
                className="relative overflow-hidden rounded-2xl block dark:hidden"
                style={{ background: "#f2e8d5", boxShadow: "0 4px 20px rgba(0,0,0,0.15), inset 0 0 60px rgba(0,0,0,0.05)", border: "1px solid #d4b896" }}
            >
                <div className="absolute inset-0 pointer-events-none opacity-30"
                    style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(0,0,0,0.03) 24px, rgba(0,0,0,0.03) 25px)" }} />
                <div className="absolute top-4 right-8 w-16 h-16 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(139,90,43,0.12) 0%, rgba(139,90,43,0.06) 50%, transparent 70%)" }} />
                <div className="relative z-10 p-6">
                    <div className="flex items-center justify-between mb-2 pb-2" style={{ borderBottom: "2px solid #1a1a1a" }}>
                        <div style={{ fontFamily: "Georgia, serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.3em", color: "#1a1a1a", textTransform: "uppercase" }}>The Daily Wisdom</div>
                        <div style={{ fontFamily: "Georgia, serif", fontSize: "9px", color: "#555", letterSpacing: "0.1em" }}>
                            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </div>
                    </div>
                    <div className="mb-4" style={{ borderBottom: "1px solid #1a1a1a" }} />
                    <div className="flex gap-4">
                        <div style={{ fontFamily: "Georgia, serif", fontSize: "80px", lineHeight: 1, color: "#1a1a1a", opacity: 0.15, marginTop: "-10px", flexShrink: 0, userSelect: "none" }}>&ldquo;</div>
                        <div className="flex-1">
                            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "17px", lineHeight: 1.6, color: "#1a1a1a", fontStyle: "italic", letterSpacing: "0.01em" }}>{dailyQuote.text}</p>
                            <div className="mt-3 flex items-center gap-2">
                                <div style={{ width: "24px", height: "1px", background: "#1a1a1a" }} />
                                <p style={{ fontFamily: "Georgia, serif", fontSize: "11px", color: "#333", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700 }}>By {dailyQuote.author}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl hidden dark:block"
                style={{ background: "#1a1a1a", boxShadow: "0 4px 20px rgba(0,0,0,0.4)", border: "1px solid #333" }}>
                <div className="relative z-10 p-6">
                    <div className="flex items-center justify-between mb-2 pb-2" style={{ borderBottom: "2px solid #444" }}>
                        <div style={{ fontFamily: "Georgia, serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.3em", color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>The Daily Wisdom</div>
                        <div style={{ fontFamily: "Georgia, serif", fontSize: "9px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
                            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </div>
                    </div>
                    <div className="mb-4" style={{ borderBottom: "1px solid #444" }} />
                    <div className="flex gap-4">
                        <div style={{ fontFamily: "Georgia, serif", fontSize: "80px", lineHeight: 1, color: "rgba(255,255,255,0.1)", marginTop: "-10px", flexShrink: 0, userSelect: "none" }}>&ldquo;</div>
                        <div className="flex-1">
                            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "17px", lineHeight: 1.6, color: "rgba(255,255,255,0.85)", fontStyle: "italic" }}>{dailyQuote.text}</p>
                            <div className="mt-3 flex items-center gap-2">
                                <div style={{ width: "24px", height: "1px", background: "#444" }} />
                                <p style={{ fontFamily: "Georgia, serif", fontSize: "11px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700 }}>By {dailyQuote.author}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Universities ── */}
            <div>
                <div className="flex items-center gap-2.5 mb-4">
                    <GraduationCap size={19} style={{ color: "#0E1419" }} />
                    <span className="text-[21px] font-extrabold" style={{ color: "#0E1419", letterSpacing: "-.01em" }}>
                        {t("home.chooseDreamUni")}
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {TOP_UNIVERSITIES.map((uni) => {
                        const isDream = dreamUni === uni.id;
                        return (
                            <div
                                key={uni.id}
                                onClick={() => handleSelectUni(uni.id)}
                                className="rounded-[16px] p-5 cursor-pointer transition-all duration-150"
                                style={{
                                    background: isDream ? uni.soft : "#fff",
                                    border: `1px solid ${isDream ? uni.color : "#EAEDF0"}`,
                                    boxShadow: isDream ? `0 0 0 2px ${uni.color}22` : "none",
                                }}
                                onMouseEnter={e => {
                                    if (!isDream) {
                                        (e.currentTarget as HTMLElement).style.borderColor = "#D7DCE2";
                                        (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 26px rgba(14,20,25,.06)";
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isDream) {
                                        (e.currentTarget as HTMLElement).style.borderColor = "#EAEDF0";
                                        (e.currentTarget as HTMLElement).style.boxShadow = "none";
                                    }
                                }}
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0 text-[14px] font-extrabold"
                                        style={{ background: uni.soft, color: uni.color }}>
                                        {uni.name}
                                    </div>
                                    <div className="text-[15px] font-bold leading-snug" style={{ color: "#0E1419" }}>{uni.fullName}</div>
                                </div>
                                <div className="flex gap-2.5">
                                    <div className="flex-1 rounded-[10px] p-3" style={{ background: "#EAF7EF" }}>
                                        <div className="text-[11px] font-bold tracking-wide mb-0.5" style={{ color: "#15803D" }}>
                                            {language === "uz" ? "Grant" : "Грант"}
                                        </div>
                                        <div className="text-[18px] font-extrabold" style={{ color: "#166534" }}>{uni.grant}</div>
                                    </div>
                                    <div className="flex-1 rounded-[10px] p-3" style={{ background: "#F4F6F8" }}>
                                        <div className="text-[11px] font-bold tracking-wide mb-0.5" style={{ color: "#6B7480" }}>
                                            {language === "uz" ? "Mening ball" : "Мой балл"}
                                        </div>
                                        <div className="text-[18px] font-extrabold" style={{ color: "#344150" }}>{totalCorrect}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
