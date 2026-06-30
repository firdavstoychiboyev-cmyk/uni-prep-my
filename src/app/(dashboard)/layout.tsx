"use client";

import Sidebar from "@/components/sidebar";
import NavProgressBar from "@/components/nav-progress-bar";
import PageWrapper from "@/components/page-wrapper";
import Topbar from "@/components/topbar";
import { useAuthStore } from "@/store/useAuthStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading } = useAuthStore();
    const { isCollapsed } = useSidebarStore();
    const router = useRouter();
    const pathname = usePathname();
    const isTestPage = pathname?.startsWith("/test/");

    useEffect(() => {
        if (!isLoading && !user) {
            router.push("/login");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="h-dvh max-h-dvh min-h-0 overflow-hidden bg-muted/50 dark:bg-black">
                {/* Skeleton sidebar — hidden on mobile */}
                <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col z-50 px-2 py-5 gap-2" style={{ background: "#0E1217" }}>
                    <div className="h-9 w-36 rounded-xl animate-pulse mx-2 mb-3" style={{ background: "rgba(255,255,255,0.08)" }} />
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.07)", animationDelay: `${i * 80}ms` }} />
                    ))}
                    <div className="mt-3 mx-2">
                        <div className="h-2.5 w-16 rounded animate-pulse mb-2" style={{ background: "rgba(255,255,255,0.05)" }} />
                    </div>
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-9 rounded-xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)", animationDelay: `${i * 60}ms` }} />
                    ))}
                </aside>
                {/* Skeleton content */}
                <main className="md:ml-64 flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-muted/50 dark:bg-black">
                    <div className="h-16 shrink-0 bg-background/80" />
                    <div className="mx-4 mb-4 mt-3 flex min-h-0 flex-1 flex-col sm:mx-5 sm:mb-5 sm:mt-4">
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-3xl rounded-b-2xl border border-border/45 bg-background shadow-md">
                            <div className="h-12 shrink-0 border-b border-[hsl(var(--brand-blue))]/18 bg-[hsl(var(--brand-blue-soft))]" />
                            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 sm:p-8 flex flex-col gap-6">
                                <div className="h-10 w-64 bg-gray-100 rounded-2xl animate-pulse" />
                                <div className="h-4 w-full max-w-xs sm:w-96 bg-gray-100 rounded-xl animate-pulse" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-2">
                                    {[...Array(3)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-32 bg-gray-100 rounded-2xl animate-pulse"
                                            style={{ animationDelay: `${i * 100}ms` }}
                                        />
                                    ))}
                                </div>
                                <div className="h-6 w-48 bg-gray-100 rounded-xl animate-pulse mt-4" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {[...Array(6)].map((_, i) => (
                                        <div
                                            key={i}
                                            className="h-44 bg-gray-100 rounded-2xl animate-pulse"
                                            style={{ animationDelay: `${i * 80}ms` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (!user) return null;

    /* ── Test page: full screen, no sidebar/topbar ── */
    if (isTestPage) {
        return (
            <div className="h-dvh max-h-dvh min-h-0 overflow-hidden bg-background">
                <NavProgressBar />
                {children}
            </div>
        );
    }

    return (
        <div className="h-dvh max-h-dvh min-h-0 overflow-hidden bg-muted/50 dark:bg-black">
            <Sidebar />
            <NavProgressBar />
            <main className={`flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-muted/50 dark:bg-black transition-[margin] duration-300 ease-in-out ${isCollapsed ? "md:ml-16" : "md:ml-64"}`}>
                <Topbar />
                <div className="mx-3 mb-3 mt-2 flex min-h-0 flex-1 flex-col sm:mx-5 sm:mb-5 sm:mt-4">
                    <PageWrapper>{children}</PageWrapper>
                </div>
            </main>
        </div>
    );
}
