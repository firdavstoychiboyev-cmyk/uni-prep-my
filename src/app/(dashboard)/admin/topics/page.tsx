"use client";

import { Fragment, useEffect, useState } from "react";
import { adminFetchCollection, adminAddItem, adminDeleteItem, adminUpdateItem } from "@/lib/admin-utils";
import { Topic, Textbook, Subject, Language } from "@/lib/firestore-schema";
import { Plus, Trash2, ListTree, Edit2, X, BookOpen, Layers } from "lucide-react";
import { fetchTextbooksBySubject, fetchTopicsByTextbook, fetchTopicsBySubject } from "@/lib/data-fetching";
import { pageCache } from "@/lib/page-cache";
import { useStatsStore } from "@/store/useStatsStore";
import AdminLanguageToggle from "@/components/admin-language-toggle";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Mode = "textbook" | "direct";

export default function AdminTopicsPage() {
    const { t } = useTranslation();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [textbooks, setTextbooks] = useState<Textbook[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);

    const [mode, setMode] = useState<Mode>("textbook");
    const [contentLang, setContentLang] = useState<Language>("ru");
    const [selectedSubject, setSelectedSubject] = useState("");
    const [selectedTextbook, setSelectedTextbook] = useState("");

    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Форма создания
    const [title, setTitle] = useState("");
    const [order, setOrder] = useState("");

    // Форма редактирования
    const [editTitle, setEditTitle] = useState("");
    const [editOrder, setEditOrder] = useState("");

    useEffect(() => {
        adminFetchCollection("subjects", "name").then(data => {
            setSubjects(data as Subject[]);
            setIsLoading(false);
        });
    }, []);

    // При смене режима — сброс
    const switchMode = (m: Mode) => {
        setMode(m);
        setSelectedSubject("");
        setSelectedTextbook("");
        setTopics([]);
        setIsAdding(false);
        setEditingId(null);
    };

    // Предметы выбранного языка (отсутствие языка трактуется как 'ru')
    const visibleSubjects = subjects.filter((s) => (s.language ?? "ru") === contentLang);

    useEffect(() => {
        if (selectedSubject && mode === "textbook") {
            fetchTextbooksBySubject(selectedSubject).then(setTextbooks);
            setSelectedTextbook("");
            setTopics([]);
        }
        if (selectedSubject && mode === "direct") {
            setEditingId(null);
            fetchTopicsBySubject(selectedSubject, contentLang).then(setTopics);
        }
    }, [selectedSubject, mode, contentLang]);

    useEffect(() => {
        if (mode !== "textbook") return;
        setEditingId(null);
        if (selectedTextbook) {
            fetchTopicsByTextbook(selectedTextbook, contentLang).then(setTopics);
        } else {
            setTopics([]);
        }
    }, [selectedTextbook, mode, contentLang]);

    const canAdd = mode === "textbook" ? Boolean(selectedTextbook) : Boolean(selectedSubject);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canAdd) return;
        try {
            const newTopic: Record<string, unknown> = {
                title,
                order: parseInt(order) || topics.length + 1,
                totalQuestions: 0,
                language: contentLang,
            };
            if (mode === "textbook") {
                newTopic.textbookId = selectedTextbook;
            } else {
                newTopic.subjectId = selectedSubject;
            }
            const created = await adminAddItem("topics", newTopic);
            pageCache.invalidatePrefix("topics");
            useStatsStore.getState().reset();
            setTopics(prev => [...prev, created as Topic].sort((a, b) => a.order - b.order));
            setTitle("");
            setOrder("");
            setIsAdding(false);
        } catch {
            alert(t("admin.errorAddTopic"));
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t("admin.confirmDeleteTopic"))) return;
        try {
            await adminDeleteItem("topics", id);
            pageCache.invalidatePrefix("topics");
            useStatsStore.getState().reset();
            setTopics((prev) => prev.filter((tp) => tp.id !== id));
            if (editingId === id) setEditingId(null);
        } catch {
            alert(t("admin.errorDelete"));
        }
    };

    const startEdit = (t: Topic) => {
        setIsAdding(false);
        setEditingId(t.id);
        setEditTitle(t.title);
        setEditOrder(String(t.order ?? 0));
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
        const current = topics.find((tp) => tp.id === editingId);
        if (!current) return;
        try {
            const payload: Record<string, unknown> = {
                title: editTitle.trim(),
                order: orderNum,
            };
            if (current.textbookId) payload.textbookId = current.textbookId;
            if (current.subjectId) payload.subjectId = current.subjectId;
            await adminUpdateItem("topics", editingId, payload);
            pageCache.invalidatePrefix("topics");
            useStatsStore.getState().reset();
            setTopics((prev) =>
                prev
                    .map((tp) => (tp.id === editingId ? { ...tp, ...payload } : tp))
                    .sort((a, b) => a.order - b.order)
            );
            setEditingId(null);
        } catch {
            alert(t("admin.errorSave"));
        }
    };

    const emptyMessage = mode === "textbook"
        ? (!selectedTextbook ? t("admin.selectTextbookToSeeTopics") : t("admin.noTopics"))
        : (!selectedSubject ? t("admin.selectSubjectToSeeTopics") : t("admin.noTopics"));

    return (
        <div className="flex flex-col gap-12">
            <div className="flex items-center justify-between">
                <section>
                    <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("admin.topicsTitle")}</h1>
                    <p className="text-muted-foreground mt-2">{t("admin.topicsSubtitle")}</p>
                </section>
                <button
                    onClick={() => {
                        setIsAdding((v) => !v);
                        if (!isAdding) setEditingId(null);
                    }}
                    disabled={!canAdd}
                    className="bg-foreground text-background px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-30 transition-all shadow-sm"
                >
                    <Plus size={20} />
                    <span>{t("admin.newTopic")}</span>
                </button>
            </div>

            {/* Language toggle */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.contentLang")}</label>
                <AdminLanguageToggle
                    value={contentLang}
                    onChange={(l) => {
                        setContentLang(l);
                        setSelectedSubject("");
                        setSelectedTextbook("");
                        setTopics([]);
                        setIsAdding(false);
                        setEditingId(null);
                    }}
                />
            </div>

            {/* Mode toggle */}
            <div className="flex items-center gap-2 p-1 bg-muted rounded-xl w-fit">
                <button
                    type="button"
                    onClick={() => switchMode("textbook")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        mode === "textbook"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <BookOpen size={16} />
                    {t("admin.withTextbook")}
                </button>
                <button
                    type="button"
                    onClick={() => switchMode("direct")}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        mode === "direct"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Layers size={16} />
                    {t("admin.withoutTextbook")}
                </button>
            </div>

            {/* Filters */}
            <section className={`grid grid-cols-1 gap-6 bg-card border border-border rounded-2xl p-6 ${mode === "textbook" ? "md:grid-cols-2" : "md:grid-cols-1 max-w-sm"}`}>
                <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.filterBySubject")}</label>
                    <select
                        value={selectedSubject}
                        onChange={e => setSelectedSubject(e.target.value)}
                        className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 appearance-none"
                    >
                        <option value="">{t("admin.selectSubject")}</option>
                        {visibleSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                {mode === "textbook" && (
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.filterByTextbook")}</label>
                        <select
                            value={selectedTextbook}
                            onChange={e => setSelectedTextbook(e.target.value)}
                            disabled={!selectedSubject}
                            className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 appearance-none disabled:opacity-50"
                        >
                            <option value="">{t("admin.selectTextbook")}</option>
                            {textbooks.map(tb => <option key={tb.id} value={tb.id}>{tb.title} ({t("admin.gradeShort", { grade: String(tb.grade) })})</option>)}
                        </select>
                    </div>
                )}
            </section>

            {isAdding && (
                <form onSubmit={handleCreate} className="bg-card border border-border rounded-2xl p-8 flex flex-col md:flex-row gap-6 items-end animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex-[2] space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.topicTitle")}</label>
                        <input
                            value={title} onChange={e => setTitle(e.target.value)} required
                            className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                            placeholder="Древний Египет"
                        />
                    </div>
                    <div className="w-24 space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.order")}</label>
                        <input
                            type="number"
                            value={order} onChange={e => setOrder(e.target.value)} required
                            className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                            placeholder="1"
                        />
                    </div>
                    <button type="submit" className="bg-foreground text-background px-8 py-3 rounded-lg font-semibold hover:opacity-90 transition-all">
                        {t("admin.create")}
                    </button>
                </form>
            )}

            <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.order")}</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.name")}</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.questionsCol")}</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">{t("admin.actions")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {isLoading ? (
                            [1, 2, 3].map(i => <tr key={i} className="h-20 animate-pulse bg-muted/20" />)
                        ) : topics.length > 0 ? (
                            topics.map((topic) => (
                                <Fragment key={topic.id}>
                                    <tr className="hover:bg-muted/40 transition-colors group text-sm">
                                        <td className="px-8 py-6 font-mono text-muted-foreground">#{topic.order}</td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <ListTree size={18} className="text-muted-foreground shrink-0" />
                                                <span className="font-semibold text-foreground tracking-tight">{topic.title}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-muted-foreground font-medium tabular-nums">
                                            {topic.totalQuestions}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        editingId === topic.id ? cancelEdit() : startEdit(topic)
                                                    }
                                                    className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                                    title={editingId === topic.id ? t("common.close") : t("common.edit")}
                                                >
                                                    {editingId === topic.id ? <X size={18} /> : <Edit2 size={18} />}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(topic.id)}
                                                    className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {editingId === topic.id && (
                                        <tr className="border-b border-border bg-muted/25">
                                            <td colSpan={4} className="px-8 py-6">
                                                <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                                                    <p className="text-sm font-semibold text-foreground">{t("admin.editTopic")}</p>
                                                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                        <div className="space-y-2 sm:col-span-2">
                                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                                {t("admin.name")}
                                                            </label>
                                                            <input
                                                                value={editTitle}
                                                                onChange={(e) => setEditTitle(e.target.value)}
                                                                required
                                                                className="w-full rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/30"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                                {t("admin.order")}
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={editOrder}
                                                                onChange={(e) => setEditOrder(e.target.value)}
                                                                className="w-full rounded-lg border border-border bg-background p-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/30"
                                                            />
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
                                <td colSpan={4} className="px-8 py-12 text-center text-muted-foreground font-medium whitespace-pre">
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
