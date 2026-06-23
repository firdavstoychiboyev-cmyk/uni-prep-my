"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function SettingsAppearancePage() {
    const { t } = useTranslation();
    return (
        <div className="max-w-3xl">
            <div className="rounded-3xl border border-border bg-card p-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("settings.appearance")}</h1>
                <p className="text-sm text-muted-foreground mt-2">{t("settings.appearanceThemeDesc")}</p>

                <div className="mt-8 flex items-center justify-between gap-6 rounded-3xl border border-border bg-muted p-6">
                    <div>
                        <div className="text-base font-semibold text-foreground">{t("settings.appearanceLabel")}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                            {t("settings.appearancePickDesc")}
                        </div>
                    </div>
                    <ThemeToggle />
                </div>
            </div>
        </div>
    );
}

