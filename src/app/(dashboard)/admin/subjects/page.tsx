"use client";

import { Fragment, useEffect, useState } from "react";
import { adminFetchCollection, adminAddItem, adminDeleteItem, adminUpdateItem } from "@/lib/admin-utils";
import { Subject, Language } from "@/lib/firestore-schema";
import { getSubjectImage } from "@/lib/constants";
import { Plus, Trash2, Edit2, X, BookOpen } from "lucide-react";
import { pageCache } from "@/lib/page-cache";
import { useStatsStore } from "@/store/useStatsStore";
import AdminLanguageToggle from "@/components/admin-language-toggle";
import { useTranslation } from "@/lib/i18n/useTranslation";

function hexForColorInput(c: string | undefined): string {
    const t = c?.trim() ?? "";
    if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
    if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
        const r = t[1], g = t[2], b = t[3];
        return `#${r}${r}${g}${g}${b}${b}`;
    }
    return "#6366f1";
}

export default function AdminSubjectsPage() {
    const { t } = useTranslation();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Язык создаваемого/отображаемого контента
    const [contentLang, setContentLang] = useState<Language>("ru");

    // Форма создания
    const [name, setName] = useState("");
    const [color, setColor] = useState("#6366f1");
    const [translatable, setTranslatable] = useState(true);
    const [hasTextbooks, setHasTextbooks] = useState(false);

    // Форма редактирования
    const [editName, setEditName] = useState("");
    const [editColor, setEditColor] = useState("#6366f1");
    const [editOrder, setEditOrder] = useState("0");
    const [editBackgroundImage, setEditBackgroundImage] = useState("");
    const [editHasTextbooks, setEditHasTextbooks] = useState(false);

    useEffect(() => {
        adminFetchCollection("subjects", "order").then(data => {
            setSubjects(data as Subject[]);
            setIsLoading(false);
        });
    }, []);

    // Функция для генерации ID из названия (транслитерация в латиницу)
    const generateSubjectId = (name: string): string => {
        const translitMap: Record<string, string> = {
            "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "yo", "ж": "zh",
            "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m", "н": "n", "о": "o",
            "п": "p", "р": "r", "с": "s", "т": "t", "у": "u", "ф": "f", "х": "h", "ц": "ts",
            "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "", "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya"
        };
        
        const normalized = name.toLowerCase().trim();
        let id = "";
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized[i];
            if (translitMap[char]) {
                id += translitMap[char];
            } else if (/[a-z0-9]/.test(char)) {
                id += char;
            } else if (char === " ") {
                id += "-";
            }
        }
        return id || "subject";
    };

    // Предметы выбранного языка (отсутствие языка трактуется как 'ru')
    const visibleSubjects = subjects.filter((s) => (s.language ?? "ru") === contentLang);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // ID должен быть уникальным между языками — добавляем суффикс для не-русского
            const baseId = generateSubjectId(name);
            const subjectId = contentLang === "ru" ? baseId : `${baseId}-${contentLang}`;
            const backgroundImage = getSubjectImage(baseId);
            const newSubject = {
                id: subjectId,
                name,
                emoji: "",
                color,
                order: visibleSubjects.length,
                language: contentLang,
                translatable,
                hasTextbooks,
                backgroundImage,
            };
            const created = await adminAddItem("subjects", newSubject);
            pageCache.invalidatePrefix("subject");
            useStatsStore.getState().reset();
            setSubjects((prev) => [...prev, created as Subject]);
            setName("");
            setColor("#6366f1");
            setTranslatable(true);
            setHasTextbooks(false);
            setIsAdding(false);
        } catch {
            alert(t("admin.errorAdd"));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t("admin.confirmDeleteSubject"))) return;
        try {
            await adminDeleteItem("subjects", id);
            pageCache.invalidatePrefix("subject");
            useStatsStore.getState().reset();
            setSubjects(prev => prev.filter(s => s.id !== id));
            if (editingId === id) setEditingId(null);
        } catch {
            alert(t("admin.errorDelete"));
        }
    };

    const startEdit = (s: Subject) => {
        setIsAdding(false);
        setEditingId(s.id);
        setEditName(s.name);
        setEditColor(hexForColorInput(s.color));
        setEditOrder(String(s.order ?? 0));
        setEditBackgroundImage(s.backgroundImage ?? "");
        setEditHasTextbooks(s.hasTextbooks ?? false);
    };

    const cancelEdit = () => setEditingId(null);

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;
        const orderNum = Number.parseInt(editOrder, 10);
        if (Number.isNaN(orderNum)) {
            alert(t("admin.orderInt"));
            return;
        }
        try {
            const payload = {
                name: editName.trim(),
                emoji: "",
                color: editColor,
                order: orderNum,
                hasTextbooks: editHasTextbooks,
                backgroundImage: editBackgroundImage.trim() || getSubjectImage(editingId, editName.trim()),
            };
            await adminUpdateItem("subjects", editingId, payload);
            pageCache.invalidatePrefix("subject");
            useStatsStore.getState().reset();
            setSubjects((prev) =>
                prev.map((s) => (s.id === editingId ? { ...s, ...payload } : s))
            );
            setEditingId(null);
        } catch {
            alert(t("admin.errorSave"));
        }
    };

    return (
        <div className="flex flex-col gap-12">
            <div className="flex items-center justify-between">
                <section>
                    <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("admin.subjectsTitle")}</h1>
                    <p className="text-muted-foreground mt-2">{t("admin.subjectsSubtitle")}</p>
                </section>
                <button
                    onClick={() => {
                        setIsAdding((v) => !v);
                        if (!isAdding) setEditingId(null);
                    }}
                    className="bg-foreground text-background px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
                >
                    <Plus size={20} />
                    <span>{t("admin.newSubject")}</span>
                </button>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.contentLang")}</label>
                <AdminLanguageToggle value={contentLang} onChange={(l) => { setContentLang(l); setEditingId(null); setIsAdding(false); }} />
            </div>

            {isAdding && (
                <form onSubmit={handleCreate} className="bg-card border border-border rounded-2xl p-8 flex flex-col lg:flex-row gap-6 lg:items-end animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.name")}</label>
                        <input
                            value={name} onChange={e => setName(e.target.value)} required
                            className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                            placeholder="Физика"
                        />
                    </div>
                    <div className="w-28 space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.color")}</label>
                        <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="h-12 w-full cursor-pointer rounded-lg border border-border bg-muted p-1"
                        />
                    </div>
                    <label className="flex items-center gap-3 lg:pb-3 cursor-pointer select-none" title={t("admin.translatableHint")}>
                        <input
                            type="checkbox"
                            checked={translatable}
                            onChange={(e) => setTranslatable(e.target.checked)}
                            className="h-5 w-5 rounded border-border accent-[hsl(var(--brand-blue))]"
                        />
                        <span className="text-sm font-medium text-foreground whitespace-nowrap">{t("admin.translatable")}</span>
                    </label>
                    <div className="flex flex-col gap-2 lg:pb-0">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tuzilish turi</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setHasTextbooks(false)}
                                className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                                    !hasTextbooks
                                        ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                        : "border-border text-muted-foreground hover:border-muted-foreground"
                                }`}
                            >
                                📚 Darsliklarsiz
                            </button>
                            <button
                                type="button"
                                onClick={() => setHasTextbooks(true)}
                                className={`flex-1 py-2 px-3 rounded-xl border-2 text-sm font-semibold transition-colors whitespace-nowrap ${
                                    hasTextbooks
                                        ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                        : "border-border text-muted-foreground hover:border-muted-foreground"
                                }`}
                            >
                                📖 Darsliklar bilan
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="bg-foreground text-background px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all">
                        {t("common.add")}
                    </button>
                </form>
            )}

            <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.subjectColName")}</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">{t("admin.actions")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                        {isLoading ? (
                            [1, 2, 3].map(i => <tr key={i} className="h-20 animate-pulse bg-muted/20" />)
                        ) : visibleSubjects.length > 0 ? (
                            visibleSubjects.map((subject) => (
                                <Fragment key={subject.id}>
                                    <tr className="hover:bg-muted/40 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <span
                                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground shadow-sm ring-1 ring-border/60"
                                                    style={
                                                        subject.color?.startsWith("#")
                                                            ? { backgroundColor: subject.color, color: "white" }
                                                            : undefined
                                                    }
                                                >
                                                    <BookOpen className="h-5 w-5 opacity-90" strokeWidth={2} />
                                                </span>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-foreground tracking-tight">{subject.name}</span>
                                                        {subject.hasTextbooks
                                                            ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-950 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300">📖 Darslikli</span>
                                                            : <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-950 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:text-green-300">📚 To&apos;g&apos;ridan-to&apos;g&apos;ri</span>
                                                        }
                                                    </div>
                                                    <span className="text-xs text-muted-foreground tabular-nums">{t("admin.orderN", { n: subject.order ?? 0 })}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => (editingId === subject.id ? cancelEdit() : startEdit(subject))}
                                                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                    title={editingId === subject.id ? t("common.close") : t("common.edit")}
                                                >
                                                    {editingId === subject.id ? <X size={18} /> : <Edit2 size={18} />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(subject.id)}
                                                    className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {editingId === subject.id && (
                                        <tr className="border-b border-border bg-muted/25">
                                            <td colSpan={2} className="px-8 py-6">
                                                <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                                                    <p className="text-sm font-semibold text-foreground">{t("admin.editing")}</p>
                                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                        <div className="space-y-2 sm:col-span-2">
                                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.name")}</label>
                                                            <input
                                                                value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                required
                                                                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.order")}</label>
                                                            <input
                                                                type="number"
                                                                value={editOrder}
                                                                onChange={(e) => setEditOrder(e.target.value)}
                                                                className="w-full rounded-lg border border-border bg-background p-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.colorAccent")}</label>
                                                            <input
                                                                type="color"
                                                                value={editColor}
                                                                onChange={(e) => setEditColor(e.target.value)}
                                                                className="h-12 w-full cursor-pointer rounded-lg border border-border bg-background p-1"
                                                            />
                                                        </div>
                                                        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.background")}</label>
                                                            <input
                                                                value={editBackgroundImage}
                                                                onChange={(e) => setEditBackgroundImage(e.target.value)}
                                                                placeholder="/subjects/math.png"
                                                                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                                                            />
                                                        </div>
                                                        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tuzilish turi</label>
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditHasTextbooks(false)}
                                                                    className={`flex-1 py-2 px-4 rounded-xl border-2 text-sm font-semibold transition-colors ${
                                                                        !editHasTextbooks
                                                                            ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                                                            : "border-border text-muted-foreground hover:border-muted-foreground"
                                                                    }`}
                                                                >
                                                                    📚 Darsliklarsiz
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditHasTextbooks(true)}
                                                                    className={`flex-1 py-2 px-4 rounded-xl border-2 text-sm font-semibold transition-colors ${
                                                                        editHasTextbooks
                                                                            ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                                                            : "border-border text-muted-foreground hover:border-muted-foreground"
                                                                    }`}
                                                                >
                                                                    📖 Darsliklar bilan
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <button
                                                            type="submit"
                                                            className="rounded-lg bg-foreground px-6 py-2.5 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
                                                        >
                                                            {t("common.save")}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={cancelEdit}
                                                            className="rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-semibold hover:bg-muted transition-colors"
                                                        >
                                                            {t("common.cancel")}
                                                        </button>
                                                    </div>
                                                </form>
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={2} className="px-8 py-12 text-center text-muted-foreground font-medium">{t("admin.noSubjects")}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
