import type { SVGProps } from "react";
import {
    CompassIcon, OpenBookIcon, LeafIcon,
    ColumnIcon, AtomIcon, FlaskIcon, BookIcon,
} from "@/components/subject-glyphs";
import { IllustrationKey } from "@/components/subject-illustrations";

/**
 * Единый источник цвета/иконки для каждого предмета (палитра из Claude Design):
 * градиент from→to, цвет точки в сайдбаре (dot) и ключ большой иллюстрации.
 * Используется большими карточками /subjects, компактными карточками
 * /statistics и точками сайдбара — цвет предмета общий во всём приложении.
 * Меняете палитру здесь — меняется везде.
 */
export type SubjectGlyph = (props: SVGProps<SVGSVGElement>) => JSX.Element;

interface Palette {
    gradFrom: string;
    gradTo: string;
    /** Цвет точки в сайдбаре (Amaliyot) — совпадает с идентичностью предмета */
    dot: string;
    /** Тёмный акцент для текста на белой кнопке компактной карточки */
    ink: string;
    /** Компактная глиф-иконка (карточки /statistics, вне больших иллюстраций) */
    Icon: SubjectGlyph;
}

/** Палитра на каждый предмет — точные значения из макета. */
export const PALETTES: Record<IllustrationKey, Palette> = {
    math:      { gradFrom: "#2563eb", gradTo: "#22d3ee", dot: "#3b82f6", ink: "#1d4ed8", Icon: CompassIcon },
    english:   { gradFrom: "#d946ef", gradTo: "#f472b6", dot: "#ec4899", ink: "#a21caf", Icon: OpenBookIcon },
    native:    { gradFrom: "#7c3aed", gradTo: "#a78bfa", dot: "#8b5cf6", ink: "#6d28d9", Icon: OpenBookIcon },
    biology:   { gradFrom: "#059669", gradTo: "#4ade80", dot: "#22c55e", ink: "#047857", Icon: LeafIcon },
    history:   { gradFrom: "#ea580c", gradTo: "#fbbf24", dot: "#f59e0b", ink: "#b45309", Icon: ColumnIcon },
    physics:   { gradFrom: "#0891b2", gradTo: "#5eead4", dot: "#06b6d4", ink: "#0369a1", Icon: AtomIcon },
    chemistry: { gradFrom: "#e11d48", gradTo: "#fb7185", dot: "#f43f5e", ink: "#be123c", Icon: FlaskIcon },
    default:   { gradFrom: "#64748b", gradTo: "#94a3b8", dot: "#64748b", ink: "#334155", Icon: BookIcon },
};

export interface SubjectTheme extends Palette {
    key: IllustrationKey;
    /** Ключ большой иллюстрации (см. subject-illustrations) */
    illustration: IllustrationKey;
    /** Алиас dot для обратной совместимости (сайдбар/старые вызовы) */
    base: string;
}

/**
 * Подбор темы по названию/ID предмета (ru + uz). Порядок проверок важен:
 * узкие совпадения (ingliz tili, ona tili) идут раньше общих.
 */
export function getSubjectTheme(name: string, id = ""): SubjectTheme {
    const n = name.toLowerCase();
    const has = (...keys: string[]) => keys.some((k) => n.includes(k));

    let key: IllustrationKey;
    if (id === "math" || has("матем", "matem")) key = "math";
    else if (id === "english" || has("англ", "иностран", "ingliz")) key = "english";
    // Родной язык (Ona tili / Русский / Родной) — единый «нативный» цвет в ru/uz
    else if (has("ona til", "o'na", "o‘na", "родн", "русск")) key = "native";
    else if (has("физик", "fizika")) key = "physics";
    else if (has("хими", "kimyo", "kimyё")) key = "chemistry";
    else if (has("биол", "biolog", "естеств", "природ")) key = "biology";
    else if (has("истор", "tarix")) key = "history";
    else if (has("географ", "geograf")) key = "physics"; // близкая палитра
    else key = "default";

    const p = PALETTES[key];
    return { key, illustration: key, base: p.dot, ...p };
}

/** Точка в сайдбаре: идентичность-цвет предмета (совпадает с карточкой). */
export const subjectDotColor = (name: string, id = ""): string => getSubjectTheme(name, id).dot;

/** hex → rgba со степенью прозрачности (мягкие подложки, при необходимости). */
export function rgba(hex: string, alpha: number): string {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
