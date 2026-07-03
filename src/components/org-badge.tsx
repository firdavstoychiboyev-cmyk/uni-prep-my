"use client";

import { Landmark } from "lucide-react";

// Метки организаций-партнёров; ключ — значение user.organization
const ORG_LABELS: Record<string, string> = {
    registan: "Registan",
};

/**
 * Бейдж организации-партнёра рядом с именем/аватаром пользователя.
 * Рендерится только если у пользователя задан organization.
 * Стиль повторяет пилюли стрика/звёзд в топбаре.
 */
export default function OrgBadge({ organization, className = "" }: { organization?: string; className?: string }) {
    if (!organization) return null;
    const label = ORG_LABELS[organization] ?? organization;
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold
            bg-violet-50 dark:bg-[#160f2e] border border-violet-200 dark:border-[#332257]
            text-violet-600 dark:text-violet-400 ${className}`}
        >
            <Landmark size={11} />
            {label}
        </span>
    );
}
