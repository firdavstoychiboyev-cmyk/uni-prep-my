"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Library, ClipboardCheck, LineChart, Sun, Moon, type LucideIcon } from "lucide-react";
import {
    signInWithGoogle,
    signInWithIdentifier,
    signUpWithEmail,
    sendPasswordReset,
    IdentifierNotFoundError,
    isValidUsername,
    normalizePhone,
} from "@/lib/auth-utils";
import { useAuthStore } from "@/store/useAuthStore";

const THEME_KEY = "uni-prep-theme";

type ThemeMode = "light" | "dark";
type FormMode = "login" | "signup";

function applyTheme(mode: ThemeMode) {
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
}

const content = {
    uz: {
        welcome: "Xush kelibsiz",
        subtitle: "Hisobingizga kiring va o'z rivojlanishingizni kuzating.",
        loginTab: "Kirish",
        signupTab: "Ro'yxatdan o'tish",
        identifierLabel: "Login",
        identifierPlaceholder: "Email, telefon raqami yoki username",
        passwordLabel: "Parol",
        passwordPlaceholder: "Parolingiz",
        loginSubmit: "Kirish",
        signupSubmit: "Ro'yxatdan o'tish",
        submitting: "Yuklanmoqda...",
        or: "yoki",
        googleBtn: "Google orqali kirish",
        connecting: "Ulanmoqda...",
        emailLabel: "Email",
        emailPlaceholder: "email@example.com",
        usernameLabel: "Username",
        usernamePlaceholder: "masalan: firdavs_01",
        phoneLabel: "Telefon (ixtiyoriy)",
        phonePlaceholder: "+998 90 123 45 67",
        newPasswordPlaceholder: "Kamida 6 ta belgi",
        forgotPassword: "Parolni unutdingizmi?",
        resetSent: "Parolni tiklash havolasi emailingizga yuborildi.",
        resetNeedId: "Avval login maydonini to'ldiring.",
        error: "Xato yuz berdi. Qaytadan urining.",
        wrongCreds: "Login yoki parol noto'g'ri.",
        notFoundUsername: "Bunday username bilan hisob topilmadi.",
        notFoundPhone: "Bu telefon raqami bilan hisob topilmadi.",
        usernameTaken: "Bu username allaqachon band.",
        phoneTaken: "Bu telefon raqami allaqachon ro'yxatdan o'tgan.",
        usernameInvalid: "Username 3-20 belgi: lotin harfi bilan boshlanadi, faqat harflar, raqamlar va _.",
        phoneInvalid: "Telefon raqami noto'g'ri. Masalan: +998 90 123 45 67.",
        passwordShort: "Parol kamida 6 ta belgidan iborat bo'lishi kerak.",
        emailInUse: "Bu email allaqachon ro'yxatdan o'tgan.",
        emailInvalid: "Email manzili noto'g'ri.",
        feature1: "Mavzular bo'yicha materiallar va mashqlar",
        feature2: "Tezkor fikr-mulohaza bilan testlar",
        feature3: "Bosh sahifada progress va yutuqlar",
    },
    ru: {
        welcome: "С возвращением",
        subtitle: "Войдите в аккаунт, чтобы продолжить занятия и смотреть прогресс.",
        loginTab: "Вход",
        signupTab: "Регистрация",
        identifierLabel: "Логин",
        identifierPlaceholder: "Email, номер телефона или username",
        passwordLabel: "Пароль",
        passwordPlaceholder: "Ваш пароль",
        loginSubmit: "Войти",
        signupSubmit: "Зарегистрироваться",
        submitting: "Загрузка...",
        or: "или",
        googleBtn: "Войти через Google",
        connecting: "Подключение...",
        emailLabel: "Email",
        emailPlaceholder: "email@example.com",
        usernameLabel: "Username",
        usernamePlaceholder: "например: firdavs_01",
        phoneLabel: "Телефон (необязательно)",
        phonePlaceholder: "+998 90 123 45 67",
        newPasswordPlaceholder: "Минимум 6 символов",
        forgotPassword: "Забыли пароль?",
        resetSent: "Ссылка для сброса пароля отправлена на ваш email.",
        resetNeedId: "Сначала заполните поле логина.",
        error: "Произошла ошибка. Попробуйте снова.",
        wrongCreds: "Неверный логин или пароль.",
        notFoundUsername: "Аккаунт с таким username не найден.",
        notFoundPhone: "Аккаунт с таким номером телефона не найден.",
        usernameTaken: "Этот username уже занят.",
        phoneTaken: "Этот номер телефона уже зарегистрирован.",
        usernameInvalid: "Username: 3-20 символов, начинается с латинской буквы, только буквы, цифры и _.",
        phoneInvalid: "Неверный номер телефона. Например: +998 90 123 45 67.",
        passwordShort: "Пароль должен содержать минимум 6 символов.",
        emailInUse: "Этот email уже зарегистрирован.",
        emailInvalid: "Неверный адрес email.",
        feature1: "Материалы и тренировка по темам в карточках предметов",
        feature2: "Тесты с мгновенной обратной связью",
        feature3: "Графики прогресса и достижения на главной",
    },
};

const featureIcons: LucideIcon[] = [Library, ClipboardCheck, LineChart];

const inputClass =
    "w-full rounded-2xl border border-border bg-background px-4 py-3.5 text-sm text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-foreground/10";

const labelClass = "ml-0.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export default function LoginPage() {
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [lang, setLang] = useState<"uz" | "ru">("uz");
    const [theme, setTheme] = useState<ThemeMode>("light");
    const [mode, setMode] = useState<FormMode>("login");
    const [busy, setBusy] = useState(false);
    const { isLoading } = useAuthStore();

    // Login form
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");

    // Signup form
    const [signupEmail, setSignupEmail] = useState("");
    const [signupUsername, setSignupUsername] = useState("");
    const [signupPhone, setSignupPhone] = useState("");
    const [signupPassword, setSignupPassword] = useState("");

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

    const t = content[lang];
    const features = [t.feature1, t.feature2, t.feature3];

    const switchMode = (next: FormMode) => {
        setMode(next);
        setError(null);
        setInfo(null);
    };

    const handleGoogleLogin = async () => {
        try {
            setError(null);
            setInfo(null);
            await signInWithGoogle();
        } catch (err) {
            setError(err instanceof Error ? err.message : t.error);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identifier.trim() || !password || busy) return;
        setError(null);
        setInfo(null);
        setBusy(true);
        try {
            await signInWithIdentifier(identifier, password);
            // Дальше редиректит AuthProvider (onAuthStateChanged)
        } catch (err) {
            if (err instanceof IdentifierNotFoundError) {
                setError(err.identifierType === "phone" ? t.notFoundPhone : t.notFoundUsername);
            } else {
                // Для email-пути не раскрываем, что именно неверно
                setError(t.wrongCreds);
            }
        } finally {
            setBusy(false);
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (busy) return;
        setError(null);
        setInfo(null);

        if (!isValidUsername(signupUsername)) {
            setError(t.usernameInvalid);
            return;
        }
        let phone: string | undefined;
        if (signupPhone.trim()) {
            const normalized = normalizePhone(signupPhone);
            if (!normalized) {
                setError(t.phoneInvalid);
                return;
            }
            phone = normalized;
        }
        if (signupPassword.length < 6) {
            setError(t.passwordShort);
            return;
        }

        setBusy(true);
        try {
            await signUpWithEmail({
                email: signupEmail,
                password: signupPassword,
                username: signupUsername,
                phone,
            });
            // Дальше AuthProvider отправит на /onboarding
        } catch (err) {
            const code = err instanceof Error ? err.message : "";
            const fbCode = (err as { code?: string })?.code || "";
            if (code === "username-taken") setError(t.usernameTaken);
            else if (code === "phone-taken") setError(t.phoneTaken);
            else if (fbCode === "auth/email-already-in-use") setError(t.emailInUse);
            else if (fbCode === "auth/invalid-email") setError(t.emailInvalid);
            else if (fbCode === "auth/weak-password") setError(t.passwordShort);
            else setError(t.error);
        } finally {
            setBusy(false);
        }
    };

    const handleForgotPassword = async () => {
        if (busy) return;
        setError(null);
        setInfo(null);
        if (!identifier.trim()) {
            setError(t.resetNeedId);
            return;
        }
        setBusy(true);
        try {
            await sendPasswordReset(identifier);
            setInfo(t.resetSent);
        } catch (err) {
            if (err instanceof IdentifierNotFoundError) {
                setError(err.identifierType === "phone" ? t.notFoundPhone : t.notFoundUsername);
            } else {
                setError(t.error);
            }
        } finally {
            setBusy(false);
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
                                <Image src="/gogg.png" alt="" fill className="object-contain" priority />
                            </div>
                            <span className="text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.75rem]">
                                Kulcha
                            </span>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-md transition-shadow duration-300">
                        <div className="px-6 py-8 sm:px-8 sm:py-10">
                            <div className="mb-6 text-center">
                                <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                                    {t.welcome}
                                </h1>
                                <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                                    {t.subtitle}
                                </p>
                            </div>

                            {/* Login / Signup tabs */}
                            <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-muted p-1">
                                {(["login", "signup"] as FormMode[]).map((m) => (
                                    <button
                                        key={m}
                                        type="button"
                                        onClick={() => switchMode(m)}
                                        className={`rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                                            mode === m
                                                ? "bg-card text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {m === "login" ? t.loginTab : t.signupTab}
                                    </button>
                                ))}
                            </div>

                            {error && (
                                <div
                                    role="alert"
                                    className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400"
                                >
                                    {error}
                                </div>
                            )}
                            {info && (
                                <div
                                    role="status"
                                    className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                                >
                                    {info}
                                </div>
                            )}

                            {mode === "login" ? (
                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className={labelClass}>{t.identifierLabel}</label>
                                        <input
                                            type="text"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            placeholder={t.identifierPlaceholder}
                                            autoComplete="username"
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={labelClass}>{t.passwordLabel}</label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder={t.passwordPlaceholder}
                                            autoComplete="current-password"
                                            className={inputClass}
                                            required
                                        />
                                        <div className="flex justify-end pt-0.5">
                                            <button
                                                type="button"
                                                onClick={handleForgotPassword}
                                                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                {t.forgotPassword}
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={busy || isLoading}
                                        className="w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                                    >
                                        {busy ? t.submitting : t.loginSubmit}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleSignup} className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className={labelClass}>{t.emailLabel}</label>
                                        <input
                                            type="email"
                                            value={signupEmail}
                                            onChange={(e) => setSignupEmail(e.target.value)}
                                            placeholder={t.emailPlaceholder}
                                            autoComplete="email"
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={labelClass}>{t.usernameLabel}</label>
                                        <input
                                            type="text"
                                            value={signupUsername}
                                            onChange={(e) => setSignupUsername(e.target.value)}
                                            placeholder={t.usernamePlaceholder}
                                            autoComplete="off"
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={labelClass}>{t.phoneLabel}</label>
                                        <input
                                            type="tel"
                                            value={signupPhone}
                                            onChange={(e) => setSignupPhone(e.target.value)}
                                            placeholder={t.phonePlaceholder}
                                            autoComplete="tel"
                                            className={inputClass}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className={labelClass}>{t.passwordLabel}</label>
                                        <input
                                            type="password"
                                            value={signupPassword}
                                            onChange={(e) => setSignupPassword(e.target.value)}
                                            placeholder={t.newPasswordPlaceholder}
                                            autoComplete="new-password"
                                            minLength={6}
                                            className={inputClass}
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={busy || isLoading}
                                        className="w-full rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:opacity-95 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                                    >
                                        {busy ? t.submitting : t.signupSubmit}
                                    </button>
                                </form>
                            )}

                            <div className="my-6 flex items-center gap-3">
                                <div className="h-px flex-1 bg-border" />
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {t.or}
                                </span>
                                <div className="h-px flex-1 bg-border" />
                            </div>

                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={isLoading || busy}
                                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card py-4 pl-5 pr-6 text-sm font-semibold text-foreground shadow-sm transition-all duration-200 hover:border-muted-foreground/30 hover:bg-muted active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                            >
                                <Image src="/google.png" alt="" width={22} height={22} className="shrink-0" />
                                {isLoading ? t.connecting : t.googleBtn}
                            </button>

                            <ul className="mt-10 space-y-4">
                                {features.map((text, i) => {
                                    const Icon = featureIcons[i];
                                    return (
                                        <li key={i} className="flex gap-3">
                                            <div
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-muted-foreground"
                                                aria-hidden
                                            >
                                                <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.75} />
                                            </div>
                                            <span className="text-sm leading-snug text-muted-foreground">{text}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
