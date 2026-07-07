"use client";

import { useEffect, useState } from "react";
import { Landmark, Loader2 } from "lucide-react";
import { fetchAdminUsers, setUserRole, fetchFilials, setUserFilial } from "@/lib/admin-utils";
import { useAdminScope, REGISTAN_ORG } from "@/store/useAdminScopeStore";
import { useAuthStore } from "@/store/useAuthStore";
import { isSuperAdmin, isFilialAdmin, ASSIGNABLE_ROLES } from "@/lib/roles";
import { User, UserRole, Filial } from "@/lib/firestore-schema";
import { useTranslation } from "@/lib/i18n/useTranslation";

/**
 * Список пользователей (ученики/учителя) с учётом области данных админ-панели.
 * В scope "registan" показываются только пользователи организации Registan.
 */
export default function AdminUsersList({ role, titleKey }: { role: "student" | "teacher"; titleKey: string }) {
    const { t } = useTranslation();
    const { scope } = useAdminScope();
    const { user: me } = useAuthStore();
    const canManageRoles = isSuperAdmin(me); // роли меняет ТОЛЬКО супер-админ
    const [users, setUsers] = useState<User[] | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [filials, setFilials] = useState<Filial[]>([]);
    const [savingFilialId, setSavingFilialId] = useState<string | null>(null);

    const changeRole = async (id: string, role: UserRole) => {
        setSavingId(id);
        try {
            await setUserRole(id, role);
            setUsers((prev) => prev?.map((u) => (u.id === id ? { ...u, role } : u)) ?? prev);
        } catch (e) {
            console.error("Error setting role:", e);
        } finally {
            setSavingId(null);
        }
    };

    const changeFilial = async (id: string, filialId: string) => {
        setSavingFilialId(id);
        try {
            const value = filialId || null;
            await setUserFilial(id, value);
            setUsers((prev) => prev?.map((u) => (u.id === id ? { ...u, filialId: value ?? undefined } : u)) ?? prev);
        } catch (e) {
            console.error("Error setting filial:", e);
        } finally {
            setSavingFilialId(null);
        }
    };

    useEffect(() => {
        fetchFilials().then(setFilials).catch(() => setFilials([]));
    }, []);

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
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{t(titleKey)}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
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
                                    <th className="px-3 py-3">{t("adminUsers.filial")}</th>
                                    <th className="px-3 py-3">{t("adminUsers.role")}</th>
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
                                        <td className="px-3 py-3">
                                            {canManageRoles && isFilialAdmin(u) ? (
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={u.filialId ?? ""}
                                                        disabled={savingFilialId === u.id}
                                                        onChange={(e) => changeFilial(u.id, e.target.value)}
                                                        className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-50"
                                                    >
                                                        <option value="">{t("adminFilials.noFilial")}</option>
                                                        {filials.map((f) => (
                                                            <option key={f.id} value={f.id}>{f.name.ru}</option>
                                                        ))}
                                                    </select>
                                                    {savingFilialId === u.id && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
                                                </div>
                                            ) : u.filialId ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                                    {filials.find((f) => f.id === u.filialId)?.name.ru ?? u.filialId}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground/60">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-3">
                                            {canManageRoles ? (
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={u.role}
                                                        disabled={savingId === u.id}
                                                        onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                                                        className="h-8 rounded-lg border border-border bg-background px-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-50"
                                                    >
                                                        {ASSIGNABLE_ROLES.map((r) => (
                                                            <option key={r} value={r}>{t(`role.${r}`)}</option>
                                                        ))}
                                                    </select>
                                                    {savingId === u.id && <Loader2 size={13} className="animate-spin text-muted-foreground" />}
                                                </div>
                                            ) : (
                                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${u.role === "registanAdmin" ? "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300" : "bg-muted text-muted-foreground"}`}>
                                                    {t(`role.${u.role}`)}
                                                </span>
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
