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
    ChevronUp,
} from "lucide-react";


const SUBJECT_COLORS = [
    "#1C82E0", "#8B5CF6", "#E8568F", "#16A34A",
    "#D97706", "#0D9488", "#E2562F",
];

const mainLinks = (isTeacher: boolean, t: (k: string) => string) => [
    { label: t("nav.home"), href: "/home", icon: LayoutDashboard },
    ...(isTeacher ? [{ label: t("nav.classes"), href: "/classes", icon: GraduationCap }] : []),
    { label: t("nav.statistics"), href: "/statistics", icon: BarChart3 },
    { label: t("nav.achievements"), href: "/achievements", icon: Award },
    { label: t("nav.mocks"), href: "/mocks", icon: ClipboardList },
    { label: t("nav.subjects"), href: "/subjects", icon: BookOpen },
    { label: t("nav.profile"), href: "/profile", icon: CircleUserRound },
];

function Sidebar() {
    const { user } = useAuthStore();
    const { subjects, loaded, setSubjects } = useSubjectsStore();
    const { isOpen, isCollapsed, close, toggleCollapsed } = useSidebarStore();
    const pathname = usePathname();
    const { t, language } = useTranslation();

    useEffect(() => {
        if (!loaded) fetchSubjects().then(setSubjects);
    }, [loaded, setSubjects]);

    useEffect(() => { close(); }, [pathname, close]);

    if (!user) return null;

    const links = mainLinks(user.role === "teacher", t);

    return (
        <>
            {/* Mobile overlay */}
            {isOpen && (
                <div onClick={close} className="fixed inset-0 bg-black/50 z-40 md:hidden" aria-hidden="true" />
            )}

            <aside
                style={{ background: "#0E1217" }}
                className={`
                    fixed left-0 top-0 h-screen flex flex-col z-50
                    overflow-y-auto overflow-x-hidden
                    transition-[width,transform] duration-300 ease-in-out
                    w-64
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                    ${isCollapsed ? "md:w-16 md:translate-x-0" : "md:w-64 md:translate-x-0"}
                `}
            >
                {/* ── Brand ── */}
                <div
                    style={{ borderBottom: "1px solid #1C222B" }}
                    className={`shrink-0 pt-5 pb-4 flex items-center ${isCollapsed ? "md:justify-center md:px-0 px-4 justify-between" : "px-4 justify-between"}`}
                >
                    <Link href="/home" className={`flex items-center gap-3 ${isCollapsed ? "md:hidden" : ""}`} onClick={close}>
                        {/* Gradient K logo */}
                        <div style={{ background: "linear-gradient(150deg, #38BDF8 0%, #6366F1 55%, #C084FC 100%)" }}
                            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0">
                            <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>K</span>
                        </div>
                        <span style={{ color: "#fff", fontWeight: 800, fontSize: 20, letterSpacing: "-.02em" }}>Kulcha</span>
                    </Link>

                    {isCollapsed && (
                        <Link href="/home" className="hidden md:flex items-center justify-center" onClick={close} title="Kulcha">
                            <div style={{ background: "linear-gradient(150deg, #38BDF8 0%, #6366F1 55%, #C084FC 100%)" }}
                                className="w-8 h-8 rounded-[9px] flex items-center justify-center">
                                <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>K</span>
                            </div>
                        </Link>
                    )}

                    <button onClick={close} className="md:hidden p-1.5 rounded-lg transition-colors" style={{ color: "rgba(255,255,255,0.5)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#161C24")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        aria-label={t("sidebar.closeMenu")}>
                        <X size={17} />
                    </button>

                    <button onClick={toggleCollapsed}
                        className={`hidden md:flex p-1.5 rounded-lg transition-colors ${isCollapsed ? "mt-1" : ""}`}
                        style={{ color: "rgba(255,255,255,0.4)" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "#161C24")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        aria-label={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
                        title={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
                    >
                        {isCollapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
                    </button>
                </div>

                {/* ── Main navigation ── */}
                <nav className={`pt-3 pb-1 ${isCollapsed ? "md:px-2 px-2" : "px-2"}`}>
                    <ul className="flex flex-col gap-0.5">
                        {links.map(({ label, href, icon: Icon }) => {
                            const active = pathname === href;
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        title={isCollapsed ? label : undefined}
                                        className={`flex items-center rounded-[11px] text-[15px] font-semibold transition-all duration-100
                                            ${isCollapsed ? "md:justify-center md:px-0 md:py-3 gap-3 px-3 py-2.5" : "gap-3 px-3 py-2.5"}`}
                                        style={{
                                            background: active ? "#161C24" : "transparent",
                                            color: active ? "#fff" : "#6C7686",
                                        }}
                                        onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#161C24"; }}
                                        onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                                    >
                                        <Icon size={19} className="flex-shrink-0" style={{ color: active ? "#fff" : "#6C7686" }} />
                                        <span className={isCollapsed ? "md:hidden" : ""}>{label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* ── AMALIYOT label ── */}
                <div
                    className={`text-[11px] font-bold tracking-[.14em] uppercase pt-5 pb-2 ${isCollapsed ? "md:hidden px-5" : "px-5"}`}
                    style={{ color: "#5A6472" }}
                >
                    {language === "uz" ? "AMALIYOT" : "ПРАКТИКА"}
                </div>

                {/* ── Subjects list ── */}
                <div className={`pb-3 flex-1 ${isCollapsed ? "md:px-2 px-2" : "px-2"}`}>
                    {subjects.length > 0 ? (
                        <ul className="flex flex-col gap-0.5">
                            {subjects.map((subject, idx) => {
                                const active = pathname === `/subject/${subject.id}`;
                                const color = SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
                                return (
                                    <li key={subject.id}>
                                        <Link
                                            href={`/subject/${subject.id}`}
                                            title={isCollapsed ? subject.name : undefined}
                                            className={`flex items-center rounded-[11px] text-[14.5px] font-semibold transition-all duration-100
                                                ${isCollapsed ? "md:justify-center md:px-0 md:py-2.5 gap-3 px-3 py-2" : "gap-3 px-3 py-2"}`}
                                            style={{
                                                background: active ? "#161C24" : "transparent",
                                                color: active ? "#fff" : "#6C7686",
                                            }}
                                            onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#161C24"; }}
                                            onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                                        >
                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                                            <span className={`truncate ${isCollapsed ? "md:hidden" : ""}`}>{subject.name}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <ul className="flex flex-col gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <li key={i} className={`py-2.5 ${isCollapsed ? "md:px-2 px-3" : "px-3"}`}>
                                    <div
                                        className={`h-3.5 rounded animate-pulse ${isCollapsed ? "md:w-5 md:mx-auto" : ""}`}
                                        style={{ width: isCollapsed ? undefined : `${55 + i * 9}%`, animationDelay: `${i * 60}ms`, background: "rgba(255,255,255,0.07)" }}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* ── Upgrade button ── */}
                {!isCollapsed && (
                    <div className="px-2 mb-1">
                        <button
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[11px] transition-all duration-100 font-semibold text-[15px]"
                            style={{ color: "#38BDF8", background: "transparent" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#161C24")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                            <ChevronUp size={19} style={{ color: "#38BDF8" }} />
                            <span>{language === "uz" ? "Pro tarifga" : "На Pro тариф"}</span>
                            <span className="ml-auto text-[11px] font-extrabold px-2 py-0.5 rounded-[7px]"
                                style={{ background: "#FBBF24", color: "#1A1300" }}>25% OFF</span>
                        </button>
                    </div>
                )}

                {/* ── User ── */}
                <div
                    style={{ borderTop: "1px solid #1C222B" }}
                    className={`pt-3 pb-4 mt-1 ${isCollapsed ? "md:px-2 px-2" : "px-2"}`}
                >
                    <div className={`flex items-center rounded-lg py-1.5 px-2 gap-3 ${isCollapsed ? "md:justify-center" : ""}`}>
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
                            style={{ background: "linear-gradient(150deg, #38BDF8, #6366F1)" }}
                            title={isCollapsed ? `${user.name} ${user.surname || ""}` : undefined}
                        >
                            {user.name[0].toUpperCase()}
                        </div>
                        <div className={`flex-1 min-w-0 ${isCollapsed ? "md:hidden" : ""}`}>
                            <p className="text-[13.5px] font-bold truncate leading-tight" style={{ color: "#fff" }}>
                                {user.name} {user.surname || ""}
                            </p>
                        </div>
                        <Link
                            href="/settings"
                            title={t("nav.settings")}
                            className={`flex-shrink-0 p-1 rounded-lg transition-colors ${isCollapsed ? "md:hidden" : ""}`}
                            style={{ color: "#6C7686" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#6C7686")}
                        >
                            <Settings size={17} />
                        </Link>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default memo(Sidebar);
