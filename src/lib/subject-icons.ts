import {
    Calculator, Atom, FlaskConical, Leaf, Landmark, Globe,
    BookMarked, Languages, Monitor, Users, Dumbbell, Music,
    Palette, BookOpen, PenLine, Microscope, type LucideIcon,
} from "lucide-react";

export type AccentKey = "purple" | "blue" | "emerald" | "amber" | "rose" | "sky" | "indigo" | "teal" | "orange" | "neutral";

export function getSubjectMeta(name: string, id: string): { icon: LucideIcon; accent: AccentKey } {
    const n = name.toLowerCase();
    if (id === "english" || n.includes("англ") || n.includes("иностран")) return { icon: Languages, accent: "purple" };
    if (id === "math" || n.includes("матем")) return { icon: Calculator, accent: "blue" };
    if (n.includes("физик")) return { icon: Atom, accent: "sky" };
    if (n.includes("хими")) return { icon: FlaskConical, accent: "emerald" };
    if (n.includes("биол") || n.includes("естеств")) return { icon: Microscope, accent: "teal" };
    if (n.includes("литерат")) return { icon: BookMarked, accent: "rose" };
    if (n.includes("русск") || n.includes("родн") || n.includes("язык")) return { icon: PenLine, accent: "indigo" };
    if (n.includes("истор")) return { icon: Landmark, accent: "amber" };
    if (n.includes("географ")) return { icon: Globe, accent: "teal" };
    if (n.includes("информ")) return { icon: Monitor, accent: "blue" };
    if (n.includes("общест")) return { icon: Users, accent: "orange" };
    if (n.includes("физкульт") || n.includes("спорт")) return { icon: Dumbbell, accent: "rose" };
    if (n.includes("музык")) return { icon: Music, accent: "purple" };
    if (n.includes("рисов") || n.includes("изо") || n.includes("черчен")) return { icon: Palette, accent: "orange" };
    if (n.includes("биолог") || n.includes("природ")) return { icon: Leaf, accent: "emerald" };
    return { icon: BookOpen, accent: "neutral" };
}

export const ACCENT_ICON_COLORS: Record<AccentKey, string> = {
    purple: "text-purple-600 dark:text-purple-300",
    blue:   "text-blue-600 dark:text-blue-300",
    sky:    "text-sky-600 dark:text-sky-300",
    emerald:"text-emerald-600 dark:text-emerald-300",
    teal:   "text-teal-600 dark:text-teal-300",
    indigo: "text-indigo-600 dark:text-indigo-300",
    amber:  "text-amber-600 dark:text-amber-300",
    rose:   "text-rose-600 dark:text-rose-300",
    orange: "text-orange-600 dark:text-orange-300",
    neutral:"text-muted-foreground",
};

export const ACCENT_ICON_BG: Record<AccentKey, string> = {
    purple: "bg-purple-100 dark:bg-purple-950/50",
    blue:   "bg-blue-100 dark:bg-blue-950/50",
    sky:    "bg-sky-100 dark:bg-sky-950/50",
    emerald:"bg-emerald-100 dark:bg-emerald-950/50",
    teal:   "bg-teal-100 dark:bg-teal-950/50",
    indigo: "bg-indigo-100 dark:bg-indigo-950/50",
    amber:  "bg-amber-100 dark:bg-amber-950/50",
    rose:   "bg-rose-100 dark:bg-rose-950/50",
    orange: "bg-orange-100 dark:bg-orange-950/50",
    neutral:"bg-muted",
};
