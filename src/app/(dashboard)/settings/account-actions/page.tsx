"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { logOut } from "@/lib/auth-utils";
import { deleteUser } from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";

export default function SettingsAccountActionsPage() {
    const router = useRouter();
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
        if (!confirm("Удалить аккаунт? Это действие необратимо.")) return;
        try {
            setBusy("delete");
            const u = auth.currentUser;
            if (!u) return;

            // best-effort cleanup of profile doc
            await deleteDoc(doc(db, "users", u.uid)).catch(() => {});
            await deleteUser(u);
            router.push("/login");
        } catch {
            alert("Не удалось удалить аккаунт. Возможно, нужно заново войти в аккаунт и повторить.");
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="max-w-3xl">
            <div className="rounded-3xl border border-border bg-card p-8">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Account Actions</h1>
                <p className="text-sm text-muted-foreground mt-2">Действия безопасности для аккаунта.</p>

                <div className="mt-8 grid grid-cols-1 gap-4">
                    <div className="rounded-3xl border border-border bg-muted p-6 flex items-center justify-between gap-6">
                        <div>
                            <div className="text-base font-semibold text-foreground">Sign out</div>
                            <div className="text-sm text-muted-foreground mt-1">Выйти из аккаунта на этом устройстве.</div>
                        </div>
                        <button
                            type="button"
                            onClick={doLogout}
                            disabled={busy !== null}
                            className="shrink-0 px-5 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {busy === "logout" ? "Signing out…" : "Sign out"}
                        </button>
                    </div>

                    <div className="rounded-3xl border border-red-200 bg-red-50 p-6 flex items-center justify-between gap-6">
                        <div>
                            <div className="text-base font-semibold text-red-700">Delete account</div>
                            <div className="text-sm text-red-700/70 mt-1">Удаляет ваш профиль и аккаунт Firebase.</div>
                        </div>
                        <button
                            type="button"
                            onClick={doDelete}
                            disabled={busy !== null}
                            className="shrink-0 px-5 py-3 rounded-2xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {busy === "delete" ? "Deleting…" : "Delete"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

