"use client";

import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { fetchAdminUsers } from "@/lib/admin-utils";
import { useAdminScopeStore, REGISTAN_ORG } from "@/store/useAdminScopeStore";
import { User } from "@/lib/firestore-schema";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * Список пользователей (ученики/учителя) с учётом области данных админ-панели.
 * В scope "registan" показываются только пользователи организации Registan.
 */
export default function AdminUsersList({ role, titleKey }: { role: "student" | "teacher"; titleKey: string }) {
    const { t } = useTranslation();
    const { scope } = useAdminScopeStore();
    const [users, setUsers] = useState<User[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        setUsers(null);
        fetchAdminUsers(role, scope)
            .then((data) => { if (!cancelled) setUsers(data.sort((a, b) => (a.name || "").localeCompare(b.name || ""))); })
            .catch(() => { if (!cancelled) setUsers([]); });
        return () => { cancelled = true; };
    }, [role, scope]);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t(titleKey)}</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {scope === "registan" ? t("adminScope.registanNote") : t("admin.overviewSubtitle")}
                </p>
            </div>

            {scope === "registan" && (
                <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                    <Landmark size={13} /> {t("adminScope.registan")}
                </span>
            )}

            {users === null ? (
                <div className="flex flex-col gap-2">
                    {[1, 2, 3, 4].map((n) => <div key={n} className="h-12 animate-pulse rounded-lg bg-muted" />)}
                </div>
            ) : users.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card px-6 py-12 text-center text-sm font-medium text-muted-foreground">
                    {t("adminUsers.empty")}
                </div>
            ) : (
                <>
                    <p className="text-sm font-medium text-muted-foreground">{t("adminUsers.count", { count: users.length })}</p>
                    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    <th className="px-5 py-3">{t("adminUsers.name")}</th>
                                    <th className="px-3 py-3">{t("adminUsers.shortId")}</th>
                                    <th className="px-3 py-3">{t("adminUsers.email")}</th>
                                    <th className="px-3 py-3">{t("adminUsers.org")}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {users.map((u) => (
                                    <tr key={u.id} className="hover:bg-muted/40">
                                        <td className="px-5 py-3">
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-xs font-bold text-foreground">
                                                    {u.name?.[0]?.toUpperCase() || "?"}
                                                </span>
                                                <span className="font-semibold text-foreground">{u.name} {u.surname || ""}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 font-mono text-muted-foreground">{u.shortId || "—"}</td>
                                        <td className="px-3 py-3 text-muted-foreground">{u.email || "—"}</td>
                                        <td className="px-3 py-3">
                                            {u.organization === REGISTAN_ORG ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                                                    <Landmark size={10} /> Registan
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground/60">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
