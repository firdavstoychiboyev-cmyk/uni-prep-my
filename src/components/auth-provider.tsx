"use client";

import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuthStore } from "../store/useAuthStore";
import { useLanguageStore, LANGUAGE_STORAGE_KEY } from "../store/useLanguageStore";
import { getUserProfile } from "../lib/auth-utils";
import { DEFAULT_LANGUAGE, Language } from "../lib/firestore-schema";
import { useRouter, usePathname } from "next/navigation";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
    const { setUser, setLoading } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();
    // Keep a ref so the listener can read the current pathname without being
    // in the effect's dependency array (which would re-subscribe on every navigation).
    const pathnameRef = useRef(pathname);
    useEffect(() => { pathnameRef.current = pathname; }, [pathname]);

    // Гидрируем язык из localStorage до авторизации (чтобы экран входа был на нужном языке)
    useEffect(() => {
        try {
            const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;
            if (saved === "ru" || saved === "uz") useLanguageStore.getState().setLanguage(saved);
        } catch {
            /* ignore */
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setLoading(true);
            const currentPath = pathnameRef.current;
            if (firebaseUser) {
                const profile = await getUserProfile(firebaseUser.uid);
                if (profile) {
                    setUser(profile);
                    useLanguageStore.getState().setLanguage(profile.language || DEFAULT_LANGUAGE);
                    // Если профиль есть и роль выбрана, но мы на логине или онбординге - в дашборд
                    // (или на страницу из ?returnTo=, если пришли с точки действия)
                    if (profile.role && (currentPath === "/login" || currentPath === "/onboarding")) {
                        const returnTo = new URLSearchParams(window.location.search).get("returnTo");
                        router.push(returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/home");
                    } else if (!profile.role && currentPath !== "/onboarding") {
                        // Если роль не выбрана - на онбординг
                        router.push("/onboarding");
                    }
                } else {
                    // Если профиля в БД нет - на онбординг для создания
                    setUser(null);
                    if (currentPath !== "/onboarding") {
                        router.push("/onboarding");
                    }
                }
            } else {
                // Неавторизованные пользователи могут свободно просматривать сайт.
                // Доступ к защищённым страницам контролируется в (dashboard)/layout.tsx,
                // а точки действий (старт теста и т.п.) сами ведут на /login.
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    // pathnameRef is stable — intentionally omitted from deps to prevent re-subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setUser, setLoading, router]);

    return <>{children}</>;
}
