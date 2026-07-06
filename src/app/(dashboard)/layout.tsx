"use client";

import Sidebar from "@/components/sidebar";
import NavProgressBar from "@/components/nav-progress-bar";
import PageWrapper from "@/components/page-wrapper";
import Topbar from "@/components/topbar";
import { useAuthStore } from "@/store/useAuthStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { isRegistanAdmin } from "@/lib/roles";

// Routes that are meaningless without an account — everything else is open to anonymous browsing.
// /statistics и /achievements открыты: они показывают inline-приглашение войти вместо редиректа.
const PROTECTED_PREFIXES = ["/test", "/profile", "/settings", "/classes", "/student", "/admin", "/registan", "/mistakes", "/rush", "/entrance"];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuthStore();
    const { isCollapsed } = useSidebarStore();
    const router = useRouter();
    const pathname = usePathname();
    const isTestPage = pathname?.startsWith("/test/");
    const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname?.startsWith(`${p}/`));

    useEffect(() => {
        if (!isLoading && !user && isProtected) {
            // window.location preserves query params (e.g. /test/x?t=a,b) that usePathname drops
            const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
            router.push(`/login?returnTo=${returnTo}`);
        }
    }, [user, isLoading, isProtected, router]);

    // Registan-админ живёт только в своей панели: со «студенческих» разделов
    // (главная, предметы, моки и т.д.) отправляем его в /admin. Свои /admin,
    // /settings, /profile оставляем доступными.
    useEffect(() => {
        if (isLoading || !user || !isRegistanAdmin(user)) return;
        const allowedPrefixes = ["/admin", "/settings", "/profile"];
        const allowed = allowedPrefixes.some((p) => pathname === p || pathname?.startsWith(`${p}/`));
        if (!allowed) router.replace("/admin");
    }, [user, isLoading, pathname, router]);

    if (isLoading) {
        return (
            <div className="h-dvh max-h-dvh min-h-0 overflow-hidden bg-background">
                {/* Скелет соответствует свёрнутому рельсу (режим по умолчанию),
                    чтобы после загрузки контент не прыгал. */}
                <aside className="hidden md:flex fixed left-0 top-0 h-screen w-16 flex-col z-50 py-0 bg-card border-r border-border">
                    <div className="h-14 flex items-center justify-center border-b border-border">
                        <div className="h-7 w-7 rounded-full animate-pulse bg-muted" />
                    </div>
                    <div className="pt-2 px-2 flex flex-col items-center gap-1.5">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-8 w-8 rounded-md animate-pulse bg-muted" style={{ animationDelay: `${i * 60}ms` }} />
                        ))}
                    </div>
                </aside>
                <main className="md:ml-16 flex h-dvh max-h-dvh min-h-0 flex-col bg-background">
                    <div className="h-[52px] shrink-0 border-b border-border bg-card" />
                    <div className="flex-1 px-5 py-7 sm:px-8 flex flex-col gap-6">
                        <div className="h-9 w-64 rounded-lg animate-pulse bg-muted" />
                        <div className="h-4 w-48 rounded animate-pulse bg-muted" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="h-44 rounded-xl animate-pulse bg-muted" style={{ animationDelay: `${i * 80}ms` }} />
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (!user && isProtected) return null;

    if (isTestPage) {
        return (
            <div className="h-dvh max-h-dvh min-h-0 overflow-hidden bg-background">
                <NavProgressBar />
                {children}
            </div>
        );
    }

    return (
        <div className="h-dvh max-h-dvh min-h-0 overflow-hidden bg-background">
            <Sidebar />
            <NavProgressBar />
            {/* Отступ контента следует за pin-состоянием (isCollapsed), а не за
                наведением — рельс раскрывается ПОВЕРХ контента, без сдвига. */}
            <main className={`flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-background transition-[margin] duration-200 ease-in-out ${isCollapsed ? "md:ml-16" : "md:ml-[296px]"}`}>
                <Topbar />
                <PageWrapper>{children}</PageWrapper>
            </main>
        </div>
    );
}
