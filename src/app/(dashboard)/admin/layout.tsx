"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, Library, ListTree, HelpCircle, ArrowLeft, FileUp, ClipboardList, KeyRound, ListChecks, GraduationCap, Users, BarChart3, Zap, Building2, GitCompare, ClipboardCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import AdminScopeToggle from "@/components/admin-scope-toggle";
import { isAnyAdmin, isFilialAdmin, isDirectorAdmin, filialAdminCanAccess, directorAdminCanAccess, FILIAL_ADMIN_ROUTES, DIRECTOR_ADMIN_ROUTES } from "@/lib/roles";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useTranslation();

    // Доступ: любой уровень admin. Ограниченных ролей выкидываем с запрещённых
    // разделов обратно на дашборд панели.
    useEffect(() => {
        if (isLoading) return;
        if (!user || !isAnyAdmin(user)) {
            router.push("/home");
            return;
        }
        if (isFilialAdmin(user) && !filialAdminCanAccess(pathname)) {
            router.push("/admin");
        }
        if (isDirectorAdmin(user) && !directorAdminCanAccess(pathname)) {
            router.push("/admin");
        }
    }, [user, isLoading, router, pathname]);

    if (isLoading || !user || !isAnyAdmin(user)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-transparent">
                <div className="h-1 w-8 overflow-hidden rounded-full bg-muted">
                    <div className="h-full animate-pulse bg-foreground"></div>
                </div>
            </div>
        );
    }

    const allMenuItems = [
        { name: t("admin.dashboard"), href: "/admin", icon: LayoutDashboard },
        { name: t("admin.students"), href: "/admin/students", icon: GraduationCap },
        { name: t("admin.teachers"), href: "/admin/teachers", icon: Users },
        { name: t("admin.analytics"), href: "/admin/analytics", icon: BarChart3 },
        { name: t("adminRush.title"), href: "/admin/rush", icon: Zap },
        { name: t("adminEntrance.title"), href: "/admin/entrance", icon: GraduationCap },
        { name: t("nav.subjects"), href: "/admin/subjects", icon: BookOpen },
        { name: t("subject.textbooks"), href: "/admin/textbooks", icon: Library },
        { name: t("stats.topics"), href: "/admin/topics", icon: ListTree },
        { name: t("admin.questions"), href: "/admin/questions", icon: HelpCircle },
        { name: "Import Excel", href: "/admin/import", icon: FileUp },
        { name: "Mocklar", href: "/admin/mocks", icon: ClipboardList },
        { name: t("mockGrade.navTitle"), href: "/admin/mock-grading", icon: ClipboardCheck },
        { name: t("adminMockQ.title"), href: "/admin/mock-questions", icon: ListChecks },
        { name: t("adminCodes.title"), href: "/admin/codes", icon: KeyRound },
        { name: t("adminFilials.title"), href: "/admin/filials", icon: Building2 },
        { name: t("adminDirector.title"), href: "/admin/director", icon: GitCompare },
    ];
    // Фильтрация меню по роли: filial_admin → только свои разделы,
    // director_admin → только разделы директора, super_admin → всё.
    const menuItems = isFilialAdmin(user)
        ? allMenuItems.filter((m) => FILIAL_ADMIN_ROUTES.includes(m.href))
        : isDirectorAdmin(user)
        ? allMenuItems.filter((m) => DIRECTOR_ADMIN_ROUTES.includes(m.href))
        : allMenuItems;

    return (
        <div className="flex min-h-screen bg-transparent">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex sticky top-0 h-screen w-64 flex-col border-r border-border bg-card shrink-0">
                <div className="flex items-center gap-3 border-b border-border p-8">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-lg font-bold text-background">
                        A
                    </div>
                    <span className="font-semibold tracking-tight text-foreground">{t("admin.panel")}</span>
                </div>

                {/* Область данных: вся платформа / только Registan */}
                <div className="border-b border-border px-4 py-4">
                    <AdminScopeToggle />
                </div>

                <nav className="mt-4 flex-1 space-y-1 p-4">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                                    isActive
                                        ? "bg-foreground text-background"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                            >
                                <item.icon size={18} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-border p-4">
                    <Link
                        href="/home"
                        className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
                    >
                        <ArrowLeft size={18} />
                        {t("admin.back")}
                    </Link>
                </div>
            </aside>

            <div className="flex-1 min-w-0 flex flex-col">
                {/* Mobile horizontal tab bar */}
                <div className="md:hidden border-b border-border bg-card shrink-0">
                    <div className="px-3 pt-2">
                        <AdminScopeToggle compact />
                    </div>
                    <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-none">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                                        isActive
                                            ? "bg-foreground text-background"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                >
                                    <item.icon size={14} />
                                    {item.name}
                                </Link>
                            );
                        })}
                        <Link
                            href="/home"
                            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap text-muted-foreground hover:bg-muted hover:text-foreground transition-all shrink-0 ml-auto"
                        >
                            <ArrowLeft size={14} />
                            {t("common.back")}
                        </Link>
                    </div>
                </div>

                <main className="flex-1 bg-transparent p-4 md:p-12">
                    <div className="mx-auto max-w-5xl">{children}</div>
                </main>
            </div>
        </div>
    );
}
