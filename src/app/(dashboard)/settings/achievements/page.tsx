"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function SettingsAchievementsPage() {
    const { t } = useTranslation();
    return (
        <div className="max-w-3xl">
            <div className="rounded-3xl border border-border bg-card p-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("settings.achievements")}</h1>
                <p className="text-sm text-muted-foreground mt-2">{t("settings.achManageDesc")}</p>

                <div className="mt-8 rounded-3xl border border-border bg-muted p-6 flex items-center justify-between gap-6">
                    <div className="min-w-0">
                        <div className="text-base font-semibold text-foreground">{t("settings.openAchPage")}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                            {t("settings.achRedirectDesc")}
                        </div>
                    </div>
                    <Link
                        href="/achievements"
                        className="shrink-0 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all"
                    >
                        {t("common.open")}
                    </Link>
                </div>
            </div>
        </div>
    );
}

