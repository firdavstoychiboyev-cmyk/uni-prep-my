"use client";

import { Landmark, Globe } from "lucide-react";
import { useAdminScopeStore, AdminScope } from "@/store/useAdminScopeStore";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * Переключатель области данных админ-панели: «Barchasi» / «Faqat Registan».
 * Меняет scope во всех списках, счётчиках и аналитике панели.
 */
export default function AdminScopeToggle({ compact = false }: { compact?: boolean }) {
    const { t } = useTranslation();
    const { scope, setScope } = useAdminScopeStore();

    const options: { value: AdminScope; label: string; icon: typeof Globe }[] = [
        { value: "all", label: t("adminScope.all"), icon: Globe },
        { value: "registan", label: t("adminScope.registan"), icon: Landmark },
    ];

    return (
        <div className={compact ? "" : "flex flex-col gap-1.5"}>
            {!compact && (
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {t("adminScope.label")}
                </span>
            )}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
                {options.map((o) => {
                    const isActive = scope === o.value;
                    return (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => setScope(o.value)}
                            aria-pressed={isActive}
                            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                                isActive
                                    ? "bg-foreground text-background shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <o.icon size={13} className="shrink-0" />
                            <span className="truncate">{o.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
