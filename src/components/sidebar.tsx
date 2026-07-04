"use client";

import { memo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubjectsStore } from "@/store/useSubjectsStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { fetchSubjects } from "@/lib/data-fetching";
import { useTranslation } from "@/lib/i18n/useTranslation";
import {
    LayoutDashboard,
    Award,
    CircleUserRound,
    GraduationCap,
    BarChart3,
    BookOpen,
    Settings,
    X,
    PanelLeftClose,
    PanelLeft,
    ClipboardList,
    Landmark,
    Target,
} from "lucide-react";

const SUBJECT_DOT_COLORS = [
    "#3B82F6", "#8B5CF6", "#EC4899", "#10B981",
    "#F59E0B", "#14B8A6", "#EF4444", "#6366F1",
];

const mainLinks = (isTeacher: boolean, isStudent: boolean, isRegistan: boolean, t: (k: string) => string) => [
    { label: t("nav.home"), href: "/home", icon: LayoutDashboard },
    ...(isTeacher ? [{ label: t("nav.classes"), href: "/classes", icon: GraduationCap }] : []),
    { label: t("nav.statistics"), href: "/statistics", icon: BarChart3 },
    { label: t("nav.achievements"), href: "/achievements", icon: Award },
    ...(isStudent ? [{ label: t("nav.mistakes"), href: "/mistakes", icon: Target }] : []),
    { label: t("nav.mocks"), href: "/mocks", icon: ClipboardList },
    { label: t("nav.subjects"), href: "/subjects", icon: BookOpen },
    ...(isRegistan ? [{ label: "Registan", href: "/registan", icon: Landmark }] : []),
    { label: t("nav.profile"), href: "/profile", icon: CircleUserRound },
];

function Sidebar() {
    const { user } = useAuthStore();
    const { subjects, setSubjects } = useSubjectsStore();
    const { isOpen, isCollapsed, close, toggleCollapsed } = useSidebarStore();
    const pathname = usePathname();
    const { t, language } = useTranslation();

    // Перезагружаем и при смене языка: fetchSubjects фильтрует по текущему
    // языку на момент вызова, иначе список остаётся на старом языке
    useEffect(() => {
        fetchSubjects().then(setSubjects).catch(() => {});
    }, [language, setSubjects]);

    useEffect(() => { close(); }, [pathname, close]);

    const links = mainLinks(user?.role === "teacher", user?.role === "student", user?.organization === "registan", t);

    return (
        <>
            {isOpen && (
                <div onClick={close} className="fixed inset-0 bg-black/70 z-40 md:hidden" aria-hidden="true" />
            )}

            <aside
                className={`
                    fixed left-0 top-0 h-screen flex flex-col z-50
                    overflow-y-auto overflow-x-hidden
                    transition-[width,transform] duration-300 ease-in-out
                    w-64
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                    ${isCollapsed ? "md:w-[58px] md:translate-x-0" : "md:w-64 md:translate-x-0"}
                `}
                style={{ background: "#0a0a0a", borderRight: "1px solid #1c1c1c" }}
            >
                {/* ── Brand ── */}
                <div className={`shrink-0 h-14 flex items-center justify-between border-b px-4`}
                    style={{ borderColor: "#1c1c1c" }}>
                    <Link href="/home"
                        className={`flex items-center gap-2.5 ${isCollapsed ? "md:hidden" : ""}`}
                        onClick={close}>
                        <div
                            className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0"
                            style={{ background: "linear-gradient(150deg, #38BDF8 0%, #6366F1 55%, #C084FC 100%)" }}>
                            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>K</span>
                        </div>
                        <span style={{ color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "-.01em" }}>Kulcha</span>
                    </Link>

                    {isCollapsed && (
                        <Link href="/home" className="hidden md:flex" onClick={close}>
                            <div className="w-7 h-7 rounded-[8px] flex items-center justify-center"
                                style={{ background: "linear-gradient(150deg, #38BDF8 0%, #6366F1 55%, #C084FC 100%)" }}>
                                <span style={{ color: "#fff", fontWeight: 800, fontSize: 13 }}>K</span>
                            </div>
                        </Link>
                    )}

                    <div className="flex items-center gap-1">
                        <button onClick={close} className="md:hidden p-1.5 rounded-md transition-colors"
                            style={{ color: "#525252" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#525252")}
                            aria-label={t("sidebar.closeMenu")}>
                            <X size={16} />
                        </button>
                        <button onClick={toggleCollapsed}
                            className={`hidden md:flex p-1.5 rounded-md transition-colors ${isCollapsed ? "mx-auto" : ""}`}
                            style={{ color: "#525252" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#525252")}
                            title={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}>
                            {isCollapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
                        </button>
                    </div>
                </div>

                {/* ── Main nav ── */}
                <nav className="pt-2 px-2">
                    <ul className="flex flex-col gap-0.5">
                        {links.map(({ label, href, icon: Icon }) => {
                            const active = pathname === href;
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        title={isCollapsed ? label : undefined}
                                        className={`flex items-center rounded-md text-[13.5px] font-medium transition-colors duration-100
                                            ${isCollapsed ? "md:justify-center md:px-0 md:py-2.5 gap-3 px-3 py-2" : "gap-3 px-3 py-2"}`}
                                        style={{
                                            background: active ? "#1f1f1f" : "transparent",
                                            color: active ? "#fff" : "#737373",
                                        }}
                                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#141414"; }}
                                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                                    >
                                        <Icon size={17} className="flex-shrink-0"
                                            style={{ color: active ? "#fff" : "#525252" }} />
                                        <span className={isCollapsed ? "md:hidden" : ""}>{label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* ── AMALIYOT label ── */}
                <div className={`text-[10px] font-bold tracking-[.18em] uppercase pt-5 pb-1.5 ${isCollapsed ? "md:hidden px-5" : "px-5"}`}
                    style={{ color: "#3a3a3a" }}>
                    {language === "uz" ? "AMALIYOT" : "ПРАКТИКА"}
                </div>

                {/* ── Subject list ── */}
                <div className={`pb-3 flex-1 ${isCollapsed ? "md:px-2 px-2" : "px-2"}`}>
                    {subjects.length > 0 ? (
                        <ul className="flex flex-col gap-0.5">
                            {subjects.map((subject, idx) => {
                                const active = pathname === `/subject/${subject.id}`;
                                const dotColor = SUBJECT_DOT_COLORS[idx % SUBJECT_DOT_COLORS.length];
                                return (
                                    <li key={subject.id}>
                                        <Link
                                            href={`/subject/${subject.id}`}
                                            title={isCollapsed ? subject.name : undefined}
                                            className={`flex items-center rounded-md text-[13px] font-medium transition-colors duration-100
                                                ${isCollapsed ? "md:justify-center md:px-0 md:py-2 gap-3 px-3 py-1.5" : "gap-3 px-3 py-1.5"}`}
                                            style={{
                                                background: active ? "#1f1f1f" : "transparent",
                                                color: active ? "#fff" : "#737373",
                                            }}
                                            onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#141414"; }}
                                            onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                                style={{ background: dotColor }} />
                                            <span className={`truncate ${isCollapsed ? "md:hidden" : ""}`}>{subject.name}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <ul className="flex flex-col gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <li key={i} className="px-3 py-2">
                                    <div className="h-3 rounded animate-pulse"
                                        style={{ width: `${55 + i * 9}%`, background: "#1a1a1a", animationDelay: `${i * 60}ms` }} />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* ── Bottom: user + settings ── */}
                {user && (
                    <div className="shrink-0 border-t px-2 py-3" style={{ borderColor: "#1c1c1c" }}>
                        <div className={`flex items-center gap-3 px-2 py-2 rounded-md ${isCollapsed ? "md:justify-center md:px-0" : ""}`}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0 text-white"
                                style={{ background: "linear-gradient(150deg, #38BDF8, #6366F1)" }}
                                title={isCollapsed ? `${user.name} ${user.surname || ""}` : undefined}>
                                {user.name[0].toUpperCase()}
                            </div>
                            <div className={`flex-1 min-w-0 ${isCollapsed ? "md:hidden" : ""}`}>
                                <p className="text-[13px] font-semibold truncate" style={{ color: "#e0e0e0" }}>
                                    {user.name} {user.surname || ""}
                                </p>
                                {user.organization === "registan" && (
                                    <p className="flex items-center gap-1 text-[10px] font-bold truncate text-violet-400">
                                        <Landmark size={9} /> Registan
                                    </p>
                                )}
                            </div>
                            <Link href="/settings"
                                title={t("nav.settings")}
                                className={`flex-shrink-0 p-1 rounded transition-colors ${isCollapsed ? "md:hidden" : ""}`}
                                style={{ color: "#525252" }}
                                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                                onMouseLeave={e => (e.currentTarget.style.color = "#525252")}>
                                <Settings size={15} />
                            </Link>
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
}

export default memo(Sidebar);
