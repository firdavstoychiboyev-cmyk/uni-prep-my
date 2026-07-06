"use client";

import { memo, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubjectsStore } from "@/store/useSubjectsStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { fetchSubjects } from "@/lib/data-fetching";
import { getSubjectTheme } from "@/lib/subject-theme";
import { ILLUSTRATIONS, BADGE_VIEWBOX } from "@/components/subject-illustrations";
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
    Zap,
    type LucideIcon,
} from "lucide-react";

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
    rail:     "#16233b",
    border:   "rgba(255,255,255,0.08)",
    textBase: "#aab6ca",
    textHover:"#e8edf5",
    textWhite:"#ffffff",
    textMuted:"#5f6f8a",
    hoverBg:  "rgba(255,255,255,0.05)",
    activeBg: "rgba(255,255,255,0.10)",
} as const;

type NavLink = {
    label: string;
    href: string;
    icon: LucideIcon;
    pill?: { label: string; bg: string; color: string };
};

const mainLinks = (
    isTeacher: boolean,
    isStudent: boolean,
    isRegistan: boolean,
    t: (k: string) => string,
): NavLink[] => [
    { label: t("nav.home"),         href: "/home",        icon: LayoutDashboard },
    ...(isTeacher ? [{ label: t("nav.classes"),    href: "/classes",    icon: GraduationCap }] : []),
    { label: t("nav.statistics"),   href: "/statistics",  icon: BarChart3 },
    { label: t("nav.achievements"), href: "/achievements",icon: Award },
    ...(isStudent ? [{ label: t("nav.mistakes"),   href: "/mistakes",   icon: Target }] : []),
    {
        label: t("nav.rush"), href: "/rush", icon: Zap,
        pill: { label: t("sidebar.newBadge"), bg: "#d6f0ff", color: "#0a6fb5" },
    },
    ...(isRegistan && isStudent ? [{ label: t("nav.entrance"), href: "/entrance", icon: GraduationCap }] : []),
    { label: t("nav.mocks"),    href: "/mocks",    icon: ClipboardList },
    { label: t("nav.subjects"), href: "/subjects", icon: BookOpen },
    ...(isRegistan ? [{ label: "Registan", href: "/registan", icon: Landmark }] : []),
    { label: t("nav.profile"), href: "/profile", icon: CircleUserRound },
];

// ── Component ─────────────────────────────────────────────────────────────────
function Sidebar() {
    const { user } = useAuthStore();
    const { subjects, setSubjects } = useSubjectsStore();
    const { isOpen, isCollapsed, close, toggleCollapsed } = useSidebarStore();
    const pathname = usePathname();
    const { t, language } = useTranslation();

    // ── Hover-expand mechanics — UNTOUCHED ─────────────────────────────────
    const [hovered, setHovered] = useState(false);
    const [focusWithin, setFocusWithin] = useState(false);
    const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const expanded = !isCollapsed || hovered || focusWithin;
    const collapsed = !expanded;

    const onEnter = () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); setHovered(true); };
    const onLeave = () => {
        if (leaveTimer.current) clearTimeout(leaveTimer.current);
        leaveTimer.current = setTimeout(() => setHovered(false), 180);
    };
    useEffect(() => () => { if (leaveTimer.current) clearTimeout(leaveTimer.current); }, []);
    // ── end hover mechanics ────────────────────────────────────────────────

    useEffect(() => {
        fetchSubjects().then(setSubjects).catch(() => {});
    }, [language, setSubjects]);

    // Mobile drawer — separate from desktop hover. Closes via X, backdrop tap,
    // navigation, or Escape. None of these touch hovered/focusWithin.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [isOpen, close]);

    useEffect(() => { close(); }, [pathname, close]);

    const links = mainLinks(user?.role === "teacher", user?.role === "student", user?.organization === "registan", t);

    // ── Stagger animation helpers ──────────────────────────────────────────
    // Only animate when desktop hover-expands the collapsed rail.
    // - isOpen=true (mobile drawer): no stagger — the drawer slide-in is enough.
    // - isCollapsed=false (pinned open): no stagger — labels are always visible.
    // - isCollapsed=true + hover/focus (the hover-expand case): stagger fires.
    //
    // Implementation: tailwindcss-animate's `animate-in fade-in-0
    // slide-in-from-left-2` starts the CSS animation when the class is newly
    // applied to an element (animation-name changes from none → "enter"), which
    // fires correctly even when display:none is simultaneously removed by the
    // md:hidden class being dropped — per CSS Animations spec §3.4 "new CSS
    // animations must start" when animation-name gains a non-none value.
    //
    // Collapse exit: elements immediately get `md:hidden` (display:none) via the
    // collapsed branch below — the snap-hide is acceptable per the spec ("fine
    // for this to just fade out quickly/uniformly"). The 180ms leaveTimer means
    // the sidebar stays visible for 180ms anyway.
    const animating = !isOpen && isCollapsed && (hovered || focusWithin);

    // CSS class for a newly-revealed label element.
    const fc = () =>
        animating
            ? "animate-in fade-in-0 slide-in-from-left-2 duration-300"
            : collapsed ? "md:hidden" : "";

    // Inline animationDelay for stagger (only when animating).
    const fd = (i: number): React.CSSProperties =>
        animating ? { animationDelay: `${i * 25}ms` } : {};

    // Pre-compute stagger base indices for each section.
    // 0        → brand wordmark + close/pin buttons (treated as one row)
    // 1..N     → nav item labels (N = links.length)
    // N+1      → section label (ПРАКТИКА/AMALIYOT)
    // N+2..    → subject labels
    // N+2+S    → footer user text + settings gear (S = subjects.length)
    const SI_BRAND   = 0;
    const SI_NAV     = 1;                               // base; add navIdx
    const SI_SECTION = 1 + links.length;
    const SI_SUBJ    = 2 + links.length;                // base; add subjIdx
    const SI_FOOTER  = 2 + links.length + subjects.length;
    // ── end animation helpers ──────────────────────────────────────────────

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div onClick={close} className="fixed inset-0 bg-black/70 z-40 md:hidden" aria-hidden="true" />
            )}

            <aside
                onMouseEnter={onEnter}
                onMouseLeave={onLeave}
                onFocusCapture={() => setFocusWithin(true)}
                onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocusWithin(false); }}
                aria-label={t("nav.home")}
                className={`
                    fixed left-0 top-0 h-screen flex flex-col z-50
                    overflow-y-auto overflow-x-hidden
                    w-[296px]
                    ${isOpen ? "translate-x-0" : "-translate-x-full"}
                    ${collapsed ? "md:w-16 md:translate-x-0" : "md:w-[296px] md:translate-x-0"}
                `}
                style={{
                    background: C.rail,
                    borderRight: `1px solid ${C.border}`,
                    // Inline transition so we can set different durations for width
                    // (hover-expand, 500ms) and transform (mobile drawer slide, 300ms).
                    // Tailwind can only apply one duration per element, so this must
                    // live here rather than as Tailwind utility classes.
                    transition: "width 500ms ease-in-out, transform 300ms ease-in-out",
                    willChange: "transform",
                    backfaceVisibility: "hidden",
                    isolation: "isolate",
                    fontFamily: "var(--font-manrope, var(--font-plus-jakarta), sans-serif)",
                }}
            >
                {/* ── Brand row ── */}
                <div
                    className={`shrink-0 h-[60px] flex items-center gap-2.5 border-b px-4
                        ${collapsed ? "md:justify-center md:px-0" : ""}`}
                    style={{ borderColor: C.border }}
                >
                    <Link href="/home" onClick={close} className="flex items-center gap-2.5 flex-1 min-w-0">
                        {/* Conic-gradient kulcha badge — always visible in collapsed rail */}
                        <div
                            className="flex-shrink-0 flex items-center justify-center rounded-[11px]"
                            style={{
                                width: 36, height: 36,
                                background: "conic-gradient(from 210deg, #f0873a, #ef4f6b, #7c5cff, #f0873a)",
                            }}
                        />
                        {/* Wordmark — fades in on expand */}
                        <span
                            className={fc()}
                            style={{
                                color: C.textWhite, fontWeight: 800, fontSize: 21,
                                letterSpacing: "-0.02em",
                                ...fd(SI_BRAND),
                            }}
                        >
                            Kulcha
                        </span>
                    </Link>

                    {/* Close (mobile) / pin (desktop) — fades in with brand row */}
                    <div
                        className={`flex-shrink-0 flex items-center gap-1 ${fc()}`}
                        style={fd(SI_BRAND)}
                    >
                        <button
                            onClick={close}
                            className="md:hidden p-1.5 rounded-lg transition-colors"
                            style={{ color: C.textMuted }}
                            onMouseEnter={e => (e.currentTarget.style.color = C.textWhite)}
                            onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
                            aria-label={t("sidebar.closeMenu")}
                        >
                            <X size={16} />
                        </button>
                        <button
                            onClick={toggleCollapsed}
                            className="hidden md:flex p-1.5 rounded-lg transition-colors"
                            style={{ color: C.textMuted }}
                            onMouseEnter={e => (e.currentTarget.style.color = C.textWhite)}
                            onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
                            aria-pressed={!isCollapsed}
                            title={isCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
                        >
                            {isCollapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
                        </button>
                    </div>
                </div>

                {/* ── Main nav ── */}
                <nav className="pt-2 px-2">
                    <ul className="flex flex-col gap-px">
                        {links.map(({ label, href, icon: Icon, pill }, navIdx) => {
                            const active = pathname === href;
                            const si = SI_NAV + navIdx;
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        title={collapsed ? label : undefined}
                                        className={`flex items-center rounded-xl transition-colors duration-100
                                            ${collapsed ? "md:justify-center md:px-0 md:py-2.5 gap-3 px-3 py-2" : "gap-3 px-3 py-2"}`}
                                        style={{
                                            background: active ? C.activeBg : "transparent",
                                            color: active ? C.textWhite : C.textBase,
                                            fontSize: 15,
                                            fontWeight: active ? 700 : 600,
                                        }}
                                        onMouseEnter={e => {
                                            if (!active) {
                                                e.currentTarget.style.background = C.hoverBg;
                                                e.currentTarget.style.color = C.textHover;
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!active) {
                                                e.currentTarget.style.background = "transparent";
                                                e.currentTarget.style.color = C.textBase;
                                            }
                                        }}
                                    >
                                        {/* Icon — always visible in collapsed rail, does NOT animate */}
                                        <Icon size={20} className="flex-shrink-0" style={{ color: active ? C.textWhite : C.textBase }} />

                                        {/* Label — fades/slides in on expand */}
                                        <span
                                            className={`flex-1 min-w-0 ${fc()}`}
                                            style={fd(si)}
                                        >
                                            {label}
                                        </span>

                                        {/* Pill — fades in with its label */}
                                        {pill && (
                                            <span
                                                className={`flex-shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${fc()}`}
                                                style={{ background: pill.bg, color: pill.color, ...fd(si) }}
                                            >
                                                {pill.label}
                                            </span>
                                        )}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* ── AMALIYOT / ПРАКТИКА section label ── */}
                <div
                    className={`pt-5 pb-1.5 uppercase ${fc()} ${collapsed ? "px-4" : "px-4"}`}
                    style={{
                        color: C.textMuted, fontSize: 11.5, fontWeight: 800,
                        letterSpacing: "0.09em",
                        ...fd(SI_SECTION),
                    }}
                >
                    {language === "uz" ? "AMALIYOT" : "ПРАКТИКА"}
                </div>

                {/* ── Subject list ── */}
                <div className={`pb-2 flex-1 ${collapsed ? "md:px-2 px-2" : "px-2"}`}>
                    {subjects.length > 0 ? (
                        <ul className="flex flex-col gap-px">
                            {subjects.map((subject, subjIdx) => {
                                const active = pathname === `/subject/${subject.id}`;
                                const theme = getSubjectTheme(subject.name, subject.id);
                                const Illustration = ILLUSTRATIONS[theme.illustration];
                                const si = SI_SUBJ + subjIdx;
                                return (
                                    <li key={subject.id}>
                                        <Link
                                            href={`/subject/${subject.id}`}
                                            title={collapsed ? subject.name : undefined}
                                            className={`flex items-center rounded-xl transition-colors duration-100
                                                ${collapsed ? "md:justify-center md:px-0 md:py-1.5 gap-3 px-3 py-1.5" : "gap-3 px-3 py-1.5"}`}
                                            style={{
                                                background: active ? C.activeBg : "transparent",
                                                color: active ? C.textWhite : C.textBase,
                                                fontSize: 15,
                                                fontWeight: active ? 700 : 600,
                                            }}
                                            onMouseEnter={e => {
                                                if (!active) {
                                                    e.currentTarget.style.background = C.hoverBg;
                                                    e.currentTarget.style.color = C.textHover;
                                                }
                                            }}
                                            onMouseLeave={e => {
                                                if (!active) {
                                                    e.currentTarget.style.background = "transparent";
                                                    e.currentTarget.style.color = C.textBase;
                                                }
                                            }}
                                        >
                                            {/* Chip — always visible in collapsed rail, does NOT animate */}
                                            <span
                                                className="flex shrink-0 items-center justify-center overflow-hidden rounded-[9px] ring-1 ring-white/10"
                                                style={{
                                                    width: 30, height: 30,
                                                    background: `linear-gradient(135deg, ${theme.gradFrom}, ${theme.gradTo})`,
                                                }}
                                            >
                                                <Illustration
                                                    viewBox={BADGE_VIEWBOX[theme.illustration]}
                                                    width={30}
                                                    height={30}
                                                    preserveAspectRatio="xMidYMid slice"
                                                />
                                            </span>

                                            {/* Subject name — fades/slides in on expand */}
                                            <span
                                                className={`truncate ${fc()}`}
                                                style={fd(si)}
                                            >
                                                {subject.name}
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <ul className="flex flex-col gap-px">
                            {[...Array(5)].map((_, i) => (
                                <li key={i} className="px-3 py-2.5">
                                    <div
                                        className="h-3 rounded animate-pulse"
                                        style={{ width: `${55 + i * 9}%`, background: "rgba(255,255,255,0.08)", animationDelay: `${i * 60}ms` }}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* ── Footer: user + settings ── */}
                {user && (
                    <div className="shrink-0 border-t px-2 py-2.5" style={{ borderColor: C.border }}>
                        <div
                            className={`flex items-center gap-3 px-2 py-2 rounded-xl transition-colors duration-100
                                ${collapsed ? "md:justify-center md:px-0" : ""}`}
                            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                            {/* 36×36 avatar — always visible in collapsed rail */}
                            <div
                                className="flex items-center justify-center rounded-xl text-[14px] font-bold flex-shrink-0 text-white"
                                style={{
                                    width: 36, height: 36,
                                    background: "linear-gradient(150deg, #f0873a, #ef4f6b)",
                                }}
                                title={collapsed ? `${user.name} ${user.surname || ""}` : undefined}
                            >
                                {user.name[0].toUpperCase()}
                            </div>

                            {/* Name + plan — fades/slides in on expand */}
                            <div
                                className={`flex-1 min-w-0 ${fc()}`}
                                style={fd(SI_FOOTER)}
                            >
                                <p className="text-[14px] font-bold truncate" style={{ color: C.textWhite }}>
                                    {user.name} {user.surname || ""}
                                </p>
                                <p className="text-[12px] font-medium truncate" style={{ color: C.textMuted }}>
                                    {user.organization === "registan" ? (
                                        <span className="flex items-center gap-1">
                                            <Landmark size={9} /> Registan
                                        </span>
                                    ) : t("sidebar.planFree")}
                                </p>
                            </div>

                            {/* Settings gear — fades/slides in with footer */}
                            <Link
                                href="/settings"
                                title={t("nav.settings")}
                                className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${fc()}`}
                                style={{ color: C.textMuted, ...fd(SI_FOOTER) }}
                                onMouseEnter={e => (e.currentTarget.style.color = C.textWhite)}
                                onMouseLeave={e => (e.currentTarget.style.color = C.textMuted)}
                            >
                                <Settings size={16} />
                            </Link>
                        </div>
                    </div>
                )}
            </aside>
        </>
    );
}

export default memo(Sidebar);
