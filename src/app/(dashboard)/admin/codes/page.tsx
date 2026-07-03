"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, doc, getDocs, orderBy, query, setDoc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AccessCode } from "@/lib/firestore-schema";
import { normalizeAccessCode } from "@/lib/auth-utils";
import { KeyRound, Plus, Trash2, RefreshCw, Power } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type CodeRow = AccessCode & { id: string };

const randomCode = (org: string) =>
    `${org.slice(0, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

export default function AdminCodesPage() {
    const { t } = useTranslation();
    const [codes, setCodes] = useState<CodeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    // Храним ключ перевода, а не готовый текст — загрузка не должна зависеть от t
    const [errorKey, setErrorKey] = useState<string | null>(null);

    // Create form
    const [newCode, setNewCode] = useState("");
    const [newOrg, setNewOrg] = useState("registan");
    const [newMaxUses, setNewMaxUses] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, "accessCodes"), orderBy("createdAt", "desc")));
            setCodes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as AccessCode) })));
        } catch (e) {
            console.error("Error loading access codes:", e);
            setErrorKey("adminCodes.loadError");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        const code = normalizeAccessCode(newCode);
        const org = newOrg.trim().toLowerCase();
        if (!code || !org || busy) return;
        setErrorKey(null);
        setBusy(true);
        try {
            const ref = doc(db, "accessCodes", code);
            if ((await getDoc(ref)).exists()) {
                setErrorKey("adminCodes.exists");
                return;
            }
            const data: AccessCode = {
                organization: org,
                active: true,
                createdAt: new Date().toISOString(),
                maxUses: newMaxUses.trim() ? Math.max(1, parseInt(newMaxUses, 10) || 1) : null,
                usesCount: 0,
            };
            await setDoc(ref, data);
            setNewCode("");
            setNewMaxUses("");
            await load();
        } catch (e) {
            console.error("Error creating access code:", e);
            setErrorKey("adminCodes.saveError");
        } finally {
            setBusy(false);
        }
    };

    const toggleActive = async (row: CodeRow) => {
        await updateDoc(doc(db, "accessCodes", row.id), { active: !row.active });
        setCodes((prev) => prev.map((c) => (c.id === row.id ? { ...c, active: !c.active } : c)));
    };

    const remove = async (row: CodeRow) => {
        if (!confirm(t("adminCodes.deleteConfirm").replace("{code}", row.id))) return;
        await deleteDoc(doc(db, "accessCodes", row.id));
        setCodes((prev) => prev.filter((c) => c.id !== row.id));
    };

    return (
        <div>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
                        <KeyRound size={22} />
                        {t("adminCodes.title")}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t("adminCodes.subtitle")}</p>
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

            {/* Create form */}
            <form onSubmit={create} className="mb-8 rounded-2xl border border-border bg-card p-5">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_120px_auto]">
                    <div className="flex gap-2">
                        <input
                            value={newCode}
                            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                            placeholder={t("adminCodes.codePlaceholder")}
                            className="h-11 w-full rounded-xl border border-border bg-background px-3.5 font-mono text-sm uppercase tracking-wide text-foreground placeholder:normal-case placeholder:font-sans placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setNewCode(randomCode(newOrg || "code"))}
                            className="h-11 shrink-0 rounded-xl border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            {t("adminCodes.generate")}
                        </button>
                    </div>
                    <input
                        value={newOrg}
                        onChange={(e) => setNewOrg(e.target.value)}
                        placeholder="registan"
                        className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                        required
                    />
                    <input
                        value={newMaxUses}
                        onChange={(e) => setNewMaxUses(e.target.value.replace(/\D/g, ""))}
                        placeholder={t("adminCodes.maxUsesPlaceholder")}
                        inputMode="numeric"
                        className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                    />
                    <button
                        type="submit"
                        disabled={busy || !newCode.trim() || !newOrg.trim()}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
                    >
                        <Plus size={16} />
                        {t("adminCodes.create")}
                    </button>
                </div>
                {errorKey && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{t(errorKey)}</p>}
            </form>

            {/* Codes table */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {loading ? (
                    <div className="space-y-2 p-5">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                        ))}
                    </div>
                ) : codes.length === 0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">{t("adminCodes.empty")}</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                <th className="px-5 py-3">{t("adminCodes.colCode")}</th>
                                <th className="px-3 py-3">{t("adminCodes.colOrg")}</th>
                                <th className="px-3 py-3">{t("adminCodes.colUses")}</th>
                                <th className="px-3 py-3">{t("adminCodes.colStatus")}</th>
                                <th className="px-3 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {codes.map((row) => {
                                const exhausted = row.maxUses != null && row.usesCount >= row.maxUses;
                                return (
                                    <tr key={row.id} className="border-b border-border last:border-0">
                                        <td className="px-5 py-3 font-mono font-bold text-foreground">{row.id}</td>
                                        <td className="px-3 py-3 text-muted-foreground">{row.organization}</td>
                                        <td className="px-3 py-3 text-muted-foreground">
                                            {row.usesCount}
                                            {row.maxUses != null ? ` / ${row.maxUses}` : ""}
                                        </td>
                                        <td className="px-3 py-3">
                                            <span
                                                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                                    !row.active
                                                        ? "bg-muted text-muted-foreground"
                                                        : exhausted
                                                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                                                          : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                }`}
                                            >
                                                {!row.active
                                                    ? t("adminCodes.statusInactive")
                                                    : exhausted
                                                      ? t("adminCodes.statusExhausted")
                                                      : t("adminCodes.statusActive")}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <div className="flex items-center justify-end gap-1.5 pr-2">
                                                <button
                                                    type="button"
                                                    onClick={() => void toggleActive(row)}
                                                    title={row.active ? t("adminCodes.deactivate") : t("adminCodes.activate")}
                                                    className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border transition-colors hover:bg-muted ${
                                                        row.active ? "text-emerald-500" : "text-muted-foreground"
                                                    }`}
                                                >
                                                    <Power size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void remove(row)}
                                                    title={t("common.delete")}
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
