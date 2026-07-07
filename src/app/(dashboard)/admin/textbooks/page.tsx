"use client";

import { Fragment, useEffect, useState } from "react";
import { adminFetchCollection, adminAddItem, adminDeleteItem, adminUpdateItem } from "@/lib/admin-utils";
import { Textbook, Subject, Language } from "@/lib/firestore-schema";
import { Plus, Trash2, Library, Edit2, X, CheckCircle2 } from "lucide-react";
import { pageCache } from "@/lib/page-cache";
import { useStatsStore } from "@/store/useStatsStore";
import AdminLanguageToggle from "@/components/admin-language-toggle";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function AdminTextbooksPage() {
    const { t } = useTranslation();
    const [textbooks, setTextbooks] = useState<Textbook[]>([]);
    const [subjects, setSubjects]   = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding]   = useState(false);

    const [contentLang, setContentLang] = useState<Language>("ru");

    // Create form
    const [title, setTitle]       = useState("");
    const [grade, setGrade]       = useState("");
    const [subjectId, setSubjectId] = useState("");

    // Edit form
    const [editingId, setEditingId]         = useState<string | null>(null);
    const [editTitle, setEditTitle]         = useState("");
    const [editGrade, setEditGrade]         = useState("");
    const [editSubjectId, setEditSubjectId] = useState("");
    const [saveSuccess, setSaveSuccess]     = useState(false);

    // Sort by "title" so imported docs (no "createdAt") are included.
    useEffect(() => {
        Promise.all([
            adminFetchCollection("textbooks", "title"),
            adminFetchCollection("subjects", "order"),
        ]).then(([textData, subData]) => {
            setTextbooks(textData as Textbook[]);
            setSubjects(subData as Subject[]);
            setIsLoading(false);
        });
    }, []);

    const langOf = (item: { language?: Language }) => item.language ?? "ru";
    const visibleTextbooks = textbooks.filter(tb => langOf(tb) === contentLang);
    const visibleSubjects  = subjects.filter(s  => langOf(s)  === contentLang);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subjectId) return;
        try {
            const created = await adminAddItem("textbooks", {
                title, grade, subjectId, coverImage: "", language: contentLang,
            });
            pageCache.invalidatePrefix("textbooks");
            useStatsStore.getState().reset();
            setTextbooks(prev => [created as Textbook, ...prev]);
            setTitle(""); setGrade(""); setSubjectId("");
            setIsAdding(false);
        } catch {
            alert(t("admin.errorAddTextbook"));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t("admin.confirm"))) return;
        try {
            await adminDeleteItem("textbooks", id);
            pageCache.invalidatePrefix("textbooks");
            useStatsStore.getState().reset();
            setTextbooks(prev => prev.filter(tb => tb.id !== id));
            if (editingId === id) setEditingId(null);
        } catch {
            alert(t("admin.errorDelete"));
        }
    };

    const startEdit = (tb: Textbook) => {
        setIsAdding(false);
        setEditingId(tb.id);
        setEditTitle(tb.title);
        setEditGrade(String(tb.grade));
        setEditSubjectId(String(tb.subjectId));
        setSaveSuccess(false);
    };

    const cancelEdit = () => { setEditingId(null); setSaveSuccess(false); };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingId) return;
        try {
            const payload = { title: editTitle.trim(), grade: editGrade.trim(), subjectId: editSubjectId };
            await adminUpdateItem("textbooks", editingId, payload);
            pageCache.invalidatePrefix("textbooks");
            useStatsStore.getState().reset();
            setTextbooks(prev =>
                prev.map(tb => tb.id === editingId ? { ...tb, ...payload } : tb)
            );
            setSaveSuccess(true);
            setTimeout(() => { setEditingId(null); setSaveSuccess(false); }, 1200);
        } catch {
            alert(t("admin.errorSave"));
        }
    };

    return (
        <div className="flex flex-col gap-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
                        <Library size={22} />{t("admin.textbooksTitle")}
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">{t("admin.textbooksSubtitle")}</p>
                </div>
                <button
                    onClick={() => { setIsAdding(v => !v); setSubjectId(""); setEditingId(null); }}
                    className="flex h-11 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.98]"
                >
                    <Plus size={18} />
                    <span>{t("admin.newTextbook")}</span>
                </button>
            </div>

            {/* Language toggle */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.contentLang")}</label>
                <AdminLanguageToggle
                    value={contentLang}
                    onChange={(l) => { setContentLang(l); setIsAdding(false); setSubjectId(""); setEditingId(null); }}
                />
            </div>

            {/* Create form */}
            {isAdding && (
                <form onSubmit={handleCreate} className="bg-card border border-border rounded-2xl p-8 flex flex-col md:flex-row gap-6 items-end animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex-[2] space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.name")}</label>
                        <input
                            value={title} onChange={e => setTitle(e.target.value)} required
                            className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                            placeholder="Fizika 10-sinf"
                        />
                    </div>
                    <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.grade")}</label>
                        <input
                            value={grade} onChange={e => setGrade(e.target.value)} required
                            className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                            placeholder="10"
                        />
                    </div>
                    <div className="flex-1 space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.linkToSubject")}</label>
                        <select
                            value={subjectId} onChange={e => setSubjectId(e.target.value)} required
                            className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 appearance-none"
                        >
                            <option value="">{t("admin.selectSubject")}</option>
                            {visibleSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="bg-foreground text-background px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all">
                        {t("common.add")}
                    </button>
                </form>
            )}

            <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-border text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            <th className="px-5 py-3">{t("admin.name")}</th>
                            <th className="px-5 py-3">{t("common.subject")}</th>
                            <th className="px-5 py-3">{t("admin.grade")}</th>
                            <th className="px-5 py-3 text-right">{t("admin.actions")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {isLoading ? (
                            [1, 2, 3].map(i => (
                                <tr key={i}><td colSpan={4}><div className="mx-5 my-2 h-10 animate-pulse rounded-lg bg-muted" /></td></tr>
                            ))
                        ) : visibleTextbooks.length > 0 ? (
                            visibleTextbooks.map(textbook => {
                                const subject = subjects.find(s => s.id === String(textbook.subjectId).trim());
                                return (
                                    <Fragment key={textbook.id}>
                                        <tr className="hover:bg-muted/40 transition-colors group text-sm">
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Library size={18} className="text-muted-foreground" />
                                                    <span className="font-semibold text-foreground tracking-tight">{textbook.title}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-muted-foreground font-medium">{subject?.name || t("admin.unknown")}</td>
                                            <td className="px-5 py-4 text-muted-foreground">{textbook.grade}</td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <a
                                                        href={`/admin/topics?textbookId=${textbook.id}`}
                                                        className="text-xs font-bold uppercase tracking-widest text-blue-600 hover:underline px-2 py-1"
                                                    >
                                                        {t("stats.topics")}
                                                    </a>
                                                    <button
                                                        type="button"
                                                        onClick={() => editingId === textbook.id ? cancelEdit() : startEdit(textbook)}
                                                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                        title={editingId === textbook.id ? t("common.close") : t("common.edit")}
                                                    >
                                                        {editingId === textbook.id ? <X size={18} /> : <Edit2 size={18} />}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(textbook.id)}
                                                        className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors"
                                                        title={t("common.delete")}
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Inline edit row */}
                                        {editingId === textbook.id && (
                                            <tr className="border-b border-border bg-muted/25">
                                                <td colSpan={4} className="px-5 py-5">
                                                    <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                                                        <p className="text-sm font-semibold text-foreground">{t("admin.editTextbook")}</p>
                                                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                            {/* Title */}
                                                            <div className="space-y-2 sm:col-span-2">
                                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.name")}</label>
                                                                <input
                                                                    value={editTitle}
                                                                    onChange={e => setEditTitle(e.target.value)}
                                                                    required
                                                                    className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                                                                />
                                                            </div>
                                                            {/* Grade */}
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.grade")}</label>
                                                                <input
                                                                    value={editGrade}
                                                                    onChange={e => setEditGrade(e.target.value)}
                                                                    required
                                                                    className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                                                                />
                                                            </div>
                                                            {/* Subject */}
                                                            <div className="space-y-2">
                                                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("common.subject")}</label>
                                                                <select
                                                                    value={editSubjectId}
                                                                    onChange={e => setEditSubjectId(e.target.value)}
                                                                    required
                                                                    className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30 appearance-none"
                                                                >
                                                                    <option value="">{t("admin.selectSubject")}</option>
                                                                    {visibleSubjects.map(s => (
                                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            {saveSuccess ? (
                                                                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-semibold">
                                                                    <CheckCircle2 size={16} />
                                                                    {t("common.saved")}
                                                                </div>
                                                            ) : (
                                                                <>
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
                                                                </>
                                                            )}
                                                        </div>
                                                    </form>
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-sm font-medium text-muted-foreground">
                                    {t("admin.noTextbooks")}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
