"use client";

import { Language } from "@/lib/firestore-schema";

const OPTIONS: Array<{ value: Language; label: string }> = [
    { value: "ru", label: "🇷🇺 Русский" },
    { value: "uz", label: "🇺🇿 O‘zbekcha" },
];

/**
 * Переключатель языка контента в админ-панели.
 * Определяет, для какого языка создаётся контент и какой язык отображается в списках.
 */
export default function AdminLanguageToggle({
    value,
    onChange,
}: {
    value: Language;
    onChange: (lang: Language) => void;
}) {
    return (
        <div className="flex items-center gap-2 p-1 bg-muted rounded-xl w-fit">
            {OPTIONS.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    onClick={() => onChange(o.value)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        value === o.value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
