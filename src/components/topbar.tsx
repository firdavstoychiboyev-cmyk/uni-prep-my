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
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div className="relative w-full max-w-lg rounded-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 bg-card border border-border shadow-2xl"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                            <Search className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                            <input
                                ref={searchInputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && results[0]) handleSelect(results[0].href); }}
                                placeholder={t("search.placeholder")}
                                className="flex-1 bg-transparent text-[14px] font-medium focus:outline-none text-foreground placeholder:text-muted-foreground"
                            />
                            <button onClick={() => setOpenSearch(false)}
                                className={`${BTN} w-7 h-7 rounded-md text-muted-foreground hover:text-foreground transition-colors`}>
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
                            {query.trim().length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground">
                                    <Search className="w-8 h-8 opacity-30" />
                                    <p className="text-sm font-medium">{t("search.prompt")}</p>
                                </div>
                            ) : results.length > 0 ? (
                                <div className="py-1.5">
                                    {results.map((r) => (
                                        <button key={r.id} type="button" onClick={() => handleSelect(r.href)}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-left text-foreground hover:bg-muted transition-colors">
                                            <BookOpen className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
                                            <span className="text-[13.5px] font-medium">{r.label}</span>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center gap-1 py-10 text-muted-foreground">
                                    <p className="text-sm font-medium">{t("search.empty")}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Topbar ── */}
            <div className="sticky top-0 z-40 shrink-0 backdrop-blur-md bg-background/95 border-b border-border">
                <div className="h-[52px] px-4 md:px-5 flex items-center gap-2.5">

                    <button onClick={toggle}
                        className={`${BTN} md:hidden w-8 h-8 rounded-md text-muted-foreground hover:text-foreground transition-colors`}
                        aria-label={t("sidebar.openMenu")}>
                        <Menu className="w-[18px] h-[18px]" />
                    </button>

                    <span className="md:hidden text-[15px] font-bold text-foreground">Kulcha</span>

                    {/* Desktop search */}
                    <button onClick={() => setOpenSearch(true)}
                        className="hidden md:flex items-center gap-2.5 h-8 px-3 rounded-lg w-[min(280px,32vw)] bg-muted border border-border hover:border-foreground/20 transition-colors">
                        <Search className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
                        <span className="text-[13px] text-muted-foreground">{t("search.placeholder")}</span>
                    </button>

                    <div className="flex-1" />

                    {/* Streak badge */}
                    <div className="hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold
                        bg-orange-50 dark:bg-[#1c1100] border border-orange-200 dark:border-[#3d2800]
                        text-orange-600 dark:text-orange-400">
                        <Flame size={12} fill="currentColor" />
                        <span>{streakDays}</span>
                    </div>

                    {/* Stars badge */}
                    <div className="hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold
                        bg-sky-50 dark:bg-[#0c1829] border border-sky-200 dark:border-[#1a3a5c]
                        text-sky-600 dark:text-sky-400">
                        <Star size={12} fill="currentColor" />
                        <span>{totalStars}</span>
                    </div>

                    {/* Language toggle */}
                    <div className="hidden md:flex items-center rounded-full p-0.5 bg-muted border border-border">
                        {(["uz", "ru"] as const).map((lang) => (
                            <button key={lang} onClick={() => setLanguage(lang)}
                                className="rounded-full px-2.5 py-1 text-[11px] font-bold transition-all duration-100"
                                style={{
                                    background: language === lang ? "hsl(var(--foreground))" : "transparent",
                                    color: language === lang ? "hsl(var(--background))" : "hsl(var(--muted-foreground))",
                                }}>
                                {lang.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Mobile search */}
                    <button onClick={() => setOpenSearch(true)}
                        className={`${BTN} md:hidden w-8 h-8 rounded-md text-muted-foreground hover:text-foreground transition-colors`}>
                        <Search className="w-4 h-4" />
                    </button>

                    <ThemeToggle />

                    {/* User dropdown */}
                    <div ref={userRef} className="relative">
                        <button type="button" onClick={() => setOpenUser((v) => !v)}
                            className="flex items-center gap-2 h-8 pl-2 pr-2.5 rounded-lg bg-muted border border-border hover:border-foreground/20 transition-colors">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                                style={{ background: "linear-gradient(150deg, #38BDF8, #6366F1)" }}>
                                {(user.name?.[0] || "U").toUpperCase()}
                            </div>
                            <span className="hidden sm:block text-[12px] font-semibold text-foreground">
                                {user.name}
                            </span>
                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        </button>

                        {openUser && (
                            <div className="absolute right-0 mt-1.5 w-56 rounded-xl overflow-hidden z-10 py-1 bg-card border border-border shadow-xl">
                                <div className="px-3.5 py-2.5 border-b border-border">
                                    <div className="text-[13px] font-semibold text-foreground">
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
                                                    className="px-3.5 py-2.5 flex items-center gap-3 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                                                    <Icon className="w-3.5 h-3.5" />
                                                    <span className="text-[13px] font-medium">{item.label}</span>
                                                </Link>
                                            );
                                        }
                                        return (
                                            <button key={item.label} type="button"
                                                onClick={() => { setOpenUser(false); item.onClick?.(); }}
                                                className="w-full px-3.5 py-2.5 flex items-center gap-3 text-left text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
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
