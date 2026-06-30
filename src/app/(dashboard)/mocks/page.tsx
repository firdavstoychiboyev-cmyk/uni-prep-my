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

    const filtered = activeCategory === "all"
        ? mocks
        : mocks.filter(m => m.category === activeCategory);

    return (
        <div className="max-w-4xl mx-auto px-6 py-8">
            <div className="mb-8">
                <h1 className="text-[28px] font-extrabold" style={{ color: "#0E1419", letterSpacing: "-.02em" }}>
                    {language === "uz" ? "Mock Testlar" : "Мок Тесты"}
                </h1>
                <p className="text-[14px] mt-1" style={{ color: "#6B7480" }}>
                    {language === "uz"
                        ? "Milliy sertifikat va DTM imtihonlariga tayyorlanish uchun mock testlar"
                        : "Мок тесты для подготовки к национальному сертификату и ДТМ"}
                </p>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {(["all", "milliy_sertifikat", "dtm"] as const).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className="px-4 py-2 rounded-full text-[13.5px] font-bold transition-all duration-150"
                        style={activeCategory === cat
                            ? { background: "#0E1217", color: "#fff", border: "1px solid #0E1217" }
                            : { background: "#fff", color: "#44505E", border: "1px solid #EAEDF0" }}
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
                    {filtered.map(mock => {
                        const isGreen = mock.category === "milliy_sertifikat";
                        return (
                        <Link
                            key={mock.id}
                            href={`/mocks/${mock.id}`}
                            className="flex flex-col rounded-[18px] p-6 transition-all duration-150 group"
                            style={{ background: "#fff", border: "1px solid #EAEDF0" }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#D7DCE2"; (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 26px rgba(14,20,25,.06)"; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#EAEDF0"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-10 h-10 rounded-[11px] flex items-center justify-center" style={{ background: "#E7F2FE" }}>
                                    <ClipboardList className="w-5 h-5" style={{ color: "#1C82E0" }} />
                                </div>
                                <span className="text-[12px] font-bold px-2.5 py-1 rounded-[8px]"
                                    style={isGreen
                                        ? { background: "#E6F7EC", color: "#16A34A" }
                                        : { background: "#E7F2FE", color: "#1C82E0" }}>
                                    {isGreen ? "Milliy Sertifikat" : "DTM"}
                                </span>
                            </div>
                            <h3 className="font-extrabold text-[17px] mb-1.5" style={{ color: "#0E1419" }}>
                                {mock.title}
                            </h3>
                            <p className="text-[13.5px] mb-4" style={{ color: "#6B7480" }}>{mock.description}</p>
                            <div className="flex items-center gap-4 text-[13px] mt-auto" style={{ color: "#98A1AC" }}>
                                <div className="flex items-center gap-1.5">
                                    <BookOpen className="w-4 h-4" />
                                    <span>55 {language === "uz" ? "savol" : "вопросов"}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-4 h-4" />
                                    <span>{language === "uz" ? "2 soat" : "2 часа"}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 ml-auto transition-colors group-hover:text-foreground" />
                            </div>
                        </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
