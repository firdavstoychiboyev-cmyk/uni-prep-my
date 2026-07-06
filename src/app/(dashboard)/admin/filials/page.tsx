"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Filial } from "@/lib/firestore-schema";
import { Building2, Plus, Trash2, RefreshCw } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { useAuthStore } from "@/store/useAuthStore";

export default function AdminFilialsPage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [filials, setFilials] = useState<Filial[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [errorKey, setErrorKey] = useState<string | null>(null);
    const [nameRu, setNameRu] = useState("");
    const [nameUz, setNameUz] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const snap = await getDocs(query(collection(db, "filials"), orderBy("createdAt", "asc")));
            setFilials(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Filial));
        } catch {
            setErrorKey("adminFilials.loadError");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void load(); }, [load]);

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        const ru = nameRu.trim();
        const uz = nameUz.trim();
        if (!ru || !uz || busy || !user) return;
        setErrorKey(null);
        setBusy(true);
        try {
            await addDoc(collection(db, "filials"), {
                name: { ru, uz },
                createdAt: serverTimestamp(),
                createdBy: user.id,
            });
            setNameRu("");
            setNameUz("");
            await load();
        } catch {
            setErrorKey("adminFilials.saveError");
        } finally {
            setBusy(false);
        }
    };

    const remove = async (f: Filial) => {
        if (!confirm(t("adminFilials.deleteConfirm").replace("{name}", f.name.ru))) return;
        await deleteDoc(doc(db, "filials", f.id));
        setFilials((prev) => prev.filter((x) => x.id !== f.id));
    };

    return (
        <div>
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
                        <Building2 size={22} />
                        {t("adminFilials.title")}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t("adminFilials.subtitle")}</p>
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <input
                        value={nameRu}
                        onChange={(e) => setNameRu(e.target.value)}
                        placeholder={t("adminFilials.nameRu")}
                        className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                        required
                    />
                    <input
                        value={nameUz}
                        onChange={(e) => setNameUz(e.target.value)}
                        placeholder={t("adminFilials.nameUz")}
                        className="h-11 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
                        required
                    />
                    <button
                        type="submit"
                        disabled={busy || !nameRu.trim() || !nameUz.trim()}
                        className="flex h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
                    >
                        <Plus size={16} />
                        {busy ? t("adminFilials.creating") : t("adminFilials.create")}
                    </button>
                </div>
                {errorKey && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{t(errorKey)}</p>}
            </form>

            {/* Filials table */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {loading ? (
                    <div className="space-y-2 p-5">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
                        ))}
                    </div>
                ) : filials.length === 0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">{t("adminFilials.empty")}</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                <th className="px-5 py-3">{t("adminFilials.colName")}</th>
                                <th className="px-3 py-3 hidden sm:table-cell">{t("adminFilials.colId")}</th>
                                <th className="px-3 py-3" />
                            </tr>
                        </thead>
                        <tbody>
                            {filials.map((f) => (
                                <tr key={f.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                                    <td className="px-5 py-3">
                                        <div className="font-semibold text-foreground">{f.name.ru}</div>
                                        <div className="text-xs text-muted-foreground">{f.name.uz}</div>
                                    </td>
                                    <td className="px-3 py-3 hidden sm:table-cell font-mono text-xs text-muted-foreground">{f.id}</td>
                                    <td className="px-3 py-3">
                                        <div className="flex justify-end pr-2">
                                            <button
                                                type="button"
                                                onClick={() => void remove(f)}
                                                title={t("common.delete")}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
