"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Landmark, BookOpen } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * Раздел для студентов Registan (organization === "registan").
 * Пока пустое состояние — скаффолдинг под будущие материалы партнёра.
 * Гвард по паттерну admin/layout.tsx: клиентская проверка + redirect.
 */
export default function RegistanPage() {
    const { user, isLoading } = useAuthStore();
    const router = useRouter();
    const { t } = useTranslation();

    const isRegistan = user?.organization === "registan";

    useEffect(() => {
        if (!isLoading && !isRegistan) {
            router.push("/home");
        }
    }, [isLoading, isRegistan, router]);

    if (isLoading || !isRegistan) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-1 w-8 overflow-hidden rounded-full bg-muted">
                    <div className="h-full animate-pulse bg-foreground"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-600 dark:border-[#332257] dark:bg-[#160f2e] dark:text-violet-400">
                    <Landmark size={22} />
                </div>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Registan</h1>
                    <p className="text-sm text-muted-foreground">{t("registan.subtitle")}</p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-card px-6 py-20 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                    <BookOpen size={24} />
                </div>
                <div>
                    <p className="text-lg font-semibold text-foreground">{t("registan.comingSoon")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("registan.comingSoonDesc")}</p>
                </div>
            </div>
        </div>
    );
}
