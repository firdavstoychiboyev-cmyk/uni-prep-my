"use client";

import { useCallback } from "react";
import { useLanguageStore } from "../../store/useLanguageStore";
import { translations } from "./translations";
import { DEFAULT_LANGUAGE } from "../firestore-schema";

/**
 * Хук перевода интерфейса. Возвращает t(key, vars?) и текущий язык.
 *   const { t } = useTranslation();
 *   t("nav.home")                       → "Главная" / "Asosiy"
 *   t("home.subjectsCount", { count })  → "7 предметов" / "7 ta fan"
 * Неизвестный ключ возвращается как есть (удобно для отладки).
 *
 * t мемоизирован (меняется только при смене языка) — его можно безопасно
 * указывать в зависимостях useEffect/useCallback без бесконечных перерендеров.
 */
export function useTranslation() {
    const language = useLanguageStore((s) => s.language);

    const t = useCallback((key: string, vars?: Record<string, string | number>): string => {
        const dict = translations[language] ?? translations[DEFAULT_LANGUAGE];
        let str = dict[key] ?? translations[DEFAULT_LANGUAGE][key] ?? key;
        if (vars) {
            for (const k of Object.keys(vars)) {
                str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
            }
        }
        return str;
    }, [language]);

    return { t, language };
}
