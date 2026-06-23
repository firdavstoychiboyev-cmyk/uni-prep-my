import { create } from "zustand";
import { Language, DEFAULT_LANGUAGE } from "../lib/firestore-schema";

export const LANGUAGE_STORAGE_KEY = "uni-prep-language";

interface LanguageState {
    language: Language;
    setLanguage: (language: Language) => void;
}

/**
 * Текущий язык интерфейса и контента.
 * Источник истины — поле `language` в профиле пользователя; дублируется в localStorage,
 * чтобы язык был доступен до авторизации (экран входа) и не мигал при перезагрузке.
 * Инициализируется значением по умолчанию (совпадает с SSR), затем гидрируется в AuthProvider.
 */
export const useLanguageStore = create<LanguageState>((set) => ({
    language: DEFAULT_LANGUAGE,
    setLanguage: (language) => {
        try {
            localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
        } catch {
            /* ignore */
        }
        set({ language });
    },
}));
