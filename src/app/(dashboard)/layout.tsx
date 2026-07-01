"use client";

import Sidebar from "@/components/sidebar";
import NavProgressBar from "@/components/nav-progress-bar";
import PageWrapper from "@/components/page-wrapper";
import Topbar from "@/components/topbar";
import { useAuthStore } from "@/store/useAuthStore";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading } = useAuthStore();
    const { isCollapsed } = useSidebarStore();
    const router = useRouter();
    const pathname = usePathname();
    const isTestPage = pathname?.startsWith("/test/");

    useEffect(() => {
        if (!isLoading && !user) router.push("/login");
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="h-dvh max-h-dvh min-h-0 overflow-hidden bg-background">
                <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 flex-col z-50 px-2 py-0 bg-card border-r border-border">
                    <div className="h-14 flex items-center px-4 border-b border-border">
                        <div className="h-5 w-28 rounded animate-pulse bg-muted" />
                    </div>
                    <div className="pt-2 px-2 flex flex-col gap-0.5">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-8 rounded-md animate-pulse bg-muted" style={{ animationDelay: `${i * 60}ms` }} />
                        ))}
                    </div>
                </aside>
                <main className="md:ml-64 flex h-dvh max-h-dvh min-h-0 flex-col bg-background">
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

    if (!user) return null;

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
            <main className={`flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-background transition-[margin] duration-300 ease-in-out ${isCollapsed ? "md:ml-[58px]" : "md:ml-64"}`}>
                <Topbar />
                <PageWrapper>{children}</PageWrapper>
            </main>
        </div>
    );
}
