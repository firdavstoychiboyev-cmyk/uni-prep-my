"use client";

import { ThemeToggle } from "@/components/theme-toggle";

export default function SettingsAppearancePage() {
    return (
        <div className="max-w-3xl">
            <div className="rounded-3xl border border-border bg-card p-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Appearance</h1>
                <p className="text-sm text-muted-foreground mt-2">Переключение светлой и тёмной темы.</p>

                <div className="mt-8 flex items-center justify-between gap-6 rounded-3xl border border-border bg-muted p-6">
                    <div>
                        <div className="text-base font-semibold text-foreground">Theme</div>
                        <div className="text-sm text-muted-foreground mt-1">
                            Выберите светлый или тёмный режим — применяется ко всему сайту.
                        </div>
                    </div>
                    <ThemeToggle />
                </div>
            </div>
        </div>
    );
}

