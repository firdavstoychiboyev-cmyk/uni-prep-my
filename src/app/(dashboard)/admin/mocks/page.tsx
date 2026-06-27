"use client";
import { useEffect, useState } from "react";
import {
    collection, getDocs, addDoc, deleteDoc, doc,
    query, where, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adminFetchCollection } from "@/lib/admin-utils";
import { Subject, Language } from "@/lib/firestore-schema";
import { Plus, Trash2, ClipboardList, Loader2, Upload, FileSpreadsheet } from "lucide-react";
import AdminLanguageToggle from "@/components/admin-language-toggle";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface Mock {
    id: string;
    title: string;
    description?: string;
    category: string;
    subject?: string;
    questionIds?: string[];
    questionCount?: number;
    language?: string;
    active?: boolean;
}

const EMPTY_FORM = {
    title: "",
    description: "",
    category: "milliy_sertifikat",
    subject: "",
    active: true,
};

export default function AdminMocksPage() {
    const { t } = useTranslation();
    const [lang, setLang] = useState<Language>("ru");
    const [mocks, setMocks] = useState<Mock[]>([]);
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [form, setForm] = useState(EMPTY_FORM);
    const [mockFile, setMockFile] = useState<File | null>(null);
    const [mockFileName, setMockFileName] = useState("");
    const [importing, setImporting] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");

    const visibleSubjects = subjects.filter(s => (s.language ?? "ru") === lang);

    useEffect(() => {
        adminFetchCollection("subjects", "name").then(data => setSubjects(data as Subject[]));
    }, []);

    useEffect(() => {
        loadMocks();
        setForm(EMPTY_FORM);
        setMockFile(null);
        setMockFileName("");
        setStatusMsg("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang]);

    const loadMocks = async () => {
        setLoading(true);
        const snap = await getDocs(query(collection(db, "mocks"), where("language", "==", lang)));
        setMocks(snap.docs.map(d => ({ id: d.id, ...d.data() } as Mock)));
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!form.title) return;
        setImporting(true);
        setStatusMsg("Savollar yuklanmoqda...");

        try {
            const questionIds: string[] = [];

            if (mockFile) {
                const XLSX = await import("xlsx");
                const buffer = await mockFile.arrayBuffer();
                const workbook = XLSX.read(buffer);
                const sheet = workbook.Sheets["Вопросы"] ?? workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
                const validRows = rows
                    .filter(r => String(r["Текст вопроса"] ?? "").trim())
                    .slice(0, 55);

                setStatusMsg(`${validRows.length} ta savol batch bilan yozilmoqda...`);

                let batch = writeBatch(db);
                let batchCount = 0;

                for (const row of validRows) {
                    const newRef = doc(collection(db, "questions"));
                    questionIds.push(newRef.id);
                    batch.set(newRef, {
                        text: String(row["Текст вопроса"] ?? "").trim(),
                        options: {
                            a: String(row["Вариант A"] ?? "").trim(),
                            b: String(row["Вариант B"] ?? "").trim(),
                            c: String(row["Вариант C"] ?? "").trim(),
                            d: String(row["Вариант D"] ?? "").trim(),
                        },
                        correctAnswer: String(row["Правильный ответ (a/b/c/d)"] ?? "").trim().toLowerCase() || "a",
                        type: String(row["Тип (mc/open)"] ?? "mc").trim() || "mc",
                        difficulty: String(row["Сложность"] ?? "medium").trim() || "medium",
                        explanation: String(row["Объяснение (необязательно)"] ?? "").trim(),
                        subjectId: form.subject || "",
                        language: lang,
                        isMockQuestion: true,
                        createdAt: new Date(),
                    });
                    batchCount++;
                    if (batchCount === 499) {
                        await batch.commit();
                        batch = writeBatch(db);
                        batchCount = 0;
                    }
                }
                if (batchCount > 0) await batch.commit();
            }

            setStatusMsg("Mock hujjati saqlanmoqda...");
            await addDoc(collection(db, "mocks"), {
                title: form.title,
                description: form.description,
                category: form.category,
                subject: form.subject,
                timeLimit: 120,
                maxScore: null,
                questionCount: questionIds.length,
                questionIds,
                language: lang,
                active: form.active,
                createdAt: serverTimestamp(),
            });

            setForm(EMPTY_FORM);
            setMockFile(null);
            setMockFileName("");
            setStatusMsg(`✅ Mock yaratildi! ${questionIds.length} ta savol qo'shildi.`);
            loadMocks();
        } catch (err) {
            console.error(err);
            setStatusMsg(`❌ Xatolik: ${String(err)}`);
        } finally {
            setImporting(false);
        }
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
                <AdminLanguageToggle value={lang} onChange={l => setLang(l)} />
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
                            value={form.subject}
                            onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
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
                            {mockFileName || "Faylni tanlang"}
                        </span>
                        <input
                            type="file"
                            accept=".xlsx,.xls"
                            className="hidden"
                            onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) { setMockFile(file); setMockFileName(file.name); setStatusMsg(""); }
                            }}
                        />
                    </label>
                    {mockFileName && !importing && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                            <FileSpreadsheet className="w-4 h-4" />
                            <span>{mockFileName} tanlandi</span>
                        </div>
                    )}
                </div>

                {statusMsg && (
                    <p className={`text-sm font-medium ${statusMsg.startsWith("❌") ? "text-red-500" : statusMsg.startsWith("✅") ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                        {statusMsg}
                    </p>
                )}

                <div>
                    <button
                        onClick={handleCreate}
                        disabled={!form.title || importing}
                        className="px-8 py-3 rounded-lg bg-foreground text-background font-semibold hover:opacity-90 transition-all flex items-center gap-2 disabled:opacity-40"
                    >
                        {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus size={18} />}
                        {importing ? "Yaratilmoqda..." : "Mock yaratish"}
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
                                        {mock.questionCount ?? mock.questionIds?.length ?? 55} savol · 2 soat
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
