"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuthStore } from "@/store/useAuthStore";
import { updateUserProfile, logOut } from "@/lib/auth-utils";
import { auth, db } from "@/lib/firebase";
import { deleteUser } from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import { Check, Copy, Pencil, X, User2, Palette, Trophy, ShieldAlert, Settings } from "lucide-react";

type SectionId = "profile" | "appearance" | "achievements" | "account-actions";

const sections: Array<{ id: SectionId; title: string; description?: string }> = [
    { id: "profile", title: "Account", description: "Profile" },
    { id: "appearance", title: "Preferences", description: "Appearance" },
    { id: "achievements", title: "Achievements", description: "Achievements" },
    { id: "account-actions", title: "Account Actions", description: "Account Actions" },
];

function scrollToSection(id: SectionId) {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
}

export default function SettingsPage() {
    const router = useRouter();
    const { user, setUser } = useAuthStore();

    const [active, setActive] = useState<SectionId>("profile");

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
            alert("Ошибка при обновлении профиля");
        } finally {
            setSaving(false);
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
        if (!confirm("Удалить аккаунт? Это действие необратимо.")) return;
        try {
            setBusy("delete");
            const u = auth.currentUser;
            if (!u) return;
            await deleteDoc(doc(db, "users", u.uid)).catch(() => {});
            await deleteUser(u);
            router.push("/login");
        } catch {
            alert("Не удалось удалить аккаунт. Возможно, нужно заново войти в аккаунт и повторить.");
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
                <h1 className="text-4xl font-bold tracking-tight text-foreground">Settings</h1>
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
                        {s.description || s.title}
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
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Account</h2>
                    </div>
                    <div className="mt-6 rounded-2xl border border-border bg-card p-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                                    <code className="text-sm font-mono font-bold text-muted-foreground px-3 py-2 rounded-xl bg-muted border border-border">
                                        {memberId}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={copyId}
                                        className="h-10 w-10 rounded-xl border border-border bg-card hover:bg-muted transition-colors flex items-center justify-center"
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
                                onClick={() => setEditOpen(true)}
                                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 active:scale-[0.98] transition-all"
                            >
                                <Pencil className="w-4 h-4" />
                                Edit profile
                            </button>
                        </div>
                    </div>
                </section>

                {/* APPEARANCE */}
                <section id="appearance" className="scroll-mt-28">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
                            <Palette className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Preferences</h2>
                    </div>
                    <div className="mt-6 rounded-2xl border border-border bg-card p-8">
                        <div className="flex items-center justify-between gap-6 rounded-2xl border border-border bg-muted p-6">
                            <div>
                                <div className="text-base font-semibold text-foreground">Appearance</div>
                                <div className="text-sm text-muted-foreground mt-1">Светлая / тёмная тема.</div>
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
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Achievements</h2>
                    </div>
                    <div className="mt-6 rounded-2xl border border-border bg-card p-8">
                        <div className="rounded-2xl border border-border bg-muted p-6 flex items-center justify-between gap-6">
                            <div className="min-w-0">
                                <div className="text-base font-semibold text-foreground">Open achievements</div>
                                <div className="text-sm text-muted-foreground mt-1">Переход на существующий раздел.</div>
                            </div>
                            <Link
                                href="/achievements"
                                className="shrink-0 px-5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all"
                            >
                                Open
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
                        <h2 className="text-2xl font-bold tracking-tight text-foreground">Account Actions</h2>
                    </div>
                    <div className="mt-6 rounded-2xl border border-border bg-card p-8">
                        <div className="grid grid-cols-1 gap-4">
                            <div className="rounded-2xl border border-border bg-muted px-6 py-4 flex items-center justify-between gap-6">
                                <div>
                                    <div className="text-base font-semibold text-foreground">Sign out</div>
                                    <div className="text-sm text-muted-foreground mt-1">Выйти из аккаунта на этом устройстве.</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={doLogout}
                                    disabled={busy !== null}
                                    className="shrink-0 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {busy === "logout" ? "Signing out…" : "Sign out"}
                                </button>
                            </div>

                            <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-4 flex items-center justify-between gap-6">
                                <div>
                                    <div className="text-base font-semibold text-red-700">Delete account</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={doDelete}
                                    disabled={busy !== null}
                                    className="shrink-0 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {busy === "delete" ? "Deleting…" : "Delete"}
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
                                <h2 className="text-xl font-bold text-foreground">Edit profile</h2>
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
                                    <label className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">Name</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="mt-2 w-full h-12 px-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-blue))]/20 focus:border-[hsl(var(--brand-blue))]"
                                        placeholder="Name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black tracking-[0.18em] uppercase text-muted-foreground">Surname</label>
                                    <input
                                        value={surname}
                                        onChange={(e) => setSurname(e.target.value)}
                                        className="mt-2 w-full h-12 px-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[hsl(var(--brand-blue))]/20 focus:border-[hsl(var(--brand-blue))]"
                                        placeholder="Surname"
                                    />
                                </div>

                                <div className="pt-2 flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setEditOpen(false)}
                                        className="flex-1 h-12 rounded-xl border border-border bg-card hover:bg-muted font-semibold text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving || name.trim().length < 2}
                                        className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
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

