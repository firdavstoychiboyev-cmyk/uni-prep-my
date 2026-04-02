"use client";

import Link from "next/link";

export default function SettingsAchievementsPage() {
    return (
        <div className="max-w-3xl">
            <div className="rounded-3xl border border-border bg-card p-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Achievements</h1>
                <p className="text-sm text-muted-foreground mt-2">Управление и просмотр достижений.</p>

                <div className="mt-8 rounded-3xl border border-border bg-muted p-6 flex items-center justify-between gap-6">
                    <div className="min-w-0">
                        <div className="text-base font-semibold text-foreground">Открыть страницу достижений</div>
                        <div className="text-sm text-muted-foreground mt-1">
                            Переход на существующий раздел с достижениями.
                        </div>
                    </div>
                    <Link
                        href="/achievements"
                        className="shrink-0 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all"
                    >
                        Open
                    </Link>
                </div>
            </div>
        </div>
    );
}

