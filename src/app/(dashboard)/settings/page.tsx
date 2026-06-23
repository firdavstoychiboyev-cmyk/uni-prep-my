"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/store/useAuthStore";
import { useLanguageStore } from "@/store/useLanguageStore";
import { useSubjectsStore } from "@/store/useSubjectsStore";
import { useStatsStore } from "@/store/useStatsStore";
import { updateUserProfile, updateUserLanguage, logOut } from "@/lib/auth-utils";
import { pageCache } from "@/lib/page-cache";
import { Language } from "@/lib/firestore-schema";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { auth, db } from "@/lib/firebase";
import { deleteUser } from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import { Check, Copy, Pencil, X, User2, Palette, Trophy, ShieldAlert, Settings, Languages } from "lucide-react";

type SectionId = "profile" | "language" | "appearance" | "achievements" | "account-actions";

const sections: Array<{ id: SectionId; labelKey: string }> = [
    { id: "profile", labelKey: "settings.profile" },
    { id: "language", labelKey: "settings.language" },
    { id: "appearance", labelKey: "settings.appearance" },
    { id: "achievements", labelKey: "settings.achievements" },
    { id: "account-actions", labelKey: "settings.accountActions" },
];

const LANGUAGE_OPTIONS: Array<{ value: Language; label: string; nativeKey: string; flag: string }> = [
    { value: "ru", label: "Русский", nativeKey: "lang.ru.native", flag: "🇷🇺" },
    { value: "uz", label: "O‘zbekcha", nativeKey: "lang.uz.native", flag: "🇺🇿" },
];

function scrollToSection(id: SectionId) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
}

export default function SettingsPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const { user, setUser } = useAuthStore();
    const { language, setLanguage } = useLanguageStore();

    const [active, setActive] = useState<SectionId>("profile");

    // language switcher
    const [langSaving, setLangSaving] = useState<Language | null>(null);

    // profile editor modal
    const [copied, setCopied] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [saving, setSaving] = useState(false);

    // account actions
    const [busy, setBusy] = useState<"logout" | "delete" | null>(null);

    useEffect(() => {
        if (!user) return;
        setName(user.name || "");
        setSurname(user.surname || "");
    }, [user]);

    useEffect(() => {
        const hash = (window.location.hash || "").replace("#", "") as SectionId;
        if (hash && sections.some((s) => s.id === hash)) {
            setActive(hash);
            // let layout paint first
            setTimeout(() => scrollToSection(hash), 0);
        }
    }, []);

    useEffect(() => {
        const ids = sections.map((s) => s.id);
        const els = ids
            .map((id) => document.getElementById(id))
            .filter(Boolean) as HTMLElement[];

        if (els.length === 0) return;

        const io = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));
                if (visible[0]?.target?.id) setActive(visible[0].target.id as SectionId);
            },
            {
                root: null,
                // account for topbar
                rootMargin: "-96px 0px -70% 0px",
                threshold: [0.05, 0.2, 0.4],
            }
        );

        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    const copyId = () => {
        if (!user) return;
        navigator.clipboard.writeText(user.shortId || user.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || name.trim().length < 2) return;
        try {
            setSaving(true);
            const updated = await updateUserProfile(user.id, { name: name.trim(), surname: surname.trim() });
            setUser(updated);
            setEditOpen(false);
        } catch {
            alert(t("settings.profileError"));
        } finally {
            setSaving(false);
        }
    };

    const changeLanguage = async (lang: Language) => {
        if (!user || lang === language || langSaving) return;
        try {
            setLangSaving(lang);
            const updated = await updateUserLanguage(user.id, lang);
            setUser(updated);
            setLanguage(lang);
            // Контент зависит от языка — сбрасываем кэши и сторы, чтобы данные перезагрузились
            pageCache.invalidatePrefix("subjects");
            pageCache.invalidatePrefix("topics");
            pageCache.invalidatePrefix("questions");
            useSubjectsStore.setState({ subjects: [], loaded: false });
            useStatsStore.getState().reset();
        } catch {
            alert(t("settings.languageError"));
        } finally {
            setLangSaving(null);
        }
    };

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
            await deleteDoc(doc(db, "users", u.uid)).catch(() => {});
            await deleteUser(u);
            router.push("/login");
        } catch {
            alert(t("settings.deleteError"));
        } finally {
            setBusy(null);
        }
    };

    const memberId = useMemo(() => (user ? user.shortId || user.id : ""), [user]);

    if (!user) return null;

    return (
        <div className="w-full">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[hsl(var(--brand-blue-soft))] border border-border flex items-center justify-center">
                    <Settings className="w-5 h-5 text-[hsl(var(--brand-blue))]" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight text-foreground">{t("settings.title")}</h1>
            </div>

            {/* Mobile menu (simple) */}
            <div className="lg:hidden mt-6 flex flex-wrap gap-2">
                {sections.map((s) => (
                    <button
                        key={s.id}
                        type="button"
                        onClick={() => scrollToSection(s.id)}
                        className={`px-4 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                            active === s.id ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground"
                        }`}
                    >
                        {t(s.labelKey)}
                    </button>
                ))}
            </div>

            <div className="mt-10 space-y-10">
                {/* PROFILE */}
                <section id="profile" className="scroll-mt-28">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
                            <User2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("settings.account")}</h2>
                    </div>
                    <div className="mt-6 rounded-2xl border border-border bg-card p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                                <div className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.role")}</div>
                                <div className="mt-2 text-sm font-bold text-foreground inline-flex items-center px-3 py-1 rounded-full bg-muted border border-border">
                                    {user.role}
                                </div>
                            </div>
                            <div>
                                <div className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.memberId")}</div>
                                <div className="mt-2 flex items-center gap-2">
                                    <code className="text-sm font-mono font-bold text-muted-foreground px-3 py-2 rounded-xl bg-muted border border-border">
                                        {memberId}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={copyId}
                                        className="h-10 w-10 rounded-xl border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center"
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
                                onClick={() => setEditOpen(true)}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 active:scale-[0.98] transition-all"
                            >
                                <Pencil className="w-4 h-4" />
                                {t("settings.editProfile")}
                            </button>
                        </div>
                    </div>
                </section>

                {/* LANGUAGE */}
                <section id="language" className="scroll-mt-28">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
                            <Languages className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("settings.language")}</h2>
                    </div>
                    <div className="mt-6 rounded-2xl border border-border bg-card p-8">
                        <div className="text-sm text-muted-foreground mb-5">
                            {t("settings.languageDesc")}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {LANGUAGE_OPTIONS.map((opt) => {
                                const selected = language === opt.value;
                                const saving = langSaving === opt.value;
                                return (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => changeLanguage(opt.value)}
                                        disabled={langSaving !== null}
                                        className={`flex items-center justify-between gap-4 rounded-2xl border p-5 text-left transition-all disabled:opacity-60 ${
                                            selected
                                                ? "border-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue-soft))] dark:bg-[hsl(var(--brand-blue))]/15"
                                                : "border-border bg-muted hover:bg-muted/70"
                                        }`}
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <span className="text-2xl leading-none">{opt.flag}</span>
                                            <div className="min-w-0">
                                                <div className="text-base font-semibold text-foreground truncate">{opt.label}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5 truncate">{t(opt.nativeKey)}</div>
                                            </div>
                                        </div>
                                        <span
                                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                                selected ? "border-[hsl(var(--brand-blue))] bg-[hsl(var(--brand-blue))] text-white" : "border-border"
                                            }`}
                                        >
                                            {saving ? (
                                                <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--brand-blue))] animate-pulse" />
                                            ) : selected ? (
                                                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                            ) : null}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* APPEARANCE */}
                <section id="appearance" className="scroll-mt-28">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
                            <Palette className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("settings.appearance")}</h2>
                    </div>
                    <div className="mt-6 rounded-2xl border border-border bg-card p-8">
                        <div className="flex items-center justify-between gap-6 rounded-2xl border border-border bg-muted p-6">
                            <div>
                                <div className="text-base font-semibold text-foreground">{t("settings.appearanceLabel")}</div>
                                <div className="text-sm text-muted-foreground mt-1">{t("settings.appearanceDesc")}</div>
                            </div>
                            <ThemeToggle />
                        </div>
                    </div>
                </section>

                {/* ACHIEVEMENTS */}
                <section id="achievements" className="scroll-mt-28">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
                            <Trophy className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("settings.achievements")}</h2>
                    </div>
                    <div className="mt-6 rounded-2xl border border-border bg-card p-8">
                        <div className="rounded-2xl border border-border bg-muted p-6 flex items-center justify-between gap-6">
                            <div className="min-w-0">
                                <div className="text-base font-semibold text-foreground">{t("settings.openAchievements")}</div>
                                <div className="text-sm text-muted-foreground mt-1">{t("settings.openAchievementsDesc")}</div>
                            </div>
                            <Link
                                href="/achievements"
                                className="shrink-0 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all"
                            >
                                {t("common.open")}
                            </Link>
                        </div>
                    </div>
                </section>

                {/* ACCOUNT ACTIONS */}
                <section id="account-actions" className="scroll-mt-28">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
                            <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">{t("settings.accountActions")}</h2>
                    </div>
                    <div className="mt-6 rounded-2xl border border-border bg-card p-8">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="rounded-2xl border border-border bg-muted px-6 py-4 flex items-center justify-between gap-6">
                                <div>
                                    <div className="text-base font-semibold text-foreground">{t("settings.logout")}</div>
                                    <div className="text-sm text-muted-foreground mt-1">{t("settings.logoutDesc")}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={doLogout}
                                    disabled={busy !== null}
                                    className="shrink-0 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {busy === "logout" ? t("settings.loggingOut") : t("settings.logout")}
                                </button>
                            </div>

                            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 flex items-center justify-between gap-6">
                                <div>
                                    <div className="text-base font-semibold text-red-700">{t("settings.deleteAccount")}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={doDelete}
                                    disabled={busy !== null}
                                    className="shrink-0 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {busy === "delete" ? t("common.deleting") : t("common.delete")}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            {editOpen && (
                <div className="fixed inset-0 z-[500] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                        <div className="p-7">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-foreground">{t("settings.editProfileTitle")}</h2>
                                <button
                                    type="button"
                                    onClick={() => setEditOpen(false)}
                                    className="h-9 w-9 rounded-xl border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center"
                                >
                                    <X className="w-4 h-4 text-muted-foreground" />
                                </button>
                            </div>

                            <form onSubmit={saveProfile} className="mt-6 space-y-4">
                                <div>
                                    <label className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.name")}</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-2 w-full h-12 px-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-blue))]/20 focus:border-[hsl(var(--brand-blue))]"
                                        placeholder={t("settings.name")}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">{t("settings.surname")}</label>
                                    <input
                                        value={surname}
                                        onChange={(e) => setSurname(e.target.value)}
                                        className="mt-2 w-full h-12 px-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-blue))]/20 focus:border-[hsl(var(--brand-blue))]"
                                        placeholder={t("settings.surname")}
                                    />
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditOpen(false)}
                                        className="flex-1 h-12 rounded-xl border border-border bg-card hover:bg-muted font-semibold text-sm transition-colors"
                                    >
                                        {t("common.cancel")}
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving || name.trim().length < 2}
                                        className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
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

