"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, LogOut, User2, GraduationCap, Shield, Menu, X, BookOpen, Flame, Star } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubjectsStore } from "@/store/useSubjectsStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { logOut } from "@/lib/auth-utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

type MenuItem = {
    label: string;
    href?: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick?: () => void;
    visible?: boolean;
};

const BTN = "flex items-center justify-center transition-colors duration-100";

export default function Topbar() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { subjects } = useSubjectsStore();
    const { toggle } = useSidebarStore();
    const { language, setLanguage } = useLanguageStore();
    const { t } = useTranslation();

    const [query, setQuery] = useState("");
    const [openSearch, setOpenSearch] = useState(false);
    const [openUser, setOpenUser] = useState(false);
    const [streakDays, setStreakDays] = useState(0);
    const [totalStars, setTotalStars] = useState(0);

    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const userRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!user) return;
        getDoc(doc(db, "users", user.id)).then((snap) => {
            const data = snap.data();
            setStreakDays(data?.streakDays ?? 0);
            setTotalStars(data?.totalStars ?? data?.totalCorrect ?? 0);
        });
    }, [user]);

    useEffect(() => {
        if (!openUser) return;
        const handler = (e: MouseEvent) => {
            if (!(e.target instanceof Node)) return;
            if (userRef.current && !userRef.current.contains(e.target)) setOpenUser(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [openUser]);

    useEffect(() => {
        if (openSearch) setTimeout(() => searchInputRef.current?.focus(), 30);
        else setQuery("");
    }, [openSearch]);

    useEffect(() => {
        if (!openSearch) return;
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenSearch(false); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [openSearch]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 1) return [];
        return subjects
            .filter((s) => s.name.toLowerCase().includes(q))
            .slice(0, 8)
            .map((s) => ({ id: s.id, label: s.name, href: `/subject/${s.id}` }));
    }, [query, subjects]);

    const userMenu: MenuItem[] = [
        { label: t("topbar.account"), href: "/profile", icon: User2, visible: true },
        { label: t("nav.classes"), href: "/classes", icon: GraduationCap, visible: user?.role === "teacher" },
        { label: t("nav.admin"), href: "/admin", icon: Shield, visible: user?.role === "admin" },
        {
            label: t("nav.logout"),
            icon: LogOut,
            visible: true,
            onClick: async () => { await logOut(); router.push("/login"); },
        },
    ].filter((i) => i.visible);

    const handleSelect = (href: string) => { router.push(href); setOpenSearch(false); };

    if (!user) return null;

    return (
        <>
            {/* ── Search Modal ── */}
            {openSearch && (
                <div className="fixed inset-0 z-[200] flex items-start justify-center px-4 pt-[10vh] pb-8"
                    onClick={() => setOpenSearch(false)}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div className="relative w-full max-w-lg rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                        style={{ background: "#111", border: "1px solid #2a2a2a" }}
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid #1f1f1f" }}>
                            <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#525252" }} />
                            <input
                                ref={searchInputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && results[0]) handleSelect(results[0].href); }}
                                placeholder={t("search.placeholder")}
                                className="flex-1 bg-transparent text-[14px] font-medium focus:outline-none"
                                style={{ color: "#fff" }}
                            />
                            <button onClick={() => setOpenSearch(false)}
                                className={`${BTN} w-7 h-7 rounded-md`}
                                style={{ color: "#525252" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                                onMouseLeave={e => (e.currentTarget.style.color = "#525252")}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
                            {query.trim().length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-10"
                                    style={{ color: "#525252" }}>
                                    <Search className="w-8 h-8 opacity-30" />
                                    <p className="text-sm font-medium">{t("search.prompt")}</p>
                                </div>
                            ) : results.length > 0 ? (
                                <div className="py-1.5">
                                    {results.map((r) => (
                                        <button key={r.id} type="button" onClick={() => handleSelect(r.href)}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                                            style={{ color: "#d4d4d4" }}
                                            onMouseEnter={e => (e.currentTarget.style.background = "#1a1a1a")}
                                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                                            <BookOpen className="w-4 h-4 flex-shrink-0" style={{ color: "#525252" }} />
                                            <span className="text-[13.5px] font-medium">{r.label}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-1 py-10" style={{ color: "#525252" }}>
                                    <p className="text-sm font-medium">{t("search.empty")}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Topbar ── */}
            <div className="sticky top-0 z-40 shrink-0 backdrop-blur-md"
                style={{ background: "rgba(10,10,10,0.92)", borderBottom: "1px solid #1c1c1c" }}>
                <div className="h-[52px] px-4 md:px-5 flex items-center gap-2.5">

                    <button onClick={toggle} className={`${BTN} md:hidden w-8 h-8 rounded-md`}
                        style={{ color: "#737373" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#737373")}
                        aria-label={t("sidebar.openMenu")}>
                        <Menu className="w-4.5 h-4.5" />
                    </button>

                    <span className="md:hidden text-[15px] font-bold" style={{ color: "#fff" }}>Kulcha</span>

                    {/* Desktop search */}
                    <button onClick={() => setOpenSearch(true)}
                        className="hidden md:flex items-center gap-2.5 h-8 px-3 rounded-lg w-[min(280px,32vw)] transition-colors"
                        style={{ background: "#141414", border: "1px solid #1f1f1f" }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a")}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "#1f1f1f")}>
                        <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#525252" }} />
                        <span className="text-[13px]" style={{ color: "#525252" }}>{t("search.placeholder")}</span>
                    </button>

                    <div className="flex-1" />

                    {/* Streak */}
                    <div className="hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold"
                        style={{ background: "#1c1100", border: "1px solid #3d2800", color: "#fb923c" }}>
                        <Flame size={12} fill="#fb923c" style={{ color: "#fb923c" }} />
                        <span>{streakDays}</span>
                    </div>

                    {/* Stars */}
                    <div className="hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold"
                        style={{ background: "#0c1829", border: "1px solid #1a3a5c", color: "#38bdf8" }}>
                        <Star size={12} fill="#38bdf8" style={{ color: "#38bdf8" }} />
                        <span>{totalStars}</span>
                    </div>

                    {/* Language toggle */}
                    <div className="hidden md:flex items-center rounded-full p-0.5"
                        style={{ background: "#141414", border: "1px solid #1f1f1f" }}>
                        {(["uz", "ru"] as const).map((lang) => (
                            <button key={lang} onClick={() => setLanguage(lang)}
                                className="rounded-full px-2.5 py-1 text-[11px] font-bold transition-all duration-100"
                                style={{
                                    background: language === lang ? "#fff" : "transparent",
                                    color: language === lang ? "#000" : "#525252",
                                }}>
                                {lang.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Mobile search */}
                    <button onClick={() => setOpenSearch(true)}
                        className={`${BTN} md:hidden w-8 h-8 rounded-md`}
                        style={{ color: "#737373" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#737373")}>
                        <Search className="w-4 h-4" />
                    </button>

                    <ThemeToggle />

                    {/* User */}
                    <div ref={userRef} className="relative">
                        <button type="button" onClick={() => setOpenUser((v) => !v)}
                            className="flex items-center gap-2 h-8 pl-2 pr-2.5 rounded-lg transition-colors"
                            style={{ background: "#141414", border: "1px solid #1f1f1f" }}
                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "#2a2a2a")}
                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = "#1f1f1f")}>
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                                style={{ background: "linear-gradient(150deg, #38BDF8, #6366F1)" }}>
                                {(user.name?.[0] || "U").toUpperCase()}
                            </div>
                            <span className="hidden sm:block text-[12px] font-semibold" style={{ color: "#d4d4d4" }}>
                                {user.name}
                            </span>
                            <ChevronDown className="w-3 h-3" style={{ color: "#525252" }} />
                        </button>

                        {openUser && (
                            <div className="absolute right-0 mt-1.5 w-56 rounded-xl overflow-hidden z-10 py-1"
                                style={{ background: "#111", border: "1px solid #1f1f1f", boxShadow: "0 20px 40px rgba(0,0,0,0.6)" }}>
                                <div className="px-3.5 py-2.5" style={{ borderBottom: "1px solid #1f1f1f" }}>
                                    <div className="text-[13px] font-semibold" style={{ color: "#fff" }}>
                                        {user.name} {user.surname || ""}
                                    </div>
                                </div>
                                <div className="py-1">
                                    {userMenu.map((item) => {
                                        const Icon = item.icon;
                                        if (item.href) {
                                            return (
                                                <Link key={item.label} href={item.href}
                                                    onClick={() => setOpenUser(false)}
                                                    className="px-3.5 py-2.5 flex items-center gap-3 transition-colors"
                                                    style={{ color: "#a3a3a3" }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#1a1a1a"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#a3a3a3"; }}>
                                                    <Icon className="w-3.5 h-3.5" />
                                                    <span className="text-[13px] font-medium">{item.label}</span>
                                                </Link>
                                            );
                                        }
                                        return (
                                            <button key={item.label} type="button"
                                                onClick={() => { setOpenUser(false); item.onClick?.(); }}
                                                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-left transition-colors"
                                                style={{ color: "#a3a3a3" }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#1a1a1a"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#a3a3a3"; }}>
                                                <Icon className="w-3.5 h-3.5" />
                                                <span className="text-[13px] font-medium">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
