"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Clock, BookOpen, ChevronRight, ClipboardList, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { MockResult } from "@/lib/firestore-schema";

interface Mock {
    id: string;
    title: string;
    description?: string;
    category?: string;
    questions?: unknown[];
    active?: boolean;
}

type MockCategory = "milliy_sertifikat" | "dtm" | "all";

export default function MocksPage() {
    const { t, language } = useTranslation();
    const router = useRouter();
    const { user } = useAuthStore();
    const [mocks, setMocks] = useState<Mock[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<MockCategory>("all");
    // Результаты пройденных моков — бейдж со счётом и ссылка на разбор
    const [results, setResults] = useState<Record<string, MockResult>>({});

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

    useEffect(() => {
        if (!user) return;
        getDocs(collection(db, "users", user.id, "mockResults"))
            .then(snap => {
                const map: Record<string, MockResult> = {};
                snap.docs.forEach(d => { map[d.id] = d.data() as MockResult; });
                setResults(map);
            })
            .catch(() => {});
    }, [user]);

    const filtered = activeCategory === "all" ? mocks : mocks.filter(m => m.category === activeCategory);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-[28px] font-extrabold text-foreground" style={{ letterSpacing: "-.02em" }}>
                    {language === "uz" ? "Mock Testlar" : "Мок Тесты"}
                </h1>
                <p className="text-[14px] mt-1 text-muted-foreground">
                    {language === "uz"
                        ? "Milliy sertifikat va DTM imtihonlariga tayyorlanish uchun mock testlar"
                        : "Мок тесты для подготовки к национальному сертификату и ДТМ"}
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {(["all", "milliy_sertifikat", "dtm"] as const).map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-100 ${
                            activeCategory === cat
                                ? "bg-foreground text-background"
                                : "text-muted-foreground border border-border hover:border-foreground/20"
                        }`}>
                        {cat === "all"
                            ? (language === "uz" ? "Barchasi" : "Все")
                            : cat === "milliy_sertifikat"
                            ? (language === "uz" ? "Milliy Sertifikat" : "Национальный Сертификат")
                            : "DTM"}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map(n => (
                        <div key={n} className="h-44 rounded-xl animate-pulse bg-muted" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <ClipboardList className="w-12 h-12 mb-4 text-muted-foreground/40" />
                    <p className="text-[18px] font-bold text-foreground mb-1">
                        {language === "uz" ? "Hozircha mock testlar yo'q" : "Пока нет мок тестов"}
                    </p>
                    <p className="text-[14px] text-muted-foreground">
                        {language === "uz" ? "Tez orada qo'shiladi!" : "Скоро будут добавлены!"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filtered.map(mock => {
                        const isGreen = mock.category === "milliy_sertifikat";
                        return (
                            <Link key={mock.id} href={`/mocks/${mock.id}`}
                                className="flex flex-col rounded-xl p-5 transition-all duration-150 group bg-card border border-border hover:border-foreground/20">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted">
                                        <ClipboardList className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                                        style={isGreen
                                            ? { background: "#0d2010", color: "#22c55e", border: "1px solid #163d1e" }
                                            : { background: "#0c1829", color: "#38bdf8", border: "1px solid #1a3a5c" }}>
                                        {isGreen ? "Milliy Sertifikat" : "DTM"}
                                    </span>
                                </div>
                                <h3 className="font-bold text-[16px] text-foreground mb-1">{mock.title}</h3>
                                <p className="text-[13px] mb-4 text-muted-foreground">{mock.description}</p>
                                {results[mock.id] && (
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-green-600 dark:text-green-400">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {typeof results[mock.id].correct === "number"
                                                ? `${results[mock.id].correct} / ${results[mock.id].total}`
                                                : t("mock.review.completed")}
                                        </span>
                                        {results[mock.id].answers && (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    router.push(`/mocks/${mock.id}?review=1`);
                                                }}
                                                className="text-[12px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                                            >
                                                {t("mock.review.viewResults")}
                                            </button>
                                        )}
                                    </div>
                                )}
                                <div className="flex items-center gap-4 text-[12px] mt-auto text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5" />
                                        <span>55 {language === "uz" ? "savol" : "вопросов"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{language === "uz" ? "2 soat" : "2 часа"}</span>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 ml-auto transition-colors opacity-40" />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
