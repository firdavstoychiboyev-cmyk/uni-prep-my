"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Play, BarChart2, GraduationCap, ArrowRight } from "lucide-react";
import Link from "next/link";
import HomeworkSection from "@/components/homework-section";
import ClassLeaderboardSection from "@/components/class-leaderboard-section";

// logo → static asset under /public/university-logos/. Filenames are the
// originals supplied per university (spaces removed to avoid URL encoding).
// If a file is missing, UniLogo falls back to the coloured short-code badge.
const TOP_UNIVERSITIES = [
    { id: "jidu",    name: "JIDU",      fullName: "Jahon Iqtisodiyoti va Diplomatiya Universiteti", grant: 189.0, color: "#3B82F6", logo: "/university-logos/jidu.png" },
    { id: "tdyu",    name: "TDYU",      fullName: "Toshkent Davlat Yuridik Universiteti",           grant: 189.0, color: "#8B5CF6", logo: "/university-logos/Toshkent_davlat_yuridik_universiteti-01-2.png" },
    { id: "tdiu",    name: "TDIU",      fullName: "Toshkent Davlat Iqtisodiyot Universiteti",       grant: 185.5, color: "#14B8A6", logo: "/university-logos/TDIU-01.png" },
    { id: "nuu",     name: "O'zMU",     fullName: "O'zbekiston Milliy Universiteti",                grant: 181.0, color: "#10B981", logo: "/university-logos/OZMU-01.png" },
    { id: "tuit",    name: "TUIT",      fullName: "Toshkent Axborot Texnologiyalari Universiteti",  grant: 176.0, color: "#F59E0B", logo: "/university-logos/TATU-01.png" },
    { id: "tdtu",    name: "TDTU",      fullName: "Toshkent Davlat Texnika Universiteti",           grant: 165.0, color: "#EF4444", logo: "/university-logos/TDTU_LOGO.png" },
    { id: "samdu",   name: "SamDU",     fullName: "Samarqand Davlat Universiteti",                  grant: 160.0, color: "#EC4899", logo: "/university-logos/images.jpeg" },
    { id: "tashgiu", name: "ToshDShI",  fullName: "Toshkent Davlat Sharqshunoslik Universiteti",   grant: 170.0, color: "#6366F1", logo: "/university-logos/channels4_profile.jpg" },
];

// Renders the university logo image, contained in a fixed square so every card
// looks uniform regardless of the logo's aspect ratio. Falls back to the
// coloured short-code badge if the image is missing or fails to load.
function UniLogo({ uni }: { uni: (typeof TOP_UNIVERSITIES)[number] }) {
    const [failed, setFailed] = useState(false);
    if (uni.logo && !failed) {
        return (
            <div className="w-[72px] h-[72px] rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-white border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={uni.logo}
                    alt={uni.name}
                    className="w-full h-full object-contain p-1.5"
                    onError={() => setFailed(true)}
                />
            </div>
        );
    }
    return (
        <div className="w-[72px] h-[72px] rounded-xl flex items-center justify-center text-base font-extrabold flex-shrink-0"
            style={{ background: `${uni.color}22`, color: uni.color }}>
            {uni.name.slice(0, 4)}
        </div>
    );
}

// Даты ориентировочные — обновляйте при публикации официального календаря DTM.
// Прошедшие даты автоматически скрываются (futureExams), поэтому держите здесь и следующий цикл.
const upcomingExams = [
    { name: "DTM imtihonlari yakuni", nameRu: "Окончание экзаменов ДТМ", date: new Date("2026-08-01") },
    { name: "Ona tili imtihoni", nameRu: "Экзамен по родному языку", date: new Date("2027-04-25") },
    { name: "DTM ro'yxatdan o'tish", nameRu: "Регистрация ДТМ", date: new Date("2027-06-05") },
    { name: "DTM kirish imtihoni", nameRu: "Вступительный экзамен ДТМ", date: new Date("2027-07-01") },
];

const quotes = [
    { text: "Bilim — bu kuchning eng oliy shakli.", author: "Aristotel" },
    { text: "O'rganish — bu aql uchun mashq.", author: "Aristotel" },
    { text: "Muvaffaqiyat — bu tayyorgarlik imkoniyatga uchraganida yuz beradi.", author: "Aristotel" },
    { text: "Xayol — bu bilimdan muhimroq.", author: "Albert Eynshteyn" },
    { text: "Har kun ozgina taraqqiyot — bu katta g'alaba.", author: "Marks Avreliy" },
];
const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
const dailyQuote = quotes[dayOfYear % quotes.length];

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
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
    const [dreamUni, setDreamUni] = useState<string | null>(() =>
        typeof window !== "undefined" ? localStorage.getItem("dreamUni") : null
    );

    const futureExams = upcomingExams.filter((e) => e.date > new Date());
    const nextExam = futureExams[0] ?? null;

    const handleSelectUni = (id: string) => { setDreamUni(id); localStorage.setItem("dreamUni", id); };

    useEffect(() => {
        if (!nextExam) return;
        const update = () => {
            const diff = nextExam.date.getTime() - Date.now();
            if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0 }); return; }
            setTimeLeft({
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
            });
        };
        update();
        const iv = setInterval(update, 1000);
        return () => clearInterval(iv);
    }, [nextExam]);

    useEffect(() => {
        if (!user) return;
        getDoc(doc(db, "users", user.id)).then((snap) => {
            const d = snap.data();
            setStreakDays(d?.streakDays ?? 0);
            setTotalCorrect(d?.totalCorrect ?? 0);
            setAccuracy(d?.accuracy ?? 0);
        });
    }, [user]);

    return (
        <div className="flex flex-col gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* ── Greeting ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
                <div>
                    <h1 className="text-[40px] sm:text-[48px] font-extrabold leading-[1.05] mb-6 text-foreground" style={{ letterSpacing: "-.03em" }}>
                        {getGreeting(language)},<br />
                        <span className="text-muted-foreground">{user?.name}</span>
                    </h1>
                    <div className="flex items-center gap-5 flex-wrap">
                        <Link href="/subjects"
                            className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-[14px] font-bold transition-all duration-150 bg-foreground text-background hover:opacity-90 active:scale-95">
                            <Play size={14} fill="currentColor" />
                            {language === "uz" ? "Mashqni boshlash" : "Начать практику"}
                        </Link>
                        <Link href="/statistics"
                            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                            {language === "uz" ? "Statistika" : "Статистика"}
                            <ArrowRight size={14} />
                        </Link>
                        {user?.role === "student" && (
                            <Link href="/mistakes"
                                className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                                {t("nav.mistakes")}
                                <ArrowRight size={14} />
                            </Link>
                        )}
                    </div>
                </div>

                {/* Countdown */}
                {nextExam && (
                    <div className="rounded-xl p-6 bg-card border border-border">
                        <div className="text-[12px] font-semibold uppercase tracking-widest mb-4 text-muted-foreground">
                            {language === "uz" ? "DTM IMTIHONIGA QOLDI" : "ДО ЭКЗАМЕНА DTM"}
                        </div>
                        <div className="flex gap-6">
                            {[
                                { value: timeLeft.days, label: language === "uz" ? "kun" : "д" },
                                { value: timeLeft.hours, label: language === "uz" ? "soat" : "ч" },
                                { value: timeLeft.minutes, label: language === "uz" ? "daqiqa" : "мин" },
                            ].map((item) => (
                                <div key={item.label}>
                                    <div className="text-[40px] font-extrabold tabular-nums text-foreground" style={{ letterSpacing: "-.03em" }}>
                                        {String(item.value).padStart(2, "0")}
                                    </div>
                                    <div className="text-[12px] font-medium mt-0.5 text-muted-foreground">{item.label}</div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 text-[13px] font-medium text-muted-foreground border-t border-border">
                            {language === "uz" ? nextExam.name : nextExam.nameRu}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Homework (students with class assignments only) ── */}
            <HomeworkSection />

            {/* ── Class leaderboard (students enrolled in a class only) ── */}
            <ClassLeaderboardSection />

            {/* ── Stats row ── */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <BarChart2 size={17} className="text-muted-foreground" />
                        <span className="text-[17px] font-bold text-foreground">{language === "uz" ? "Tahlil" : "Аналитика"}</span>
                    </div>
                    <Link href="/statistics"
                        className="text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                        {language === "uz" ? "Barchasi →" : "Все →"}
                    </Link>
                </div>
                <div className="rounded-xl overflow-hidden bg-card border border-border">
                    <div className="grid grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: language === "uz" ? "Yechilgan" : "Решено", value: String(totalCorrect) },
                            { label: language === "uz" ? "Aniqlik" : "Точность", value: `${accuracy}%` },
                            { label: language === "uz" ? "Seria" : "Серия", value: String(streakDays) },
                            { label: language === "uz" ? "Universitetlar" : "Университеты", value: String(TOP_UNIVERSITIES.length) },
                        ].map((s, i) => (
                            <div key={s.label} className={`p-4 sm:p-5 ${i !== 0 ? "border-l border-border" : ""}`}>
                                <div className="text-stat-label font-semibold mb-2 uppercase text-muted-foreground">{s.label}</div>
                                <div className="text-stat font-extrabold tabular-nums text-foreground">{s.value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Daily quote ── */}
            <div className="rounded-xl p-6 bg-card border border-border">
                <div className="text-[11px] font-bold uppercase tracking-[.18em] mb-4 text-muted-foreground">Daily Wisdom</div>
                <p className="text-quote font-medium text-foreground" style={{ fontFamily: "var(--font-source-serif), Georgia, serif" }}>
                    &ldquo;{dailyQuote.text}&rdquo;
                </p>
                <p className="mt-3 text-[13px] font-semibold text-muted-foreground">— {dailyQuote.author}</p>
            </div>

            {/* ── Universities ── */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <GraduationCap size={17} className="text-muted-foreground" />
                    <span className="text-[17px] font-bold text-foreground">{t("home.chooseDreamUni")}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {TOP_UNIVERSITIES.map((uni) => {
                        const isDream = dreamUni === uni.id;
                        return (
                            <div key={uni.id}
                                onClick={() => handleSelectUni(uni.id)}
                                // Same surface token as every other dashboard card (bg-card + border-border).
                                // Selected "dream" uni keeps a distinct coloured border/ring accent.
                                className={`rounded-xl p-4 cursor-pointer transition-all duration-150 bg-card ${
                                    isDream ? "" : "border border-border hover:border-foreground/20"
                                }`}
                                style={isDream ? { border: `1px solid ${uni.color}`, boxShadow: `inset 0 0 0 1px ${uni.color}` } : undefined}>
                                <div className="flex items-center gap-3 mb-3">
                                    <UniLogo uni={uni} />
                                    <div className="text-[15px] font-bold text-foreground leading-snug">{uni.fullName}</div>
                                </div>
                                <div className="flex gap-2">
                                    <div className="flex-1 rounded-lg p-2.5 bg-emerald-50 dark:bg-[#0d1f12]">
                                        <div className="text-[11px] font-bold uppercase tracking-wider mb-0.5 text-emerald-600 dark:text-emerald-400">
                                            {language === "uz" ? "Grant" : "Грант"}
                                        </div>
                                        <div className="text-[17px] font-extrabold text-foreground tabular-nums">{uni.grant}</div>
                                    </div>
                                    <div className="flex-1 rounded-lg p-2.5 bg-muted">
                                        <div className="text-[11px] font-bold uppercase tracking-wider mb-0.5 text-muted-foreground">
                                            {language === "uz" ? "Mening ball" : "Мой балл"}
                                        </div>
                                        <div className="text-[17px] font-extrabold text-foreground tabular-nums">{totalCorrect}</div>
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
