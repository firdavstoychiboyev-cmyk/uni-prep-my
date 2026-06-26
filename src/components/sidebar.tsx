"use client";

import { memo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
    Calculator,
    Atom,
    FlaskConical,
    Leaf,
    Landmark,
    Globe,
    BookOpen,
    Languages,
    Monitor,
    Users,
    Dumbbell,
    Music,
    Palette,
    BookMarked,
    Settings,
    X,
    PanelLeftClose,
    PanelLeft,
    type LucideIcon,
} from "lucide-react";

function getSubjectIcon(name: string): LucideIcon {
    const n = name.toLowerCase();
    if (n.includes("матем")) return Calculator;
    if (n.includes("физик")) return Atom;
    if (n.includes("хими")) return FlaskConical;
    if (n.includes("биол")) return Leaf;
    if (n.includes("истор")) return Landmark;
    if (n.includes("географ")) return Globe;
    if (n.includes("литерат")) return BookMarked;
    if (n.includes("англ") || n.includes("русск") || n.includes("язык")) return Languages;
    if (n.includes("информ")) return Monitor;
    if (n.includes("общест")) return Users;
    if (n.includes("физкульт") || n.includes("спорт")) return Dumbbell;
    if (n.includes("музык")) return Music;
    if (n.includes("рисов") || n.includes("изо") || n.includes("черчен")) return Palette;
    return BookOpen;
}

const mainLinks = (isTeacher: boolean) => [
    { nameKey: "nav.home", href: "/home", icon: LayoutDashboard },
    ...(isTeacher ? [{ nameKey: "nav.classes", href: "/classes", icon: GraduationCap }] : []),
    { nameKey: "nav.statistics", href: "/statistics", icon: BarChart3 },
    { nameKey: "nav.achievements", href: "/achievements", icon: Award },
    { nameKey: "nav.subjects", href: "/subjects", icon: BookOpen },
    { nameKey: "nav.profile", href: "/profile", icon: CircleUserRound },
];

function Sidebar() {
    const { user } = useAuthStore();
    const { subjects, loaded, setSubjects } = useSubjectsStore();
    const { isOpen, isCollapsed, close, toggleCollapsed } = useSidebarStore();
    const pathname = usePathname();
    const { t } = useTranslation();

    useEffect(() => {
        if (!loaded) fetchSubjects().then(setSubjects);
    }, [loaded, setSubjects]);

    useEffect(() => { close(); }, [pathname, close]);

    if (!user) return null;

    const links = mainLinks(user.role === "teacher");

    return (
        <>
            {/* Overlay — mobile only */}
            {isOpen && (
                <div onClick={close} className="fixed inset-0 bg-black/40 z-40 md:hidden" aria-hidden="true" />
            )}

            <aside
                className={`
                    fixed left-0 top-0 h-screen bg-background border-r border-border flex flex-col z-50
                    overflow-y-auto overflow-x-hidden
                    transition-[width,transform] duration-300 ease-in-out
                    w-64
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                    ${isCollapsed ? "md:w-16 md:translate-x-0" : "md:w-64 md:translate-x-0"}
                `}
            >
                {/* ── Logo ── */}
                <div className={`shrink-0 pt-4 pb-3 flex items-center border-b border-border ${isCollapsed ? "md:justify-center md:px-0 px-5 justify-between" : "px-5 justify-between"}`}>
                    {/* Full logo — hidden when collapsed on desktop */}
                    <Link href="/home" className={`flex items-center gap-3 ${isCollapsed ? "md:hidden" : ""}`} onClick={close}>
                        <div className="relative w-10 h-10 flex-shrink-0">
                            <Image src="/gogg.png" alt="UniPrep" fill className="object-contain" priority />
                        </div>
                        <span className="text-lg font-extrabold tracking-tight text-foreground">UniPrep</span>
                    </Link>

                    {/* Collapsed: just the logo icon */}
                    {isCollapsed && (
                        <Link href="/home" className="hidden md:flex items-center justify-center" onClick={close} title="UniPrep">
                            <div className="relative w-8 h-8 flex-shrink-0">
                                <Image src="/gogg.png" alt="UniPrep" fill className="object-contain" priority />
                            </div>
                        </Link>
                    )}

                    {/* Mobile: close drawer */}
                    <button onClick={close} className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label={t("sidebar.closeMenu")}>
                        <X size={18} className="text-muted-foreground" />
                    </button>

                    {/* Desktop: collapse/expand toggle */}
                    <button
                        onClick={toggleCollapsed}
                        className={`hidden md:flex p-1.5 rounded-lg hover:bg-muted transition-colors ${isCollapsed ? "mt-2" : ""}`}
                        aria-label={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
                        title={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
                    >
                        {isCollapsed
                            ? <PanelLeft size={16} className="text-muted-foreground" />
                            : <PanelLeftClose size={16} className="text-muted-foreground" />
                        }
                    </button>
                </div>

                {/* ── Main navigation ── */}
                <nav className={`pt-3 pb-2 ${isCollapsed ? "md:px-2 px-3" : "px-3"}`}>
                    <ul className="flex flex-col gap-0.5">
                        {links.map(({ nameKey, href, icon: Icon }) => {
                            const active = pathname === href;
                            const name = t(nameKey);
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        title={isCollapsed ? name : undefined}
                                        className={`flex items-center rounded-lg text-[13.5px] font-medium transition-colors duration-100
                                            ${isCollapsed ? "md:justify-center md:px-0 md:py-2.5 gap-3 px-3 py-2.5" : "gap-3 px-3 py-2.5"}
                                            ${active ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                                    >
                                        <Icon
                                            size={18}
                                            className={`flex-shrink-0 transition-colors duration-100 ${active ? "text-foreground" : "text-muted-foreground"}`}
                                        />
                                        <span className={isCollapsed ? "md:hidden" : ""}>{name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* ── Divider ── */}
                <div className="mx-3 my-1 border-t border-border" />

                {/* ── Subjects ── */}
                <div className={`pt-2 pb-3 flex-1 ${isCollapsed ? "md:px-2 px-3" : "px-3"}`}>
                    <p className={`text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 ${isCollapsed ? "md:hidden px-3" : "px-3"}`}>
                        {t("nav.subjects")}
                    </p>
                    {subjects.length > 0 ? (
                        <ul className="flex flex-col gap-0.5">
                            {subjects.map((subject) => {
                                const active = pathname === `/subject/${subject.id}`;
                                const Icon = getSubjectIcon(subject.name);
                                return (
                                    <li key={subject.id}>
                                        <Link
                                            href={`/subject/${subject.id}`}
                                            title={isCollapsed ? subject.name : undefined}
                                            className={`flex items-center rounded-lg text-[13px] font-medium transition-colors duration-100
                                                ${isCollapsed ? "md:justify-center md:px-0 md:py-2 gap-3 px-3 py-2" : "gap-3 px-3 py-2"}
                                                ${active ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                                        >
                                            <Icon
                                                size={16}
                                                className={`flex-shrink-0 transition-colors duration-100 ${active ? "text-foreground" : "text-muted-foreground"}`}
                                            />
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
                                    <div className={`h-3.5 bg-muted rounded animate-pulse ${isCollapsed ? "md:w-6 md:mx-auto" : ""}`}
                                        style={{ width: isCollapsed ? undefined : `${55 + i * 9}%`, animationDelay: `${i * 60}ms` }} />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* ── User ── */}
                <div className={`pt-2 pb-4 border-t border-border mt-auto ${isCollapsed ? "md:px-2 px-3" : "px-3"}`}>
                    <div className={`flex items-center rounded-lg py-2 ${isCollapsed ? "md:justify-center md:px-0 px-3 gap-3" : "px-3 gap-3"}`}>
                        <div
                            className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[11px] font-bold flex-shrink-0"
                            title={isCollapsed ? `${user.name} ${user.surname || ""}` : undefined}
                        >
                            {user.name[0].toUpperCase()}
                        </div>
                        <div className={`flex-1 min-w-0 ${isCollapsed ? "md:hidden" : ""}`}>
                            <p className="text-[12.5px] font-semibold text-foreground truncate leading-tight">
                                {user.name} {user.surname || ""}
                            </p>
                            <Link
                                href="/settings"
                                className="mt-1 inline-flex items-center gap-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Settings size={12} className="text-muted-foreground" />
                                {t("nav.settings")}
                            </Link>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default memo(Sidebar);
