"use client";

import { memo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubjectsStore } from "@/store/useSubjectsStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { fetchSubjects } from "@/lib/data-fetching";
import {
    LayoutDashboard,
    Award,
    CircleUserRound,
    GraduationCap,
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
    { name: "Главная", href: "/", icon: LayoutDashboard },
    ...(isTeacher ? [{ name: "Мои классы", href: "/classes", icon: GraduationCap }] : []),
    { name: "Мои достижения", href: "/achievements", icon: Award },
    { name: "Мой профиль", href: "/profile", icon: CircleUserRound },
];

function Sidebar() {
    const { user } = useAuthStore();
    const { subjects, loaded, setSubjects } = useSubjectsStore();
    const { isOpen, close } = useSidebarStore();
    const pathname = usePathname();

    useEffect(() => {
        if (!loaded) {
            fetchSubjects().then(setSubjects);
        }
    }, [loaded, setSubjects]);

    // Close sidebar on route change (mobile)
    useEffect(() => {
        close();
    }, [pathname, close]);

    if (!user) return null;

    const links = mainLinks(user.role === "teacher");

    return (
        <>
            {/* Overlay backdrop — mobile only */}
            {isOpen && (
                <div
                    onClick={close}
                    className="fixed inset-0 bg-black/40 z-40 md:hidden"
                    aria-hidden="true"
                />
            )}

            <aside
                className={`fixed left-0 top-0 h-screen w-64 bg-background border-r border-border flex flex-col z-50 overflow-y-auto transition-transform duration-300 ease-in-out
                    ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
            >
                {/* ── Logo ── */}
                <div className="px-5 pt-5 pb-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3" onClick={close}>
                        <div className="relative w-12 h-12 flex-shrink-0">
                            <Image
                                src="/gogg.png"
                                alt="UniPrep"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>
                        <span className="text-xl font-extrabold tracking-tight text-foreground">UniPrep</span>
                    </Link>
                    {/* Close button — mobile only */}
                    <button
                        onClick={close}
                        className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
                        aria-label="Закрыть меню"
                    >
                        <X size={18} className="text-muted-foreground" />
                    </button>
                </div>

                {/* ── Main navigation ── */}
                <nav className="px-3 pt-2 pb-2">
                    <ul className="flex flex-col gap-0.5">
                        {links.map(({ name, href, icon: Icon }) => {
                            const active = pathname === href;
                            return (
                                <li key={href}>
                                    <Link
                                        href={href}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13.5px] font-medium transition-colors duration-100 ${
                                            active
                                                ? "bg-muted text-foreground font-semibold"
                                                : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                        }`}
                                    >
                                        <Icon
                                            size={16}
                                            className={`flex-shrink-0 transition-colors duration-100 ${active ? "text-foreground" : "text-muted-foreground"}`}
                                        />
                                        <span>{name}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* ── Divider ── */}
                <div className="mx-5 my-1 border-t border-border" />

                {/* ── Subjects ── */}
                <div className="px-3 pt-2 pb-3 flex-1">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-1.5">
                        Предметы
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
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-100 ${
                                                active
                                                    ? "bg-muted text-foreground font-semibold"
                                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                            }`}
                                        >
                                            <Icon
                                                size={15}
                                                className={`flex-shrink-0 transition-colors duration-100 ${active ? "text-foreground" : "text-muted-foreground"}`}
                                            />
                                            <span className="truncate">{subject.name}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <ul className="flex flex-col gap-0.5">
                            {[...Array(5)].map((_, i) => (
                                <li key={i} className="px-3 py-2.5">
                                    <div
                                        className="h-3.5 bg-muted rounded animate-pulse"
                                        style={{ width: `${55 + i * 9}%`, animationDelay: `${i * 60}ms` }}
                                    />
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* ── User ── */}
                <div className="px-3 pt-2 pb-4 border-t border-border mt-auto">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
                        <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[11px] font-bold flex-shrink-0">
                            {user.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-semibold text-foreground truncate leading-tight">
                                {user.name} {user.surname || ""}
                            </p>
                            <Link
                                href="/settings"
                                className="mt-1 inline-flex items-center gap-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <Settings size={12} className="text-muted-foreground" />
                                Настройки
                            </Link>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}

export default memo(Sidebar);
