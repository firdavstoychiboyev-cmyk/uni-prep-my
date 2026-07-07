"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Filial, User } from "@/lib/firestore-schema";
import { fetchFilials } from "@/lib/admin-utils";
import { GitCompare, RefreshCw, Info, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FilialStats {
    filial: Filial;
    /** students with role === "student" */
    students: number;
    /** students with totalCorrect > 0 */
    activeStudents: number;
    teachers: number;
    /** mean totalCorrect among students; null if no students */
    avgCorrect: number | null;
    /** mean accuracy among active students; null if no active students */
    avgAccuracy: number | null;
    accessCodes: number;
    /** students registered within the last 30 days */
    newStudents30d: number;
}

interface PlatformTotals {
    students: number;
    activeStudents: number;
    teachers: number;
    accessCodes: number;
    newStudents30d: number;
    avgCorrect: number | null;
    avgAccuracy: number | null;
}

type SortCol = "name" | "students" | "active" | "avgSolved" | "avgAccuracy" | "teachers" | "new30d" | "codes";
type SortDir = "asc" | "desc";

// ── Data loader (2 Firestore queries total) ───────────────────────────────────

async function loadStats(filials: Filial[]): Promise<{ rows: FilialStats[]; platform: PlatformTotals }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString();

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

    const rows: FilialStats[] = filials.map((f) => {
        const members = users.filter((u) => u.filialId === f.id);
        const students = members.filter((u) => u.role === "student");
        const teachers = members.filter((u) => u.role === "teacher");
        const active = students.filter((u) => (u.totalCorrect ?? 0) > 0);
        const newStudents30d = students.filter((u) => u.createdAt >= cutoff).length;

        const avgCorrect =
            students.length > 0
                ? Math.round(students.reduce((s, u) => s + (u.totalCorrect ?? 0), 0) / students.length)
                : null;

        const avgAccuracy =
            active.length > 0
                ? Math.round(active.reduce((s, u) => s + (u.accuracy ?? 0), 0) / active.length)
                : null;

        return {
            filial: f,
            students: students.length,
            activeStudents: active.length,
            teachers: teachers.length,
            avgCorrect,
            avgAccuracy,
            accessCodes: codesByFilial[f.id] ?? 0,
            newStudents30d,
        };
    });

    // Platform-wide averages computed from raw user data (not averaged averages)
    const allStudents = users.filter((u) => u.role === "student");
    const allActive = allStudents.filter((u) => (u.totalCorrect ?? 0) > 0);
    const allCodes = Object.values(codesByFilial).reduce((s, n) => s + n, 0);

    const platform: PlatformTotals = {
        students: rows.reduce((s, r) => s + r.students, 0),
        activeStudents: rows.reduce((s, r) => s + r.activeStudents, 0),
        teachers: rows.reduce((s, r) => s + r.teachers, 0),
        accessCodes: allCodes,
        newStudents30d: rows.reduce((s, r) => s + r.newStudents30d, 0),
        avgCorrect:
            allStudents.length > 0
                ? Math.round(allStudents.reduce((s, u) => s + (u.totalCorrect ?? 0), 0) / allStudents.length)
                : null,
        avgAccuracy:
            allActive.length > 0
                ? Math.round(allActive.reduce((s, u) => s + (u.accuracy ?? 0), 0) / allActive.length)
                : null,
    };

    return { rows, platform };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SortHeader({
    col, label, hint, current, dir, onClick, align = "center",
}: {
    col: SortCol;
    label: string;
    hint?: string;
    current: SortCol;
    dir: SortDir;
    onClick: (col: SortCol) => void;
    align?: "left" | "center";
}) {
    const active = current === col;
    return (
        <th
            className={`px-4 py-3 cursor-pointer select-none text-[11px] font-bold uppercase tracking-wider transition-colors hover:text-foreground ${active ? "text-foreground" : "text-muted-foreground"} ${align === "left" ? "text-left" : "text-center"}`}
            onClick={() => onClick(col)}
            title={hint}
        >
            <span className={`inline-flex items-center gap-1 ${align === "center" ? "justify-center w-full" : ""}`}>
                {label}
                {active ? (
                    dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                ) : (
                    <ArrowUpDown size={10} className="opacity-30" />
                )}
            </span>
        </th>
    );
}

function NumCell({ value, highlight = false, suffix = "" }: { value: number | null; highlight?: boolean; suffix?: string }) {
    if (value === null) {
        return (
            <td className="px-4 py-4 text-center">
                <span className="text-xs text-muted-foreground/40">—</span>
            </td>
        );
    }
    return (
        <td className="px-4 py-4 text-center tabular-nums">
            <span className={`text-sm font-bold ${highlight && value > 0 ? "text-foreground" : value === 0 ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                {value}{suffix}
            </span>
        </td>
    );
}

function ActiveCell({ active, total }: { active: number; total: number }) {
    const pct = total > 0 ? Math.round((active / total) * 100) : 0;
    return (
        <td className="px-4 py-4 text-center tabular-nums">
            <div className="flex flex-col items-center gap-1.5">
                <span className={`text-sm font-bold ${active > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>
                    {active}
                </span>
                {total > 0 && (
                    <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                        <div
                            className="h-full rounded-full bg-emerald-500 transition-[width]"
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                )}
            </div>
        </td>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDirectorPage() {
    const { t } = useTranslation();
    const [rows, setRows] = useState<FilialStats[] | null>(null);
    const [platform, setPlatform] = useState<PlatformTotals | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [sortCol, setSortCol] = useState<SortCol>("students");
    const [sortDir, setSortDir] = useState<SortDir>("desc");

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const filials = await fetchFilials();
            const data = await loadStats(filials);
            setRows(data.rows);
            setPlatform(data.platform);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const toggleSort = useCallback((col: SortCol) => {
        setSortCol((prev) => {
            if (prev === col) {
                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                return col;
            }
            setSortDir(col === "name" ? "asc" : "desc");
            return col;
        });
    }, []);

    const sorted = useMemo(() => {
        if (!rows) return [];
        return [...rows].sort((a, b) => {
            const d = sortDir === "asc" ? 1 : -1;
            switch (sortCol) {
                case "name":      return d * a.filial.name.ru.localeCompare(b.filial.name.ru);
                case "students":  return d * (a.students - b.students);
                case "active":    return d * (a.activeStudents - b.activeStudents);
                case "avgSolved": return d * ((a.avgCorrect ?? -1) - (b.avgCorrect ?? -1));
                case "avgAccuracy": return d * ((a.avgAccuracy ?? -1) - (b.avgAccuracy ?? -1));
                case "teachers":  return d * (a.teachers - b.teachers);
                case "new30d":    return d * (a.newStudents30d - b.newStudents30d);
                case "codes":     return d * (a.accessCodes - b.accessCodes);
                default:          return 0;
            }
        });
    }, [rows, sortCol, sortDir]);

    const sh = (col: SortCol, label: string, hint?: string, align?: "left" | "center") => (
        <SortHeader col={col} label={label} hint={hint} current={sortCol} dir={sortDir} onClick={toggleSort} align={align} />
    );

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
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

            {/* Table */}
            <div className="overflow-x-auto overflow-hidden rounded-2xl border border-border bg-card">
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
                ) : !rows || rows.length === 0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">{t("adminDirector.empty")}</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                {sh("name", t("adminDirector.colFilial"), undefined, "left")}
                                {sh("students", t("adminDirector.colStudents"))}
                                {sh("active", t("adminDirector.colActive"), t("adminDirector.activeHint"))}
                                {sh("avgSolved", t("adminDirector.colAvgSolved"), t("adminDirector.avgSolvedHint"))}
                                {sh("avgAccuracy", t("adminDirector.colAvgAccuracy"), t("adminDirector.accuracyHint"))}
                                {sh("teachers", t("adminDirector.colTeachers"))}
                                {sh("new30d", t("adminDirector.colNew30d"))}
                                {sh("codes", t("adminDirector.colCodes"))}
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((row) => (
                                <tr key={row.filial.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                                    <td className="px-5 py-4">
                                        <div className="font-semibold text-foreground">{row.filial.name.ru}</div>
                                        <div className="text-xs text-muted-foreground">{row.filial.name.uz}</div>
                                    </td>
                                    <NumCell value={row.students} highlight />
                                    <ActiveCell active={row.activeStudents} total={row.students} />
                                    <NumCell value={row.avgCorrect} highlight />
                                    <NumCell value={row.avgAccuracy} highlight suffix="%" />
                                    <NumCell value={row.teachers} highlight />
                                    <NumCell value={row.newStudents30d} highlight />
                                    <NumCell value={row.accessCodes} />
                                </tr>
                            ))}
                        </tbody>
                        {platform && (
                            <tfoot>
                                <tr className="border-t-2 border-border bg-muted/30">
                                    <td className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        {t("common.all")}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm font-bold tabular-nums text-foreground">{platform.students}</td>
                                    <td className="px-4 py-3 text-center text-sm font-bold tabular-nums text-foreground">{platform.activeStudents}</td>
                                    <td className="px-4 py-3 text-center text-sm font-bold tabular-nums text-foreground">
                                        {platform.avgCorrect ?? <span className="text-xs text-muted-foreground/40">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm font-bold tabular-nums text-foreground">
                                        {platform.avgAccuracy != null ? `${platform.avgAccuracy}%` : <span className="text-xs text-muted-foreground/40">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-center text-sm font-bold tabular-nums text-foreground">{platform.teachers}</td>
                                    <td className="px-4 py-3 text-center text-sm font-bold tabular-nums text-foreground">{platform.newStudents30d}</td>
                                    <td className="px-4 py-3 text-center text-sm font-bold tabular-nums text-foreground">{platform.accessCodes}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                )}
            </div>

            {/* Footer notes */}
            <div className="flex flex-col gap-2">
                <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                    <Info size={13} className="mt-0.5 shrink-0" />
                    {t("adminDirector.earlyDataNote")}
                </p>
                <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
                    <Info size={13} className="mt-0.5 shrink-0" />
                    {t("adminDirector.noFilialNote")}
                </p>
            </div>
        </div>
    );
}
