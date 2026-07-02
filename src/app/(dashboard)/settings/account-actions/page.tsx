"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { logOut } from "@/lib/auth-utils";
import { deleteUser } from "firebase/auth";
import { collection, deleteDoc, doc, getDocs, writeBatch } from "firebase/firestore";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function SettingsAccountActionsPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [busy, setBusy] = useState<"logout" | "delete" | null>(null);

    const doLogout = async () => {
        try {
            setBusy("logout");
            await logOut();
            router.push("/login");
        } finally {
            setBusy(null);
        }
    };

    const doDelete = async () => {
        if (!confirm(t("settings.deleteConfirm"))) return;
        try {
            setBusy("delete");
            const u = auth.currentUser;
            if (!u) return;

            // best-effort cleanup: подколлекции удаляются явно — Firestore не удаляет их каскадно
            const subcollections = ["userProgress", "testResults", "badges", "ratings", "dailyActivity"];
            for (const sub of subcollections) {
                try {
                    const snap = await getDocs(collection(db, "users", u.uid, sub));
                    // Батчи по 400 (лимит Firestore — 500 операций на батч)
                    for (let i = 0; i < snap.docs.length; i += 400) {
                        const batch = writeBatch(db);
                        snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
                        await batch.commit();
                    }
                } catch { /* продолжаем удаление остальных */ }
            }
            await deleteDoc(doc(db, "users", u.uid)).catch(() => {});
            await deleteUser(u);
            router.push("/login");
        } catch {
            alert(t("settings.deleteError"));
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="max-w-3xl">
            <div className="rounded-3xl border border-border bg-card p-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("settings.accountActions")}</h1>
                <p className="text-sm text-muted-foreground mt-2">{t("settings.securityDesc")}</p>

                <div className="mt-8 grid grid-cols-1 gap-4">
                    <div className="rounded-3xl border border-border bg-muted p-6 flex items-center justify-between gap-6">
                        <div>
                            <div className="text-base font-semibold text-foreground">{t("settings.logout")}</div>
                            <div className="text-sm text-muted-foreground mt-1">{t("settings.logoutDesc")}</div>
                        </div>
                        <button
                            type="button"
                            onClick={doLogout}
                            disabled={busy !== null}
                            className="shrink-0 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {busy === "logout" ? t("settings.loggingOut") : t("settings.logout")}
                        </button>
                    </div>

                    <div className="rounded-3xl border border-red-200 bg-red-50 p-6 flex items-center justify-between gap-6">
                        <div>
                            <div className="text-base font-semibold text-red-700">{t("settings.deleteAccount")}</div>
                            <div className="text-sm text-red-700/70 mt-1">{t("settings.deleteFirebaseDesc")}</div>
                        </div>
                        <button
                            type="button"
                            onClick={doDelete}
                            disabled={busy !== null}
                            className="shrink-0 px-5 py-3 rounded-2xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {busy === "delete" ? t("common.deleting") : t("common.delete")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

