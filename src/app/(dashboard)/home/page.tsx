"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubjectsStore } from "@/store/useSubjectsStore";
import { useStatsStore } from "@/store/useStatsStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import SubjectCard from "@/components/subject-card";
import { fetchUserSubjectRatings, fetchSubjectProgress } from "@/lib/stats-utils";
import { fetchSubjects, fetchTextbooksBySubject, fetchTopicsByTextbook } from "@/lib/data-fetching";
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
    const { subjects, loaded: subjectsLoaded, setSubjects } = useSubjectsStore();
    const {
        subjectProgress,
        loadedForUser,
        setSubjectProgress, setRatings, setLoadedForUser,
    } = useStatsStore();

    const [streakDays, setStreakDays] = useState(0);
    const [totalCorrect, setTotalCorrect] = useState(0);

    const [dreamUni, setDreamUni] = useState<string | null>(() =>
        typeof window !== "undefined" ? localStorage.getItem("dreamUni") : null
    );
    const [showUniPicker, setShowUniPicker] = useState(false);

    const isLoading = !subjectsLoaded;

    // ── Filter exams ───────────────────────────────────────────────────────────
    const futureExams = upcomingExams.filter((e) => e.date > new Date());
    const nextExam = futureExams[0] ?? null;
    const daysLeft = nextExam
        ? Math.ceil((nextExam.date.getTime() - Date.now()) / 86400000)
        : null;

    // ── Dream uni helpers ──────────────────────────────────────────────────────
    const selectedUni = TOP_UNIVERSITIES.find((u) => u.id === dreamUni) ?? null;
    const progressToGrant = selectedUni
        ? Math.min(100, Math.round((totalCorrect / 500) * 100))
        : 0;

    const handleSelectUni = (id: string) => {
        setDreamUni(id);
        localStorage.setItem("dreamUni", id);
        setShowUniPicker(false);
    };

    // ── Load subjects ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!subjectsLoaded) {
            fetchSubjects().then(setSubjects);
        }
    }, [subjectsLoaded, setSubjects]);

    // ── Load user stats + subject progress ────────────────────────────────────
    useEffect(() => {
        if (!user || !subjectsLoaded) return;
        if (loadedForUser === user.id) return;

        const load = async () => {
            const userDoc = await getDoc(doc(db, "users", user.id));
            const userData = userDoc.data();
            setStreakDays(userData?.streakDays ?? 0);
            setTotalCorrect(userData?.totalCorrect ?? 0);

            const ratings = await fetchUserSubjectRatings(user.id);
            setRatings(ratings);
            setLoadedForUser(user.id);

            await Promise.all(
                subjects.map(async (subject) => {
                    const textbooks = await fetchTextbooksBySubject(subject.id);
                    const allTopicIds = (
                        await Promise.all(textbooks.map((tb) => fetchTopicsByTextbook(tb.id)))
                    ).flat().map((tp) => tp.id);
                    const progress = await fetchSubjectProgress(user.id, subject.id, allTopicIds);
                    setSubjectProgress(subject.id, {
                        stars: ratings[subject.id] || 0,
                        medals: progress.medals,
                        progress: progress.progress,
                    });
                })
            );
        };

        load();
    }, [user, subjectsLoaded, subjects, loadedForUser, setRatings, setLoadedForUser, setSubjectProgress]);

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
            <div className="rounded-2xl border border-border bg-card p-6">
                <p className="text-lg italic text-foreground leading-relaxed" style={{ fontFamily: "var(--font-montserrat)" }}>
                    &ldquo;{dailyQuote.text}&rdquo;
                </p>
                <p className="mt-3 text-sm font-semibold text-muted-foreground">— {dailyQuote.author}</p>
            </div>

            {/* ── Exam Countdown ────────────────────────────────────────────── */}
            {nextExam && (
                <div className="rounded-2xl border border-border bg-card p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-950">
                            <CalendarClock className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                            {t("home.nextExam")}
                        </div>
                        <div className="font-bold text-foreground" style={{ fontFamily: "var(--font-montserrat)" }}>
                            {language === "uz" ? nextExam.name : nextExam.nameRu}
                        </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-black text-indigo-600" style={{ fontFamily: "var(--font-montserrat)" }}>
                            {daysLeft}
                        </div>
                        <div className="text-xs text-muted-foreground">{t("home.daysLeft")}</div>
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
                        <span>{totalCorrect} / 500</span>
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

            {/* ── Subjects Grid ─────────────────────────────────────────────── */}
            <section>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("home.availableSubjects")}</h2>
                    <span className="self-start rounded-xl border border-border bg-muted px-4 py-2 text-xs font-bold uppercase tracking-widest text-muted-foreground sm:self-auto sm:text-sm">
                        {t("home.subjectsCount", { count: subjects.length })}
                    </span>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                            <div key={n} className="h-[116px] animate-pulse rounded-2xl border border-border bg-muted" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {subjects.map((subject) => {
                            const progress = subjectProgress[subject.id] || {
                                stars: 0,
                                medals: { green: 0, grey: 0, bronze: 0 },
                                progress: 0,
                            };
                            return (
                                <SubjectCard
                                    key={subject.id}
                                    subject={subject}
                                    stars={progress.stars}
                                    medals={progress.medals}
                                    progress={progress.progress}
                                />
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ── Support Section ───────────────────────────────────────────── */}
            <section className="rounded-3xl border border-border bg-muted/50 py-16 text-center dark:bg-muted/30">
                <div className="px-8">
                    <h2 className="mb-4 text-3xl font-bold text-foreground">{t("home.needHelp")}</h2>
                    <p className="mx-auto mb-8 max-w-md font-medium text-muted-foreground">
                        {t("home.supportText")}
                    </p>
                    <button
                        type="button"
                        className="rounded-2xl bg-foreground px-9 py-3.5 font-bold text-background shadow-sm transition-all hover:opacity-90 active:scale-95"
                    >
                        {t("home.contactSupport")}
                    </button>
                </div>
            </section>
        </div>
    );
}
