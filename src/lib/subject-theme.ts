import type { SVGProps } from "react";
import {
    CompassIcon, GlobeIcon, OpenBookIcon, LeafIcon,
    ColumnIcon, AtomIcon, FlaskIcon, BookIcon,
} from "@/components/subject-glyphs";

/**
 * Единый источник цвета и иконки для каждого предмета — используется и
 * карточками (/subjects, /statistics), и точками в сайдбаре, чтобы цветовой
 * язык был общим по всему приложению. Базовый цвет каждого предмета совпадает
 * с точкой в сайдбаре. Меняете палитру здесь — меняется везде.
 */
export type SubjectAccent =
    | "blue" | "violet" | "pink" | "emerald" | "amber"
    | "teal" | "red" | "indigo" | "sky" | "orange" | "neutral";

export interface AccentTokens {
    /** Идентичность-цвет (hex) — тот же, что точка в сайдбаре; основа градиента */
    base: string;
    /** Бейдж иконки: фон и цвет штриха (со светлым/тёмным вариантами) */
    iconBg: string;
    iconText: string;
    /** Цвет текста/иконки на белой пилюле-кнопке */
    buttonText: string;
}

/** Токены на каждый акцент. Классы Tailwind заданы литералами — иначе JIT их не соберёт. */
export const ACCENTS: Record<SubjectAccent, AccentTokens> = {
    blue:    { base: "#3B82F6", iconBg: "bg-blue-100 dark:bg-blue-500/15",    iconText: "text-blue-600 dark:text-blue-300",    buttonText: "text-blue-600 dark:text-blue-300" },
    violet:  { base: "#8B5CF6", iconBg: "bg-violet-100 dark:bg-violet-500/15", iconText: "text-violet-600 dark:text-violet-300", buttonText: "text-violet-600 dark:text-violet-300" },
    pink:    { base: "#EC4899", iconBg: "bg-pink-100 dark:bg-pink-500/15",    iconText: "text-pink-600 dark:text-pink-300",    buttonText: "text-pink-600 dark:text-pink-300" },
    emerald: { base: "#10B981", iconBg: "bg-emerald-100 dark:bg-emerald-500/15", iconText: "text-emerald-600 dark:text-emerald-300", buttonText: "text-emerald-600 dark:text-emerald-300" },
    amber:   { base: "#F59E0B", iconBg: "bg-amber-100 dark:bg-amber-500/15",  iconText: "text-amber-600 dark:text-amber-300",  buttonText: "text-amber-600 dark:text-amber-300" },
    teal:    { base: "#14B8A6", iconBg: "bg-teal-100 dark:bg-teal-500/15",    iconText: "text-teal-600 dark:text-teal-300",    buttonText: "text-teal-600 dark:text-teal-300" },
    red:     { base: "#EF4444", iconBg: "bg-red-100 dark:bg-red-500/15",      iconText: "text-red-600 dark:text-red-300",      buttonText: "text-red-600 dark:text-red-300" },
    indigo:  { base: "#6366F1", iconBg: "bg-indigo-100 dark:bg-indigo-500/15", iconText: "text-indigo-600 dark:text-indigo-300", buttonText: "text-indigo-600 dark:text-indigo-300" },
    sky:     { base: "#0EA5E9", iconBg: "bg-sky-100 dark:bg-sky-500/15",      iconText: "text-sky-600 dark:text-sky-300",      buttonText: "text-sky-600 dark:text-sky-300" },
    orange:  { base: "#F97316", iconBg: "bg-orange-100 dark:bg-orange-500/15", iconText: "text-orange-600 dark:text-orange-300", buttonText: "text-orange-600 dark:text-orange-300" },
    neutral: { base: "#737373", iconBg: "bg-muted",                            iconText: "text-muted-foreground",               buttonText: "text-foreground" },
};

export type SubjectGlyph = (props: SVGProps<SVGSVGElement>) => JSX.Element;

export interface SubjectTheme extends AccentTokens {
    accent: SubjectAccent;
    Icon: SubjectGlyph;
}

/**
 * Подбор акцента и иконки по названию/ID предмета (ru + uz). Порядок проверок
 * важен: узкие совпадения (ingliz tili, ona tili) идут раньше общих.
 */
export function getSubjectTheme(name: string, id = ""): SubjectTheme {
    const n = name.toLowerCase();
    const has = (...keys: string[]) => keys.some((k) => n.includes(k));
    let accent: SubjectAccent;
    let Icon: SubjectGlyph;

    if (id === "math" || has("матем", "matem")) { accent = "blue"; Icon = CompassIcon; }
    else if (id === "english" || has("англ", "иностран", "ingliz")) { accent = "violet"; Icon = GlobeIcon; }
    // Родной язык (Ona tili / Русский / Родной язык) — единый «нативный» цвет
    // во всех языках интерфейса, чтобы предмет не менял цвет между ru/uz.
    else if (has("ona til", "o'na", "o‘na", "родн", "русск")) { accent = "pink"; Icon = OpenBookIcon; }
    else if (has("физик", "fizika")) { accent = "teal"; Icon = AtomIcon; }
    else if (has("хими", "kimyo", "kimyё")) { accent = "red"; Icon = FlaskIcon; }
    else if (has("биол", "biolog", "естеств", "природ")) { accent = "emerald"; Icon = LeafIcon; }
    else if (has("истор", "tarix")) { accent = "amber"; Icon = ColumnIcon; }
    else if (has("географ", "geograf")) { accent = "sky"; Icon = GlobeIcon; }
    else if (has("литерат", "adabiyot")) { accent = "indigo"; Icon = OpenBookIcon; }
    else if (has("русск", "язык", "til")) { accent = "indigo"; Icon = OpenBookIcon; }
    else { accent = "neutral"; Icon = BookIcon; }

    return { accent, Icon, ...ACCENTS[accent] };
}

/** Точка в сайдбаре: идентичность-цвет предмета (совпадает с карточкой). */
export const subjectDotColor = (name: string, id = ""): string => getSubjectTheme(name, id).base;

/** hex → rgba со степенью прозрачности (для мягких градиентов карточек). */
export function rgba(hex: string, alpha: number): string {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
