"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { Clock, BookOpen, ChevronRight, ClipboardList } from "lucide-react";
import Link from "next/link";

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

    const filtered = activeCategory === "all" ? mocks : mocks.filter(m => m.category === activeCategory);

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="text-[28px] font-extrabold text-white" style={{ letterSpacing: "-.02em" }}>
                    {language === "uz" ? "Mock Testlar" : "Мок Тесты"}
                </h1>
                <p className="text-[14px] mt-1" style={{ color: "#737373" }}>
                    {language === "uz"
                        ? "Milliy sertifikat va DTM imtihonlariga tayyorlanish uchun mock testlar"
                        : "Мок тесты для подготовки к национальному сертификату и ДТМ"}
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                {(["all", "milliy_sertifikat", "dtm"] as const).map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                        className="px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-100"
                        style={activeCategory === cat
                            ? { background: "#fff", color: "#000" }
                            : { background: "transparent", color: "#737373", border: "1px solid #1f1f1f" }}>
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
                        <div key={n} className="h-44 rounded-xl animate-pulse" style={{ background: "#141414" }} />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <ClipboardList className="w-12 h-12 mb-4" style={{ color: "#2a2a2a" }} />
                    <p className="text-[18px] font-bold text-white mb-1">
                        {language === "uz" ? "Hozircha mock testlar yo'q" : "Пока нет мок тестов"}
                    </p>
                    <p className="text-[14px]" style={{ color: "#737373" }}>
                        {language === "uz" ? "Tez orada qo'shiladi!" : "Скоро будут добавлены!"}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filtered.map(mock => {
                        const isGreen = mock.category === "milliy_sertifikat";
                        return (
                            <Link key={mock.id} href={`/mocks/${mock.id}`}
                                className="flex flex-col rounded-xl p-5 transition-all duration-150 group"
                                style={{ background: "#111", border: "1px solid #1f1f1f" }}
                                onMouseEnter={e => (e.currentTarget.style.borderColor = "#2a2a2a")}
                                onMouseLeave={e => (e.currentTarget.style.borderColor = "#1f1f1f")}>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                                        style={{ background: "#1a1a1a" }}>
                                        <ClipboardList className="w-4 h-4" style={{ color: "#737373" }} />
                                    </div>
                                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                                        style={isGreen
                                            ? { background: "#0d2010", color: "#22c55e", border: "1px solid #163d1e" }
                                            : { background: "#0c1829", color: "#38bdf8", border: "1px solid #1a3a5c" }}>
                                        {isGreen ? "Milliy Sertifikat" : "DTM"}
                                    </span>
                                </div>
                                <h3 className="font-bold text-[16px] text-white mb-1">{mock.title}</h3>
                                <p className="text-[13px] mb-4" style={{ color: "#737373" }}>{mock.description}</p>
                                <div className="flex items-center gap-4 text-[12px] mt-auto" style={{ color: "#525252" }}>
                                    <div className="flex items-center gap-1.5">
                                        <BookOpen className="w-3.5 h-3.5" />
                                        <span>55 {language === "uz" ? "savol" : "вопросов"}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{language === "uz" ? "2 soat" : "2 часа"}</span>
                                    </div>
                                    <ChevronRight className="w-3.5 h-3.5 ml-auto transition-colors" style={{ color: "#2a2a2a" }} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
