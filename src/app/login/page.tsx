"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Library, ClipboardCheck, LineChart, Sun, Moon, type LucideIcon } from "lucide-react";
import { signInWithGoogle } from "@/lib/auth-utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/lib/i18n/useTranslation";

const features: { icon: LucideIcon; textKey: string }[] = [
    { icon: Library, textKey: "login.feature1" },
    { icon: ClipboardCheck, textKey: "login.feature2" },
    { icon: LineChart, textKey: "login.feature3" },
];

const THEME_KEY = "uni-prep-theme";

type ThemeMode = "light" | "dark";

function applyTheme(mode: ThemeMode) {
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
}

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [lang, setLang] = useState<"uz" | "ru">("uz");
    const [theme, setTheme] = useState<ThemeMode>("light");
    const { isLoading } = useAuthStore();
    const { t } = useTranslation();

    useEffect(() => {
        const saved = localStorage.getItem(THEME_KEY);
        const initial: ThemeMode = saved === "dark" ? "dark" : "light";
        setTheme(initial);
        applyTheme(initial);
    }, []);

    const toggleTheme = () => {
        const next: ThemeMode = theme === "dark" ? "light" : "dark";
        setTheme(next);
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
    };

    const handleLogin = async () => {
        try {
            setError(null);
            await signInWithGoogle();
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : t("login.error");
            setError(errorMessage);
        }
    };

    return (
        <div className="relative flex min-h-dvh flex-col bg-background text-foreground">
            {/* Top-right controls */}
            <div className="fixed top-4 right-4 flex items-center gap-2 z-50">
                <button
                    onClick={() => setLang(lang === "uz" ? "ru" : "uz")}
                    className="px-3 py-1.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors bg-background"
                >
                    {lang === "uz" ? "RU" : "UZ"}
                </button>
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-full border border-border hover:bg-muted transition-colors bg-background"
                    aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
                >
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
            </div>

            <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-12 sm:py-16">
                <div className="w-full max-w-[420px]">
                    <div className="mb-8 flex justify-center">
                        <div className="flex items-center gap-3">
                            <div className="relative h-14 w-14 shrink-0 sm:h-16 sm:w-16">
                                <Image
                                    src="/gogg.png"
                                    alt=""
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <span className="text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.75rem]">
                                UniPrep
                            </span>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-md transition-shadow duration-300">
                        <div className="px-6 py-8 sm:px-8 sm:py-10">
                            <div className="mb-8 text-center">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                    {t("login.welcomeBack")}
                                </h1>
                                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                                    {t("login.subtitle")}
                                </p>
                            </div>

                            {error ? (
                                <div
                                    role="alert"
                                    className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                                >
                                    {error}
                                </div>
                            ) : null}

                            <button
                                type="button"
                                onClick={handleLogin}
                                disabled={isLoading}
                                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card py-4 pl-5 pr-6 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:border-muted-foreground/30 hover:bg-muted active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                            >
                                <Image src="/google.png" alt="" width={22} height={22} className="shrink-0" />
                                {isLoading ? t("login.connecting") : t("login.signInGoogle")}
                            </button>

                            <ul className="mt-10 space-y-4">
                                {features.map(({ icon: Icon, textKey }) => (
                                    <li key={textKey} className="flex gap-3">
                                        <div
                                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground"
                                            aria-hidden
                                        >
                                            <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} />
                                        </div>
                                        <span className="text-sm leading-snug text-muted-foreground">{t(textKey)}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
