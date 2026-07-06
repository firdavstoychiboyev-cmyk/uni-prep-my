"use client";
import { useEffect, useState } from "react";
import {
    collection, getDocs, query, where,
    doc, getDoc, writeBatch, arrayUnion,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
    Clock, BookOpen, ChevronRight, ClipboardList,
    CheckCircle2, KeyRound, Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { MockResult, MockCode } from "@/lib/firestore-schema";

interface Mock {
    id: string;
    title: string;
    description?: string;
    category?: string;
    questions?: unknown[];
    active?: boolean;
}

type MockCategory = "all" | "milliy_sertifikat" | "dtm" | "kod_orqali";

export default function MocksPage() {
    const { t, language } = useTranslation();
    const router = useRouter();
    const { user } = useAuthStore();

    const [mocks, setMocks] = useState<Mock[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<MockCategory>("all");
    const [results, setResults] = useState<Record<string, MockResult>>({});

    // ── Kod orqali state ──────────────────────────────────────────────────────
    const [codeInput, setCodeInput] = useState("");
    const [codeError, setCodeError] = useState<string | null>(null);
    const [codeChecking, setCodeChecking] = useState(false);
    const [redeemedMocks, setRedeemedMocks] = useState<Mock[]>([]);
    const [redeemedLoading, setRedeemedLoading] = useState(false);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const snap = await getDocs(query(
                collection(db, "mocks"),
                where("language", "==", language),
                where("active", "==", true),
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

    // Load the user's previously redeemed mocks whenever the tab becomes active.
    useEffect(() => {
        if (!user || activeCategory !== "kod_orqali") return;
        setRedeemedLoading(true);
        getDocs(collection(db, "users", user.id, "redeemedMocks"))
            .then(async snap => {
                const mockIds = snap.docs.map(d => d.id);
                if (mockIds.length === 0) {
                    setRedeemedMocks([]);
                    return;
                }
                const mockDocs = await Promise.all(
                    mockIds.map(id => getDoc(doc(db, "mocks", id))),
                );
                setRedeemedMocks(
                    mockDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() } as Mock)),
                );
            })
            .catch(() => {})
            .finally(() => setRedeemedLoading(false));
    }, [user, activeCategory]);

    // ── Code redemption ───────────────────────────────────────────────────────
    const handleRedeem = async () => {
        if (!user || !codeInput.trim()) return;
        const code = codeInput.trim().toUpperCase();
        setCodeError(null);
        setCodeChecking(true);
        try {
            const codeSnap = await getDoc(doc(db, "mockCodes", code));
            if (!codeSnap.exists()) {
                setCodeError(t("mockCodes.invalid"));
                return;
            }
            const data = codeSnap.data() as MockCode;

            // Single-use already consumed
            if (!data.reusable && data.usedBy.length >= 1) {
                setCodeError(t("mockCodes.alreadyUsed"));
                return;
            }
            // maxUses cap reached
            if (data.maxUses !== null && data.usedBy.length >= data.maxUses) {
                setCodeError(t("mockCodes.limitReached"));
                return;
            }
            // User already redeemed this code → just navigate
            const alreadySnap = await getDoc(
                doc(db, "users", user.id, "redeemedMocks", data.mockId),
            );
            if (alreadySnap.exists()) {
                router.push(`/mocks/${data.mockId}`);
                return;
            }

            // Atomically: append uid to usedBy AND record redemption for this user
            const batch = writeBatch(db);
            batch.update(doc(db, "mockCodes", code), {
                usedBy: arrayUnion(user.id),
            });
            batch.set(doc(db, "users", user.id, "redeemedMocks", data.mockId), {
                code,
                redeemedAt: new Date().toISOString(),
            });
            await batch.commit();
            router.push(`/mocks/${data.mockId}`);
        } catch {
            setCodeError(t("mockCodes.invalid"));
        } finally {
            setCodeChecking(false);
        }
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const filtered =
        activeCategory === "all" ? mocks
        : activeCategory === "kod_orqali" ? []   // handled separately
        : mocks.filter(m => m.category === activeCategory);

    // Shared mock card — badge prop overrides the default category badge.
    const MockCard = ({ mock, badge }: { mock: Mock; badge?: React.ReactNode }) => {
        const isGreen = mock.category === "milliy_sertifikat";
        return (
            <Link
                key={mock.id}
                href={`/mocks/${mock.id}`}
                className="flex flex-col rounded-xl p-5 transition-all duration-150 group bg-card border border-border hover:border-foreground/20"
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-muted">
                        <ClipboardList className="w-4 h-4 text-muted-foreground" />
                    </div>
                    {badge ?? (
                        <span
                            className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                            style={
                                isGreen
                                    ? { background: "#0d2010", color: "#22c55e", border: "1px solid #163d1e" }
                                    : { background: "#0c1829", color: "#38bdf8", border: "1px solid #1a3a5c" }
                            }
                        >
                            {isGreen ? "Milliy Sertifikat" : "DTM"}
                        </span>
                    )}
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
                                onClick={e => {
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
                    <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-40" />
                </div>
            </Link>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1
                    className="text-[28px] font-extrabold text-foreground"
                    style={{ letterSpacing: "-.02em" }}
                >
                    {language === "uz" ? "Mock Testlar" : "Мок Тесты"}
                </h1>
                <p className="text-[14px] mt-1 text-muted-foreground">
                    {language === "uz"
                        ? "Milliy sertifikat va DTM imtihonlariga tayyorlanish uchun mock testlar"
                        : "Мок тесты для подготовки к национальному сертификату и ДТМ"}
                </p>
            </div>

            {/* Tab bar */}
            <div className="flex flex-wrap gap-2">
                {(["all", "milliy_sertifikat", "dtm", "kod_orqali"] as const).map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all duration-100 ${
                            activeCategory === cat
                                ? "bg-foreground text-background"
                                : "text-muted-foreground border border-border hover:border-foreground/20"
                        }`}
                    >
                        {cat === "all"
                            ? (language === "uz" ? "Barchasi" : "Все")
                            : cat === "milliy_sertifikat"
                            ? (language === "uz" ? "Milliy Sertifikat" : "Национальный Сертификат")
                            : cat === "dtm"
                            ? "DTM"
                            : t("mockCodes.tab")}
                    </button>
                ))}
            </div>

            {/* ── Kod orqali tab ── */}
            {activeCategory === "kod_orqali" ? (
                <div className="flex flex-col gap-6">
                    {/* Code entry card */}
                    <div className="rounded-xl border border-border bg-card p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-2.5">
                            <KeyRound className="w-5 h-5 text-muted-foreground" />
                            <h2 className="font-bold text-foreground">
                                {language === "uz"
                                    ? "Mock test kodini kiriting"
                                    : "Введите код мок-теста"}
                            </h2>
                        </div>
                        <p className="text-[13px] text-muted-foreground">
                            {language === "uz"
                                ? "Admin tomonidan berilgan maxsus kodni kiriting"
                                : "Введите специальный код, выданный администратором"}
                        </p>
                        <div className="flex gap-2">
                            <input
                                value={codeInput}
                                onChange={e => {
                                    setCodeInput(e.target.value.toUpperCase());
                                    setCodeError(null);
                                }}
                                placeholder={t("mockCodes.placeholder")}
                                className="flex-1 bg-muted border border-border rounded-lg p-3 font-mono uppercase tracking-wider focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
                                onKeyDown={e => { if (e.key === "Enter") void handleRedeem(); }}
                                autoComplete="off"
                                spellCheck={false}
                            />
                            <button
                                onClick={() => void handleRedeem()}
                                disabled={codeChecking || !codeInput.trim()}
                                className="px-5 py-3 rounded-lg bg-foreground text-background font-semibold hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-40"
                            >
                                {codeChecking
                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                    : t("mockCodes.submit")}
                            </button>
                        </div>
                        {codeError && (
                            <div
                                role="alert"
                                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                            >
                                {codeError}
                            </div>
                        )}
                    </div>

                    {/* Previously redeemed mocks */}
                    {user && (
                        redeemedLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {[1, 2].map(n => (
                                    <div key={n} className="h-44 rounded-xl animate-pulse bg-muted" />
                                ))}
                            </div>
                        ) : redeemedMocks.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                <p className="text-[12px] font-bold text-muted-foreground uppercase tracking-widest">
                                    {t("mockCodes.redeemed")}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {redeemedMocks.map(mock => (
                                        <MockCard
                                            key={mock.id}
                                            mock={mock}
                                            badge={
                                                <span
                                                    className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                                                    style={{
                                                        background: "#1a0f2e",
                                                        color: "#a78bfa",
                                                        border: "1px solid #3d1f7a",
                                                    }}
                                                >
                                                    {t("mockCodes.badge")}
                                                </span>
                                            }
                                        />
                                    ))}
                                </div>
                            </div>
                        ) : null
                    )}
                </div>

            ) : loading ? (
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
                    {filtered.map(mock => (
                        <MockCard key={mock.id} mock={mock} />
                    ))}
                </div>
            )}
        </div>
    );
}
