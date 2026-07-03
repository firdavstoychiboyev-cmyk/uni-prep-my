"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { updateUserProfile, updateUserIdentifiers, isValidUsername, normalizePhone } from "@/lib/auth-utils";
import { Check, Copy, Pencil, X } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function SettingsProfilePage() {
    const { user, setUser } = useAuthStore();
    const { t } = useTranslation();
    const [copied, setCopied] = useState(false);
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [username, setUsername] = useState("");
    const [phone, setPhone] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!user) return;
        setName(user.name || "");
        setSurname(user.surname || "");
        setUsername(user.username || "");
        setPhone(user.phone || "");
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
        setFormError(null);

        const trimmedUsername = username.trim();
        if (trimmedUsername && !isValidUsername(trimmedUsername)) {
            setFormError(t("settings.usernameInvalid"));
            return;
        }
        let normalizedPhone = "";
        if (phone.trim()) {
            const result = normalizePhone(phone);
            if (!result) {
                setFormError(t("settings.phoneInvalid"));
                return;
            }
            normalizedPhone = result;
        }

        try {
            setSaving(true);
            let updated = await updateUserProfile(user.id, { name: name.trim(), surname: surname.trim() });
            updated = await updateUserIdentifiers(updated, {
                username: trimmedUsername,
                phone: normalizedPhone,
            });
            setUser(updated);
            setOpen(false);
        } catch (err) {
            const code = err instanceof Error ? err.message : "";
            if (code === "username-taken") setFormError(t("settings.usernameTaken"));
            else if (code === "phone-taken") setFormError(t("settings.phoneTaken"));
            else setFormError(t("settings.profileError"));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-3xl">
            <div className="rounded-3xl border border-border bg-card p-8">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">{t("settings.account")}</h2>
                <p className="text-sm text-muted-foreground mt-2">{t("settings.basicData")}</p>

                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <div className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.name")}</div>
                        <div className="mt-2 text-lg font-semibold text-foreground">
                            {user.name} {user.surname || ""}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.email")}</div>
                        <div className="mt-2 text-lg font-semibold text-foreground">{user.email}</div>
                    </div>
                    <div>
                        <div className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.username")}</div>
                        <div className="mt-2 text-lg font-semibold text-foreground">
                            {user.username ? `@${user.username}` : <span className="text-muted-foreground">{t("settings.notSet")}</span>}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.phone")}</div>
                        <div className="mt-2 text-lg font-semibold text-foreground">
                            {user.phone || <span className="text-muted-foreground">{t("settings.notSet")}</span>}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.role")}</div>
                        <div className="mt-2 text-sm font-bold text-foreground inline-flex items-center px-3 py-1 rounded-full bg-muted border border-border">
                            {user.role}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.memberId")}</div>
                        <div className="mt-2 flex items-center gap-2">
                            <code className="text-sm font-mono font-bold text-muted-foreground px-3 py-2 rounded-2xl bg-muted border border-border">
                                {user.shortId || user.id}
                            </code>
                            <button
                                type="button"
                                onClick={copyId}
                                className="h-10 w-10 rounded-2xl border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center"
                                title={t("settings.copy")}
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
                        {t("settings.editProfile")}
                    </button>
                </div>
            </div>

            {open && (
                <div className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-3xl border border-border bg-card shadow-xl overflow-hidden">
                        <div className="p-7">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-foreground">{t("settings.editProfileTitle")}</h2>
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
                                    <label className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.name")}</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-2 w-full h-12 px-4 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-blue))]/20 focus:border-[hsl(var(--brand-blue))]"
                                        placeholder={t("settings.name")}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.surname")}</label>
                                    <input
                                        value={surname}
                                        onChange={(e) => setSurname(e.target.value)}
                                        className="mt-2 w-full h-12 px-4 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-blue))]/20 focus:border-[hsl(var(--brand-blue))]"
                                        placeholder={t("settings.surname")}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.username")}</label>
                                    <input
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="mt-2 w-full h-12 px-4 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-blue))]/20 focus:border-[hsl(var(--brand-blue))]"
                                        placeholder={t("settings.usernamePlaceholder")}
                                        autoComplete="off"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.phone")}</label>
                                    <input
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="mt-2 w-full h-12 px-4 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-blue))]/20 focus:border-[hsl(var(--brand-blue))]"
                                        placeholder="+998 90 123 45 67"
                                        type="tel"
                                        autoComplete="tel"
                                    />
                                </div>

                                {formError && (
                                    <div
                                        role="alert"
                                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                                    >
                                        {formError}
                                    </div>
                                )}

                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="flex-1 h-12 rounded-2xl border border-border bg-card hover:bg-muted font-semibold text-sm transition-colors"
                                    >
                                        {t("common.cancel")}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving || name.trim().length < 2}
                                        className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
                                    >
                                        {saving ? t("common.saving") : t("common.save")}
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

