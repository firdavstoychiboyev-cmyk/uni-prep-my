"use client";

import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { fetchScopedStudentIds } from "@/lib/admin-utils";
import { useAdminScopeStore } from "@/store/useAdminScopeStore";
import SubjectFailures from "@/components/subject-failures";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * Аналитика админ-панели: слабые предметы по числу ошибок, агрегировано по
 * ученикам в текущей области. В scope "registan" в выборку попадают ТОЛЬКО
 * ученики Registan — данные остальных не учитываются вовсе.
 */
export default function AdminAnalyticsPage() {
    const { t } = useTranslation();
    const { scope } = useAdminScopeStore();
    const [studentIds, setStudentIds] = useState<string[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        setStudentIds(null);
        fetchScopedStudentIds(scope)
            .then((ids) => { if (!cancelled) setStudentIds(ids); })
            .catch(() => { if (!cancelled) setStudentIds([]); });
        return () => { cancelled = true; };
    }, [scope]);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("admin.analytics")}</h1>
                <p className="mt-2 text-sm text-muted-foreground">{t("adminAnalytics.subtitle")}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {scope === "registan" && (
                    <span className="inline-flex items-center gap-2 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                        <Landmark size={13} /> {t("adminScope.registan")}
                    </span>
                )}
                {studentIds !== null && (
                    <span className="text-sm font-medium text-muted-foreground">
                        {t("adminAnalytics.studentsScope", { count: studentIds.length })}
                    </span>
                )}
            </div>

            {/* key на scope — форсируем пересчёт при смене области */}
            {studentIds !== null && (
                <SubjectFailures key={scope} studentIds={studentIds} />
            )}
        </div>
    );
}
