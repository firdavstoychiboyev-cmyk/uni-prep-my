"use client";

import { useEffect, useState } from "react";
import { adminFetchCollection, adminAddItem, adminDeleteItem } from "@/lib/admin-utils";
import { Textbook, Subject, Language } from "@/lib/firestore-schema";
import { Plus, Trash2, Library } from "lucide-react";
import { pageCache } from "@/lib/page-cache";
import { useStatsStore } from "@/store/useStatsStore";
import AdminLanguageToggle from "@/components/admin-language-toggle";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function AdminTextbooksPage() {
    const { t } = useTranslation();
    const [textbooks, setTextbooks] = useState<Textbook[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);

    // Content language filter — mirrors the subjects page pattern
    const [contentLang, setContentLang] = useState<Language>("ru");

    // Create form
    const [title, setTitle] = useState("");
    const [grade, setGrade] = useState("");
    const [subjectId, setSubjectId] = useState("");

    // Sort by "title" so documents without a "createdAt" field (imported via script) are included.
    // Firestore's orderBy silently excludes documents that don't have the sorted field.
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

    // Filter both textbooks and the subject dropdown to the selected language.
    // Documents with no language field are treated as "ru" for backwards compatibility.
    const langOf = (item: { language?: Language }) => item.language ?? "ru";
    const visibleTextbooks = textbooks.filter(tb => langOf(tb) === contentLang);
    const visibleSubjects  = subjects.filter(s  => langOf(s)  === contentLang);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subjectId) return;
        try {
            const newTextbook = {
                title,
                grade,
                subjectId,
                coverImage: "",
                language: contentLang,   // ← was missing before
            };
            const created = await adminAddItem("textbooks", newTextbook);
            pageCache.invalidatePrefix("textbooks");
            useStatsStore.getState().reset();
            setTextbooks(prev => [created as Textbook, ...prev]);
            setTitle("");
            setGrade("");
            setSubjectId("");
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
        } catch {
            alert(t("admin.errorDelete"));
        }
    };

    return (
        <div className="flex flex-col gap-12">
            <div className="flex items-center justify-between">
                <section>
                    <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("admin.textbooksTitle")}</h1>
                    <p className="text-muted-foreground mt-2">{t("admin.textbooksSubtitle")}</p>
                </section>
                <button
                    onClick={() => { setIsAdding(!isAdding); setSubjectId(""); }}
                    className="bg-foreground text-background px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 transition-all shadow-sm"
                >
                    <Plus size={20} />
                    <span>{t("admin.newTextbook")}</span>
                </button>
            </div>

            {/* Language toggle */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.contentLang")}</label>
                <AdminLanguageToggle
                    value={contentLang}
                    onChange={(l) => { setContentLang(l); setIsAdding(false); setSubjectId(""); }}
                />
            </div>

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

            <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.name")}</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("common.subject")}</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.grade")}</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">{t("admin.actions")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {isLoading ? (
                            [1, 2, 3].map(i => <tr key={i} className="h-20 animate-pulse bg-muted/20" />)
                        ) : visibleTextbooks.length > 0 ? (
                            visibleTextbooks.map(textbook => {
                                const subject = subjects.find(s => s.id === String(textbook.subjectId).trim());
                                return (
                                    <tr key={textbook.id} className="hover:bg-muted/40 transition-colors group text-sm">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <Library size={18} className="text-muted-foreground" />
                                                <span className="font-semibold text-foreground tracking-tight">{textbook.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-muted-foreground font-medium">{subject?.name || t("admin.unknown")}</td>
                                        <td className="px-8 py-6 text-muted-foreground">{textbook.grade}</td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <a
                                                    href={`/admin/topics?textbookId=${textbook.id}`}
                                                    className="text-xs font-bold uppercase tracking-widest text-blue-600 hover:underline"
                                                >
                                                    {t("stats.topics")}
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(textbook.id)}
                                                    className="p-2 text-muted-foreground hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={4} className="px-8 py-12 text-center text-muted-foreground font-medium">
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
