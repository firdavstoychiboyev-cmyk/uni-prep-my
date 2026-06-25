"use client";

import { useEffect } from "react";
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
            if (firebaseUser) {
                const profile = await getUserProfile(firebaseUser.uid);
                if (profile) {
                    setUser(profile);
                    useLanguageStore.getState().setLanguage(profile.language || DEFAULT_LANGUAGE);
                    // Если профиль есть и роль выбрана, но мы на логине или онбординге - в дашборд
                    if (profile.role && (pathname === "/login" || pathname === "/onboarding")) {
                        router.push("/home");
                    } else if (!profile.role && pathname !== "/onboarding") {
                        // Если роль не выбрана - на онбординг
                        router.push("/onboarding");
                    }
                } else {
                    // Если профиля в БД нет - на онбординг для создания
                    setUser(null);
                    if (pathname !== "/onboarding") {
                        router.push("/onboarding");
                    }
                }
            } else {
                setUser(null);
                if (pathname !== "/login" && pathname !== "/") {
                    router.push("/login");
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [setUser, setLoading, router, pathname]);

    return <>{children}</>;
}
