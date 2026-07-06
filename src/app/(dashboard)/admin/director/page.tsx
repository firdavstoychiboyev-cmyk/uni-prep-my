"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Filial, User } from "@/lib/firestore-schema";
import { fetchFilials } from "@/lib/admin-utils";
import { GitCompare, RefreshCw, Info } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface FilialStats {
    filial: Filial;
    students: number;
    teachers: number;
    accessCodes: number;
}

/**
 * Собирает статистику по каждому филиалу за два запроса:
 *   1. Все пользователи Registan (один запрос, группировка на клиенте)
 *   2. Все коды доступа Registan (один запрос, группировка на клиенте)
 */
async function loadFilialStats(filials: Filial[]): Promise<FilialStats[]> {
    const [usersSnap, codesSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("organization", "==", "registan"))),
        getDocs(query(collection(db, "accessCodes"), where("organization", "==", "registan"))),
    ]);

    const users = usersSnap.docs.map((d) => d.data() as User);
    const codesByFilial: Record<string, number> = {};
    codesSnap.docs.forEach((d) => {
        const fid = (d.data() as { filialId?: string }).filialId;
        if (fid) codesByFilial[fid] = (codesByFilial[fid] ?? 0) + 1;
    });

    return filials.map((f) => {
        const members = users.filter((u) => u.filialId === f.id);
        return {
            filial: f,
            students: members.filter((u) => u.role === "student").length,
            teachers: members.filter((u) => u.role === "teacher").length,
            accessCodes: codesByFilial[f.id] ?? 0,
        };
    });
}

function StatCell({ value, highlight }: { value: number; highlight?: boolean }) {
    return (
        <td className="px-4 py-4 text-center tabular-nums">
            <span className={`text-sm font-bold ${highlight && value > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                {value}
            </span>
        </td>
    );
}

export default function AdminDirectorPage() {
    const { t } = useTranslation();
    const [stats, setStats] = useState<FilialStats[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const filials = await fetchFilials();
            const data = await loadFilialStats(filials);
            setStats(data);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const totals = stats
        ? {
              students: stats.reduce((s, r) => s + r.students, 0),
              teachers: stats.reduce((s, r) => s + r.teachers, 0),
              accessCodes: stats.reduce((s, r) => s + r.accessCodes, 0),
          }
        : null;

    return (
        <div>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
                        <GitCompare size={22} />
                        {t("adminDirector.title")}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t("adminDirector.subtitle")}</p>
                </div>
                <button
                    type="button"
                    onClick={() => void load()}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title={t("adminCodes.refresh")}
                >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {loading ? (
                    <div className="space-y-2 p-5">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                        ))}
                    </div>
                ) : error ? (
                    <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">
                        {t("adminFilials.loadError")}
                    </p>
                ) : !stats || stats.length === 0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">{t("adminDirector.empty")}</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                <th className="px-5 py-3 text-left">{t("adminDirector.colFilial")}</th>
                                <th className="px-4 py-3">{t("adminDirector.colStudents")}</th>
                                <th className="px-4 py-3">{t("adminDirector.colTeachers")}</th>
                                <th className="px-4 py-3">{t("adminDirector.colCodes")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.map((row) => (
                                <tr key={row.filial.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                                    <td className="px-5 py-4">
                                        <div className="font-semibold text-foreground">{row.filial.name.ru}</div>
                                        <div className="text-xs text-muted-foreground">{row.filial.name.uz}</div>
                                    </td>
                                    <StatCell value={row.students} highlight />
                                    <StatCell value={row.teachers} highlight />
                                    <StatCell value={row.accessCodes} />
                                </tr>
                            ))}
                        </tbody>
                        {totals && (
                            <tfoot>
                                <tr className="border-t-2 border-border bg-muted/30">
                                    <td className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {t("common.all")}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm font-bold text-foreground tabular-nums">{totals.students}</td>
                                    <td className="px-4 py-3 text-center text-sm font-bold text-foreground tabular-nums">{totals.teachers}</td>
                                    <td className="px-4 py-3 text-center text-sm font-bold text-foreground tabular-nums">{totals.accessCodes}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                )}
            </div>

            <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                <Info size={13} className="mt-0.5 shrink-0" />
                {t("adminDirector.noFilialNote")}
            </p>
        </div>
    );
}
