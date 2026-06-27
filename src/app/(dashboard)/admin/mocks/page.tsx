"use client";
import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, query, where, serverTimestamp } from "firebase/firestore";
import * as XLSX from "xlsx";
import { db } from "@/lib/firebase";
import { adminFetchCollection } from "@/lib/admin-utils";
import { Subject, Language } from "@/lib/firestore-schema";
import { Plus, Trash2, ClipboardList, Loader2, FileSpreadsheet, Upload } from "lucide-react";
import AdminLanguageToggle from "@/components/admin-language-toggle";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface Mock {
    id: string;
    title: string;
    description?: string;
    category: string;
    subjectId?: string;
    questions?: unknown[];
    language?: string;
    active?: boolean;
}

interface InlineQuestion {
    text: string;
    options: { a: string; b: string; c: string; d: string };
    correctAnswer: string;
}

const EMPTY_FORM = {
    title: "",
    description: "",
    category: "milliy_sertifikat",
    active: true,
};

const s = (v: unknown) => String(v ?? "").trim();

export default function AdminMocksPage() {
    const { t } = useTranslation();
    const [contentLang, setContentLang] = useState<Language>("ru");
    const [mocks, setMocks] = useState<Mock[]>([]);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [selectedSubject, setSelectedSubject] = useState("");
    const [form, setForm] = useState(EMPTY_FORM);
    const [creating, setCreating] = useState(false);
    const [parsedQuestions, setParsedQuestions] = useState<InlineQuestion[]>([]);
    const [excelFileName, setExcelFileName] = useState("");
    const [excelError, setExcelError] = useState("");

    const visibleSubjects = subjects.filter(s => (s.language ?? "ru") === contentLang);

    useEffect(() => {
        adminFetchCollection("subjects", "name").then(data => setSubjects(data as Subject[]));
    }, []);

    useEffect(() => {
        loadMocks();
        setSelectedSubject("");
        setParsedQuestions([]);
        setExcelFileName("");
        setExcelError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentLang]);

    const loadMocks = async () => {
        setLoading(true);
        const snap = await getDocs(query(collection(db, "mocks"), where("language", "==", contentLang)));
        setMocks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Mock)));
        setLoading(false);
    };

    const handleExcelFile = async (file: File) => {
        setExcelError("");
        setParsedQuestions([]);
        setExcelFileName(file.name);
        try {
            const buffer = await file.arrayBuffer();
            const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
            const sheet = wb.Sheets["Вопросы"];
            if (!sheet) {
                setExcelError("❌ \"Вопросы\" sahifasi topilmadi");
                return;
            }
            const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
            const questions: InlineQuestion[] = rows.slice(0, 55).map(r => ({
                text: s(r["Текст вопроса"]),
                options: {
                    a: s(r["Вариант A"]),
                    b: s(r["Вариант B"]),
                    c: s(r["Вариант C"]),
                    d: s(r["Вариант D"]),
                },
                correctAnswer: s(r["Правильный ответ (a/b/c/d)"]).toLowerCase() || "a",
            })).filter(q => q.text);
            setParsedQuestions(questions);
        } catch {
            setExcelError("❌ Faylni o'qishda xatolik yuz berdi");
        }
    };

    const handleCreate = async () => {
        if (!form.title || parsedQuestions.length === 0) return;
        setCreating(true);
        await addDoc(collection(db, "mocks"), {
            ...form,
            subjectId: selectedSubject || null,
            questions: parsedQuestions,
            questionCount: 55,
            timeLimit: 120,
            language: contentLang,
            createdAt: serverTimestamp(),
        });
        setForm(EMPTY_FORM);
        setSelectedSubject("");
        setParsedQuestions([]);
        setExcelFileName("");
        setCreating(false);
        loadMocks();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("O'chirishni tasdiqlaysizmi?")) return;
        await deleteDoc(doc(db, "mocks", id));
        loadMocks();
    };

    return (
        <div className="flex flex-col gap-10">
            <div>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">Mock Testlar</h1>
                <p className="text-muted-foreground mt-2">Mock testlarni yaratish va boshqarish · 55 savol · 2 soat</p>
            </div>

            {/* Language toggle */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.contentLang")}</label>
                <AdminLanguageToggle value={contentLang} onChange={l => setContentLang(l)} />
            </div>

            {/* Create form */}
            <div className="rounded-2xl border border-border bg-card p-8 flex flex-col gap-6">
                <h2 className="font-bold text-lg text-foreground">Yangi mock yaratish</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2 flex flex-col gap-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nomi</label>
                        <input
                            value={form.title}
                            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                            placeholder="Matematika - Milliy Sertifikat Mock #1"
                            className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                        />
                    </div>
                    <div className="md:col-span-2 flex flex-col gap-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Tavsif</label>
                        <input
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Mock haqida qisqacha ma'lumot"
                            className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Kategoriya</label>
                        <select
                            value={form.category}
                            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                            className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 appearance-none"
                        >
                            <option value="milliy_sertifikat">Milliy Sertifikat</option>
                            <option value="dtm">DTM</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Fan (ixtiyoriy)</label>
                        <select
                            value={selectedSubject}
                            onChange={e => setSelectedSubject(e.target.value)}
                            className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 appearance-none"
                        >
                            <option value="">Fan tanlang</option>
                            {visibleSubjects.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center pb-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.active}
                                onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                                className="w-4 h-4 accent-blue-600"
                            />
                            <span className="text-sm font-medium text-foreground">Faol (talabalar ko&apos;ra oladi)</span>
                        </label>
                    </div>
                </div>

                {/* Excel upload */}
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        Excel fayl (.xlsx) — &quot;Вопросы&quot; sahifasidan birinchi 55 ta savol olinadi
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer w-fit px-5 py-3 rounded-lg border-2 border-dashed border-border hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">
                            {excelFileName || "Faylni tanlang yoki tashlang"}
                        </span>
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleExcelFile(file);
                            }}
                        />
                    </label>
                    {excelError && <p className="text-sm text-red-500">{excelError}</p>}
                    {parsedQuestions.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>✅ {parsedQuestions.length} ta savol tayyor{parsedQuestions.length < 55 ? ` (55 ta kerak edi, ${parsedQuestions.length} ta topildi)` : ""}</span>
                        </div>
                    )}
                </div>

                <div>
                    <button
                        onClick={handleCreate}
                        disabled={!form.title || parsedQuestions.length === 0 || creating}
                        className="px-8 py-3 rounded-lg bg-foreground text-background font-semibold hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-40"
                    >
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={18} />}
                        Mock yaratish
                    </button>
                </div>
            </div>

            {/* Mocks list */}
            <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Nomi</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Kategoriya</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Savollar · Vaqt</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">Holati</th>
                            <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-right">{t("admin.actions")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {loading ? (
                            [1, 2, 3].map(i => <tr key={i} className="h-16 animate-pulse bg-muted/20" />)
                        ) : mocks.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-8 py-12 text-center text-muted-foreground font-medium">
                                    Hozircha mock testlar yo&apos;q
                                </td>
                            </tr>
                        ) : (
                            mocks.map(mock => (
                                <tr key={mock.id} className="hover:bg-muted/40 transition-colors text-sm">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-3">
                                            <ClipboardList size={16} className="text-muted-foreground shrink-0" />
                                            <span className="font-semibold text-foreground">{mock.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                                            mock.category === "milliy_sertifikat"
                                                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                                : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                        }`}>
                                            {mock.category === "milliy_sertifikat" ? "Milliy Sertifikat" : "DTM"}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-muted-foreground">
                                        {mock.questions?.length ?? 55} savol · 2 soat
                                    </td>
                                    <td className="px-8 py-5">
                                        {mock.active
                                            ? <span className="text-xs text-green-600 font-semibold">● Faol</span>
                                            : <span className="text-xs text-red-500 font-semibold">● Nofaol</span>}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button
                                            onClick={() => handleDelete(mock.id)}
                                            className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors"
                                            title={t("common.delete")}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </section>
        </div>
    );
}
