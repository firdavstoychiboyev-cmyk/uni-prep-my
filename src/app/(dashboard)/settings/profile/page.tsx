"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { updateUserProfile } from "@/lib/auth-utils";
import { Check, Copy, Pencil, X } from "lucide-react";

export default function SettingsProfilePage() {
    const { user, setUser } = useAuthStore();
    const [copied, setCopied] = useState(false);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) return;
        setName(user.name || "");
        setSurname(user.surname || "");
    }, [user]);

    if (!user) return null;

    const copyId = () => {
        navigator.clipboard.writeText(user.shortId || user.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name.trim().length < 2) return;
        try {
            setSaving(true);
            const updated = await updateUserProfile(user.id, { name: name.trim(), surname: surname.trim() });
            setUser(updated);
            setOpen(false);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl">
            <div className="rounded-3xl border border-border bg-card p-8">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">Account</h2>
                <p className="text-sm text-muted-foreground mt-2">Основные данные аккаунта.</p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <div className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">Name</div>
                        <div className="mt-2 text-lg font-semibold text-foreground">
                            {user.name} {user.surname || ""}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">Email</div>
                        <div className="mt-2 text-lg font-semibold text-foreground">{user.email}</div>
                    </div>
                    <div>
                        <div className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">Role</div>
                        <div className="mt-2 text-sm font-bold text-foreground inline-flex items-center px-3 py-1 rounded-full bg-muted border border-border">
                            {user.role}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">Member ID</div>
                        <div className="mt-2 flex items-center gap-2">
                            <code className="text-sm font-mono font-bold text-muted-foreground px-3 py-2 rounded-2xl bg-muted border border-border">
                                {user.shortId || user.id}
                            </code>
                            <button
                                type="button"
                                onClick={copyId}
                                className="h-10 w-10 rounded-2xl border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center"
                                title="Copy"
                            >
                                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-10">
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 active:scale-[0.98] transition-all"
                    >
                        <Pencil className="w-4 h-4" />
                        Edit profile
                    </button>
                </div>
            </div>

            {open && (
                <div className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-xl overflow-hidden">
                        <div className="p-7">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-foreground">Edit profile</h2>
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="h-9 w-9 rounded-2xl border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center"
                                >
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </button>
                            </div>

                            <form onSubmit={save} className="mt-6 space-y-4">
                                <div>
                                    <label className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">Name</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-2 w-full h-12 px-4 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-blue))]/20 focus:border-[hsl(var(--brand-blue))]"
                                        placeholder="Name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">Surname</label>
                                    <input
                                        value={surname}
                                        onChange={(e) => setSurname(e.target.value)}
                                        className="mt-2 w-full h-12 px-4 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-blue))]/20 focus:border-[hsl(var(--brand-blue))]"
                                        placeholder="Surname"
                                    />
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="flex-1 h-12 rounded-2xl border border-border bg-card hover:bg-muted font-semibold text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving || name.trim().length < 2}
                                        className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
                                    >
                                        {saving ? "Saving…" : "Save"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

