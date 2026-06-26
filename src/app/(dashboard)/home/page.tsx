"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Flame, BarChart2, GraduationCap, CalendarClock } from "lucide-react";

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
    { id: "jidu", name: "JIDU", fullName: "Jahon Iqtisodiyoti va Diplomatiya Universiteti", grant: 189.0 },
    { id: "tdyu", name: "TDYU", fullName: "Toshkent Davlat Yuridik Universiteti", grant: 189.0 },
    { id: "tdiu", name: "TDIU", fullName: "Toshkent Davlat Iqtisodiyot Universiteti", grant: 185.5 },
    { id: "nuu", name: "O'zMU", fullName: "O'zbekiston Milliy Universiteti", grant: 181.0 },
    { id: "tuit", name: "TUIT", fullName: "Toshkent Axborot Texnologiyalari Universiteti", grant: 176.0 },
    { id: "tdtu", name: "TDTU", fullName: "Toshkent Davlat Texnika Universiteti", grant: 165.0 },
    { id: "samdu", name: "SamDU", fullName: "Samarqand Davlat Universiteti", grant: 160.0 },
    { id: "tashgiu", name: "ToshDShI", fullName: "Toshkent Davlat Sharqshunoslik Universiteti", grant: 170.0 },
];

export default function HomePage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const { language } = useLanguageStore();

    const [streakDays, setStreakDays] = useState(0);
    const [totalCorrect, setTotalCorrect] = useState(0);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    const [dreamUni, setDreamUni] = useState<string | null>(() =>
        typeof window !== "undefined" ? localStorage.getItem("dreamUni") : null
    );
    const [showUniPicker, setShowUniPicker] = useState(false);

    // ── Filter exams ───────────────────────────────────────────────────────────
    const futureExams = upcomingExams.filter((e) => e.date > new Date());
    const nextExam = futureExams[0] ?? null;


    // ── Dream uni helpers ──────────────────────────────────────────────────────
    const selectedUni = TOP_UNIVERSITIES.find((u) => u.id === dreamUni) ?? null;
    const progressToGrant = selectedUni
        ? Math.min(100, Math.round((totalCorrect / 189) * 100))
        : 0;

    const handleSelectUni = (id: string) => {
        setDreamUni(id);
        localStorage.setItem("dreamUni", id);
        setShowUniPicker(false);
    };

    // ── Live exam countdown ────────────────────────────────────────────────────
    useEffect(() => {
        if (!nextExam) return;
        const update = () => {
            const diff = nextExam.date.getTime() - Date.now();
            if (diff <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                return;
            }
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

    // ── Load user stats ────────────────────────────────────────────────────────
    useEffect(() => {
        if (!user) return;
        getDoc(doc(db, "users", user.id)).then((snap) => {
            const data = snap.data();
            setStreakDays(data?.streakDays ?? 0);
            setTotalCorrect(data?.totalCorrect ?? 0);
        });
    }, [user]);

    return (
        <div className="flex flex-col gap-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── Stats Row ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-950">
                        <Flame className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-foreground" style={{ fontFamily: "var(--font-montserrat)" }}>{streakDays}</div>
                        <div className="text-xs text-muted-foreground font-medium">{t("home.streak")}</div>
                    </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950">
                        <BarChart2 className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <div className="text-2xl font-black text-foreground" style={{ fontFamily: "var(--font-montserrat)" }}>{totalCorrect}</div>
                        <div className="text-xs text-muted-foreground font-medium">{t("home.totalSolved")}</div>
                    </div>
                </div>
            </div>

            {/* ── Daily Quote ───────────────────────────────────────────────── */}

            {/* Light mode — vintage newspaper clipping */}
            <div
                className="relative overflow-hidden rounded-2xl block dark:hidden"
                style={{
                    background: "#f2e8d5",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15), inset 0 0 60px rgba(0,0,0,0.05)",
                    border: "1px solid #d4b896",
                }}
            >
                {/* Paper texture — ruled lines */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(0,0,0,0.03) 24px, rgba(0,0,0,0.03) 25px)",
                    }}
                />
                {/* Coffee stain */}
                <div
                    className="absolute top-4 right-8 w-16 h-16 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(139,90,43,0.12) 0%, rgba(139,90,43,0.06) 50%, transparent 70%)" }}
                />
                <div className="relative z-10 p-6">
                    {/* Masthead */}
                    <div className="flex items-center justify-between mb-2 pb-2" style={{ borderBottom: "2px solid #1a1a1a" }}>
                        <div style={{ fontFamily: "Georgia, serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.3em", color: "#1a1a1a", textTransform: "uppercase" }}>
                            The Daily Wisdom
                        </div>
                        <div style={{ fontFamily: "Georgia, serif", fontSize: "9px", color: "#555", letterSpacing: "0.1em" }}>
                            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </div>
                    </div>
                    <div className="mb-4" style={{ borderBottom: "1px solid #1a1a1a" }}/>
                    {/* Body */}
                    <div className="flex gap-4">
                        <div style={{ fontFamily: "Georgia, serif", fontSize: "80px", lineHeight: 1, color: "#1a1a1a", opacity: 0.15, marginTop: "-10px", flexShrink: 0, userSelect: "none" }}>
                            &ldquo;
                        </div>
                        <div className="flex-1">
                            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "17px", lineHeight: 1.6, color: "#1a1a1a", fontStyle: "italic", letterSpacing: "0.01em" }}>
                                {dailyQuote.text}
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <div style={{ width: "24px", height: "1px", background: "#1a1a1a" }}/>
                                <p style={{ fontFamily: "Georgia, serif", fontSize: "11px", color: "#333", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700 }}>
                                    By {dailyQuote.author}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Dummy column lines */}
                    <div className="mt-4 pt-3 grid grid-cols-3 gap-3" style={{ borderTop: "1px solid #aaa" }}>
                        {([[90,75,85],[70,95,80],[85,70,90]] as number[][]).map((widths, i) => (
                            <div key={i} className="flex flex-col gap-1">
                                {widths.map((w, j) => (
                                    <div key={j} className="rounded-sm" style={{ height: "6px", background: "#1a1a1a", opacity: 0.09, width: w + "%" }}/>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Dark mode — dark newspaper */}
            <div
                className="relative overflow-hidden rounded-2xl hidden dark:block"
                style={{
                    background: "#1a1a1a",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4), inset 0 0 60px rgba(255,255,255,0.02)",
                    border: "1px solid #333",
                }}
            >
                {/* Paper texture — ruled lines */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(255,255,255,0.04) 24px, rgba(255,255,255,0.04) 25px)",
                    }}
                />
                {/* Coffee stain */}
                <div
                    className="absolute top-4 right-8 w-16 h-16 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle, rgba(180,130,80,0.08) 0%, rgba(180,130,80,0.03) 50%, transparent 70%)" }}
                />
                <div className="relative z-10 p-6">
                    {/* Masthead */}
                    <div className="flex items-center justify-between mb-2 pb-2" style={{ borderBottom: "2px solid #444" }}>
                        <div style={{ fontFamily: "Georgia, serif", fontSize: "10px", fontWeight: 700, letterSpacing: "0.3em", color: "rgba(255,255,255,0.75)", textTransform: "uppercase" }}>
                            The Daily Wisdom
                        </div>
                        <div style={{ fontFamily: "Georgia, serif", fontSize: "9px", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em" }}>
                            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                        </div>
                    </div>
                    <div className="mb-4" style={{ borderBottom: "1px solid #444" }}/>
                    {/* Body */}
                    <div className="flex gap-4">
                        <div style={{ fontFamily: "Georgia, serif", fontSize: "80px", lineHeight: 1, color: "rgba(255,255,255,0.1)", marginTop: "-10px", flexShrink: 0, userSelect: "none" }}>
                            &ldquo;
                        </div>
                        <div className="flex-1">
                            <p style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "17px", lineHeight: 1.6, color: "rgba(255,255,255,0.85)", fontStyle: "italic", letterSpacing: "0.01em" }}>
                                {dailyQuote.text}
                            </p>
                            <div className="mt-3 flex items-center gap-2">
                                <div style={{ width: "24px", height: "1px", background: "#444" }}/>
                                <p style={{ fontFamily: "Georgia, serif", fontSize: "11px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 700 }}>
                                    By {dailyQuote.author}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Dummy column lines */}
                    <div className="mt-4 pt-3 grid grid-cols-3 gap-3" style={{ borderTop: "1px solid #333" }}>
                        {([[90,75,85],[70,95,80],[85,70,90]] as number[][]).map((widths, i) => (
                            <div key={i} className="flex flex-col gap-1">
                                {widths.map((w, j) => (
                                    <div key={j} className="rounded-sm" style={{ height: "6px", background: "rgba(255,255,255,0.12)", width: w + "%" }}/>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Exam Countdown ────────────────────────────────────────────── */}
            {nextExam && (
                <div className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950">
                                <CalendarClock className="w-3.5 h-3.5 text-indigo-500" />
                            </div>
                            <span className="text-xs font-semibold text-muted-foreground truncate max-w-[160px]">
                                {language === "uz" ? nextExam.name : nextExam.nameRu}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            {[
                                { value: timeLeft.days,    label: language === "uz" ? "kun" : "д" },
                                { value: timeLeft.hours,   label: language === "uz" ? "s"   : "ч" },
                                { value: timeLeft.minutes, label: language === "uz" ? "d"   : "м" },
                                { value: timeLeft.seconds, label: language === "uz" ? "sn"  : "с" },
                            ].map((item, i) => (
                                <div key={item.label} className="flex items-center gap-1">
                                    <div className="flex flex-col items-center">
                                        <div className="w-9 h-9 rounded-lg bg-foreground flex items-center justify-center shadow-sm">
                                            <span className="text-sm font-black text-background" style={{ fontFamily: "var(--font-montserrat)" }}>
                                                {String(item.value).padStart(2, "0")}
                                            </span>
                                        </div>
                                        <span className="text-[9px] text-muted-foreground mt-0.5 font-medium">{item.label}</span>
                                    </div>
                                    {i < 3 && (
                                        <span className="text-foreground font-black text-sm mb-3 opacity-60">:</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Dream University ──────────────────────────────────────────── */}
            {selectedUni ? (
                <div className="rounded-2xl border border-border bg-card p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                                <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-950">
                                    <GraduationCap className="w-3.5 h-3.5 text-green-500" />
                                </div>
                                {t("home.chooseDreamUni")}
                            </div>
                            <div className="text-lg font-black text-foreground" style={{ fontFamily: "var(--font-montserrat)" }}>{selectedUni.name}</div>
                            <div className="text-sm text-muted-foreground">{selectedUni.fullName}</div>
                        </div>
                        <button
                            onClick={() => setShowUniPicker(true)}
                            className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-500 transition-colors"
                        >
                            {t("common.edit")}
                        </button>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>{totalCorrect} / 189</span>
                        <span>Grant: {selectedUni.grant}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                            className="h-full rounded-full bg-indigo-600 transition-all duration-700"
                            style={{ width: `${progressToGrant}%` }}
                        />
                    </div>
                    <div className="mt-1.5 text-xs text-right text-muted-foreground">{progressToGrant}%</div>
                </div>
            ) : (
                <div
                    onClick={() => setShowUniPicker(true)}
                    className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center cursor-pointer hover:border-indigo-400 transition-colors"
                >
                    <div className="flex justify-center mb-3">
                        <div className="p-2.5 rounded-xl bg-green-100 dark:bg-green-950">
                            <GraduationCap className="w-5 h-5 text-green-500" />
                        </div>
                    </div>
                    <div className="font-bold text-foreground">{t("home.chooseDreamUni")}</div>
                    <div className="text-sm text-muted-foreground mt-1">{t("home.chooseDreamUniHint")}</div>
                </div>
            )}

            {/* ── University Picker Modal ───────────────────────────────────── */}
            {showUniPicker && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                    onClick={() => setShowUniPicker(false)}
                >
                    <div
                        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-base font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-montserrat)" }}>
                            {t("home.chooseDreamUni")}
                        </h3>
                        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
                            {TOP_UNIVERSITIES.map((uni) => (
                                <button
                                    key={uni.id}
                                    onClick={() => handleSelectUni(uni.id)}
                                    className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors hover:border-indigo-400 ${
                                        dreamUni === uni.id
                                            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40"
                                            : "border-border bg-muted/30"
                                    }`}
                                >
                                    <div>
                                        <div className="font-bold text-foreground text-sm">{uni.name}</div>
                                        <div className="text-xs text-muted-foreground">{uni.fullName}</div>
                                    </div>
                                    <div className="text-xs font-semibold text-indigo-600 ml-3 shrink-0">{uni.grant}</div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setShowUniPicker(false)}
                            className="mt-4 w-full rounded-xl border border-border py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {t("common.cancel")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
