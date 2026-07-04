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
    /** Идентичность-цвет (hex) — точка в сайдбаре; совпадает с началом градиента */
    base: string;
    /** Насыщенный двухтональный градиент — доминирующий фон карточки */
    gradFrom: string;
    gradTo: string;
    /** Тёмный акцент для текста на белой кнопке (контраст на белом) */
    ink: string;
}

/**
 * Токены на каждый акцент. Градиент — уверенный, насыщенный (не пастель, но и
 * не неон); тот же вид в светлой и тёмной теме, т.к. карточка сама несёт цвет.
 */
export const ACCENTS: Record<SubjectAccent, AccentTokens> = {
    blue:    { base: "#3B82F6", gradFrom: "#3B82F6", gradTo: "#4F46E5", ink: "#1D4ED8" }, // vivid blue → indigo
    violet:  { base: "#A855F7", gradFrom: "#A855F7", gradTo: "#7C3AED", ink: "#6D28D9" }, // purple → violet
    pink:    { base: "#EC4899", gradFrom: "#EC4899", gradTo: "#F43F5E", ink: "#BE185D" }, // pink → rose
    emerald: { base: "#10B981", gradFrom: "#10B981", gradTo: "#0D9488", ink: "#047857" }, // green → teal
    amber:   { base: "#F59E0B", gradFrom: "#F59E0B", gradTo: "#F97316", ink: "#B45309" }, // amber → orange
    teal:    { base: "#06B6D4", gradFrom: "#06B6D4", gradTo: "#2563EB", ink: "#0369A1" }, // cyan → blue (physics)
    red:     { base: "#EF4444", gradFrom: "#EF4444", gradTo: "#F43F5E", ink: "#B91C1C" }, // red → rose
    indigo:  { base: "#6366F1", gradFrom: "#6366F1", gradTo: "#4338CA", ink: "#4338CA" },
    sky:     { base: "#0EA5E9", gradFrom: "#0EA5E9", gradTo: "#2563EB", ink: "#0369A1" },
    orange:  { base: "#F97316", gradFrom: "#FB923C", gradTo: "#EA580C", ink: "#C2410C" },
    neutral: { base: "#64748B", gradFrom: "#64748B", gradTo: "#475569", ink: "#334155" },
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
