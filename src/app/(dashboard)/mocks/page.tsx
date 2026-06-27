"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Clock, BookOpen, ChevronRight, Trophy, ClipboardList } from "lucide-react";
import Link from "next/link";

interface Mock {
    id: string;
    title: string;
    description?: string;
    category?: string;
    timeLimit?: number;
    maxScore?: number;
    questionIds?: string[];
    questionCount?: number;
    active?: boolean;
}

type MockCategory = "milliy_sertifikat" | "dtm" | "all";

export default function MocksPage() {
    const { language } = useTranslation();
    const [mocks, setMocks] = useState<Mock[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<MockCategory>("all");

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const snap = await getDocs(query(
                collection(db, "mocks"),
                where("language", "==", language),
                where("active", "==", true)
            ));
            setMocks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Mock)));
            setLoading(false);
        };
        load();
    }, [language]);

    const filtered = activeCategory === "all"
        ? mocks
        : mocks.filter(m => m.category === activeCategory);

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "var(--font-montserrat)" }}>
                    {language === "uz" ? "Mock Testlar" : "Мок Тесты"}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {language === "uz"
                        ? "Milliy sertifikat va DTM imtihonlariga tayyorlanish uchun mock testlar"
                        : "Мок тесты для подготовки к национальному сертификату и ДТМ"}
                </p>
            </div>

            <div className="flex gap-2 mb-6">
                {(["all", "milliy_sertifikat", "dtm"] as const).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                            activeCategory === cat
                                ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                    >
                        {cat === "all"
                            ? (language === "uz" ? "Barchasi" : "Все")
                            : cat === "milliy_sertifikat"
                            ? (language === "uz" ? "🎓 Milliy Sertifikat" : "🎓 Национальный Сертификат")
                            : (language === "uz" ? "🏛️ DTM" : "🏛️ ДТМ")}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="text-muted-foreground">
                    {language === "uz" ? "Yuklanmoqda..." : "Загрузка..."}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <ClipboardList className="w-16 h-16 text-muted-foreground/30 mb-4" />
                    <p className="text-xl font-bold text-foreground mb-2">
                        {language === "uz" ? "Hozircha mock testlar yo'q" : "Пока нет мок тестов"}
                    </p>
                    <p className="text-muted-foreground text-sm">
                        {language === "uz" ? "Tez orada qo'shiladi!" : "Скоро будут добавлены!"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map(mock => (
                        <Link
                            key={mock.id}
                            href={`/mocks/${mock.id}`}
                            className="rounded-2xl border border-border bg-card p-6 hover:shadow-md hover:border-blue-300 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950">
                                    <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                </div>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                                    mock.category === "milliy_sertifikat"
                                        ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                }`}>
                                    {mock.category === "milliy_sertifikat" ? "Milliy Sertifikat" : "DTM"}
                                </span>
                            </div>
                            <h3 className="font-bold text-foreground text-lg mb-1" style={{ fontFamily: "var(--font-montserrat)" }}>
                                {mock.title}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">{mock.description}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <BookOpen className="w-4 h-4" />
                                    <span>{mock.questionIds?.length ?? mock.questionCount ?? 0} {language === "uz" ? "savol" : "вопросов"}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    <span>{mock.timeLimit} {language === "uz" ? "daqiqa" : "минут"}</span>
                                </div>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                    <span className="text-sm font-semibold text-foreground">
                                        {language === "uz" ? "Maks. ball:" : "Макс. балл:"} {mock.maxScore}
                                    </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
