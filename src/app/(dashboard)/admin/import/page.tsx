"use client";

import { useState, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import {
    collection, query, where, getDocs, addDoc,
    updateDoc, increment, doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
    Upload, FileSpreadsheet, CheckCircle2, AlertCircle,
    Loader2, X, BookOpen, Library, ListTree, HelpCircle,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ParsedSubject = {
    name: string; emoji: string; color: string; order: number; language: string;
};
type ParsedTextbook = {
    subjectName: string; title: string; order: number; language: string;
};
type ParsedTopic = {
    subjectName: string; textbookTitle: string; title: string; order: number; language: string;
};
type ParsedQuestion = {
    subjectName: string; textbookTitle: string; topicTitle: string;
    text: string; optionA: string; optionB: string; optionC: string; optionD: string;
    correctAnswer: string; difficulty: string; explanation: string; language: string;
};
type ParsedData = {
    subjects: ParsedSubject[];
    textbooks: ParsedTextbook[];
    topics: ParsedTopic[];
    questions: ParsedQuestion[];
};
type ImportResult = {
    subjects: number; textbooks: number; topics: number; questions: number;
};

// ── Excel parser (runs in browser) ────────────────────────────────────────────

function parseExcel(buffer: ArrayBuffer): ParsedData {
    const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const rows = (sheet: string) =>
        XLSX.utils.sheet_to_json<Record<string, unknown>>(
            wb.Sheets[sheet] ?? {}, { defval: "" }
        );
    const s = (v: unknown) => String(v ?? "").trim();

    const subjects: ParsedSubject[] = rows("Предметы").map(r => ({
        name:     s(r["Название"]),
        emoji:    s(r["Эмодзи"]),
        color:    s(r["Цвет (HEX)"]) || "#6366f1",
        order:    Number(r["Порядок"]) || 0,
        language: s(r["Язык"]) || "uz",
    })).filter(x => x.name);

    const textbooks: ParsedTextbook[] = rows("Учебники").map(r => ({
        subjectName: s(r["Предмет"]),
        title:       s(r["Название учебника"]),
        order:       Number(r["Порядок"]) || 0,
        language:    s(r["Язык"]) || "uz",
    })).filter(x => x.subjectName && x.title);

    const topics: ParsedTopic[] = rows("Темы").map(r => ({
        subjectName:   s(r["Предмет"]),
        textbookTitle: s(r["Учебник"]),
        title:         s(r["Тема"]),
        order:         Number(r["Порядок"]) || 0,
        language:      s(r["Язык"]) || "uz",
    })).filter(x => x.subjectName && x.title);

    const questions: ParsedQuestion[] = rows("Вопросы").map(r => ({
        subjectName:   s(r["Предмет"]),
        textbookTitle: s(r["Учебник"]),
        topicTitle:    s(r["Тема"]),
        text:          s(r["Текст вопроса"]),
        optionA:       s(r["Вариант A"]),
        optionB:       s(r["Вариант B"]),
        optionC:       s(r["Вариант C"]),
        optionD:       s(r["Вариант D"]),
        correctAnswer: s(r["Правильный ответ (a/b/c/d)"]).toLowerCase() || "a",
        difficulty:    s(r["Сложность"]).toLowerCase() || "easy",
        explanation:   s(r["Объяснение (необязательно)"]) || s(r["Объяснение"]),
        language:      s(r["Язык"]) || "uz",
    })).filter(x => x.text);

    return { subjects, textbooks, topics, questions };
}

// ── Import runner (talks to Firestore) ────────────────────────────────────────

async function runImport(
    parsed: ParsedData,
    onLog: (msg: string) => void,
): Promise<ImportResult> {
    const subjectNameToId: Record<string, string> = {};
    const textbookKeyToId: Record<string, string> = {}; // "subjectName|title"
    const topicKeyToId:    Record<string, string> = {}; // "subjectName|textbookTitle|topicTitle"

    // ── 1. Subjects ──────────────────────────────────────────────────────────
    onLog(`📚 Importing ${parsed.subjects.length} subjects…`);
    let subjectsCreated = 0;

    for (const s of parsed.subjects) {
        const snap = await getDocs(query(
            collection(db, "subjects"),
            where("name", "==", s.name),
            where("language", "==", s.language),
        ));
        if (!snap.empty) {
            subjectNameToId[s.name] = snap.docs[0].id;
            onLog(`  ↷ "${s.name}" already exists`);
        } else {
            const ref = await addDoc(collection(db, "subjects"), {
                name:            s.name,
                emoji:           s.emoji,
                color:           s.color,
                order:           s.order,
                language:        s.language,
                translatable:    true,
                hasTextbooks:    parsed.textbooks.some(tb => tb.subjectName === s.name),
                backgroundImage: "",
            });
            subjectNameToId[s.name] = ref.id;
            subjectsCreated++;
            onLog(`  ✓ Created "${s.name}"`);
        }
    }
    onLog(`Done: ${subjectsCreated} created\n`);

    // ── 2. Textbooks ─────────────────────────────────────────────────────────
    onLog(`📖 Importing ${parsed.textbooks.length} textbooks…`);
    let textbooksCreated = 0;

    for (const tb of parsed.textbooks) {
        const subjectId = subjectNameToId[tb.subjectName];
        if (!subjectId) {
            onLog(`  ✗ Subject "${tb.subjectName}" not found — textbook "${tb.title}" skipped`);
            continue;
        }
        const key = `${tb.subjectName}|${tb.title}`;
        const snap = await getDocs(query(
            collection(db, "textbooks"),
            where("subjectId", "==", subjectId),
            where("title", "==", tb.title),
        ));
        if (!snap.empty) {
            textbookKeyToId[key] = snap.docs[0].id;
            onLog(`  ↷ "${tb.title}" already exists`);
        } else {
            const ref = await addDoc(collection(db, "textbooks"), {
                subjectId,
                title:      tb.title,
                grade:      tb.order,
                coverImage: "",
                language:   tb.language,
            });
            textbookKeyToId[key] = ref.id;
            textbooksCreated++;
            onLog(`  ✓ Created "${tb.title}"`);
        }
    }
    onLog(`Done: ${textbooksCreated} created\n`);

    // ── 3. Topics ────────────────────────────────────────────────────────────
    onLog(`📋 Importing ${parsed.topics.length} topics…`);
    let topicsCreated = 0;

    for (const tp of parsed.topics) {
        const subjectId = subjectNameToId[tp.subjectName];
        if (!subjectId) {
            onLog(`  ✗ Subject "${tp.subjectName}" not found — topic "${tp.title}" skipped`);
            continue;
        }
        const textbookId = tp.textbookTitle
            ? textbookKeyToId[`${tp.subjectName}|${tp.textbookTitle}`]
            : undefined;

        const key = `${tp.subjectName}|${tp.textbookTitle}|${tp.title}`;
        const existingSnap = textbookId
            ? await getDocs(query(collection(db, "topics"), where("textbookId", "==", textbookId), where("title", "==", tp.title)))
            : await getDocs(query(collection(db, "topics"), where("subjectId", "==", subjectId), where("title", "==", tp.title)));

        if (!existingSnap.empty) {
            topicKeyToId[key] = existingSnap.docs[0].id;
            onLog(`  ↷ "${tp.title}" already exists`);
        } else {
            const data: Record<string, unknown> = {
                subjectId,
                title:          tp.title,
                order:          tp.order,
                language:       tp.language,
                totalQuestions: 0,
            };
            if (textbookId) data.textbookId = textbookId;

            const ref = await addDoc(collection(db, "topics"), data);
            topicKeyToId[key] = ref.id;
            topicsCreated++;
            onLog(`  ✓ Created "${tp.title}"`);
        }
    }
    onLog(`Done: ${topicsCreated} created\n`);

    // ── 4. Questions ─────────────────────────────────────────────────────────
    onLog(`❓ Importing ${parsed.questions.length} questions…`);
    const topicQCount: Record<string, number> = {};
    let questionsCreated = 0;
    let questionsSkipped = 0;

    for (const q of parsed.questions) {
        const key = `${q.subjectName}|${q.textbookTitle}|${q.topicTitle}`;
        const topicId = topicKeyToId[key];
        if (!topicId) {
            onLog(`  ✗ Topic "${q.topicTitle}" not found — question skipped`);
            questionsSkipped++;
            continue;
        }
        const correct = ["a","b","c","d"].includes(q.correctAnswer) ? q.correctAnswer : "a";
        const diff    = ["easy","medium","hard"].includes(q.difficulty) ? q.difficulty : "easy";

        await addDoc(collection(db, "questions"), {
            topicId,
            text:          q.text,
            options:       { a: q.optionA, b: q.optionB, c: q.optionC, d: q.optionD },
            correctAnswer: correct,
            difficulty:    diff,
            language:      q.language,
            type:          "mc",
            ...(q.explanation ? { explanation: q.explanation } : {}),
        });
        topicQCount[topicId] = (topicQCount[topicId] || 0) + 1;
        questionsCreated++;
    }
    onLog(`Done: ${questionsCreated} created, ${questionsSkipped} skipped\n`);

    // ── 5. Update totalQuestions on topics ───────────────────────────────────
    onLog("🔢 Updating topic question counts…");
    for (const [topicId, count] of Object.entries(topicQCount)) {
        await updateDoc(doc(db, "topics", topicId), { totalQuestions: increment(count) });
    }

    // ── 6. Update topicCount / questionCount on subjects ─────────────────────
    onLog("🔢 Updating subject counts…");
    for (const subjectId of Object.values(subjectNameToId)) {
        const topSnap = await getDocs(query(collection(db, "topics"), where("subjectId", "==", subjectId)));
        let totalQ = 0;
        topSnap.docs.forEach(d => { totalQ += (d.data().totalQuestions as number) || 0; });
        await updateDoc(doc(db, "subjects", subjectId), {
            topicCount:    topSnap.docs.length,
            questionCount: totalQ,
        });
    }

    onLog("🎉 Import complete!");
    return {
        subjects:  subjectsCreated,
        textbooks: textbooksCreated,
        topics:    topicsCreated,
        questions: questionsCreated,
    };
}

// ── Log line styles ───────────────────────────────────────────────────────────

function logClass(line: string) {
    if (line.startsWith("  ✓")) return "text-green-600 dark:text-green-400";
    if (line.startsWith("  ✗")) return "text-red-500 dark:text-red-400";
    if (line.startsWith("  ↷")) return "text-muted-foreground/50";
    if (line.startsWith("  ")) return "text-muted-foreground";
    return "font-semibold text-foreground";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminImportPage() {
    const [file, setFile]             = useState<File | null>(null);
    const [parsed, setParsed]         = useState<ParsedData | null>(null);
    const [status, setStatus]         = useState<"idle"|"parsing"|"preview"|"importing"|"done"|"error">("idle");
    const [logs, setLogs]             = useState<string[]>([]);
    const [result, setResult]         = useState<ImportResult | null>(null);
    const [error, setError]           = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef                = useRef<HTMLInputElement>(null);
    const logBoxRef                   = useRef<HTMLDivElement>(null);

    const addLog = useCallback((msg: string) => {
        setLogs(prev => {
            const next = [...prev, msg];
            // Scroll log box to bottom on next paint
            setTimeout(() => {
                if (logBoxRef.current) logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
            }, 0);
            return next;
        });
    }, []);

    const handleFile = useCallback(async (f: File) => {
        if (!f.name.match(/\.(xlsx|xls)$/i)) {
            setError("Only .xlsx / .xls files are supported.");
            setStatus("error");
            return;
        }
        setFile(f);
        setStatus("parsing");
        setError(null);
        try {
            const buf = await f.arrayBuffer();
            const data = parseExcel(buf);
            if (data.subjects.length === 0 && data.topics.length === 0 && data.questions.length === 0) {
                throw new Error("No data found. Check that the sheet names match: Предметы, Учебники, Темы, Вопросы");
            }
            setParsed(data);
            setStatus("preview");
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setStatus("error");
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const f = e.dataTransfer.files[0];
        if (f) handleFile(f);
    }, [handleFile]);

    const handleImport = async () => {
        if (!parsed) return;
        setStatus("importing");
        setLogs([]);
        try {
            const r = await runImport(parsed, addLog);
            setResult(r);
            setStatus("done");
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setStatus("error");
        }
    };

    const reset = () => {
        setFile(null);
        setParsed(null);
        setStatus("idle");
        setLogs([]);
        setResult(null);
        setError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const statCards = parsed ? [
        { label: "Subjects",  count: parsed.subjects.length,  icon: BookOpen,  ring: "ring-blue-200 dark:ring-blue-800",   bg: "bg-blue-50 dark:bg-blue-950/40",   text: "text-blue-700 dark:text-blue-300" },
        { label: "Textbooks", count: parsed.textbooks.length, icon: Library,   ring: "ring-purple-200 dark:ring-purple-800", bg: "bg-purple-50 dark:bg-purple-950/40", text: "text-purple-700 dark:text-purple-300" },
        { label: "Topics",    count: parsed.topics.length,    icon: ListTree,  ring: "ring-amber-200 dark:ring-amber-800",  bg: "bg-amber-50 dark:bg-amber-950/40",  text: "text-amber-700 dark:text-amber-300" },
        { label: "Questions", count: parsed.questions.length, icon: HelpCircle, ring: "ring-green-200 dark:ring-green-800",  bg: "bg-green-50 dark:bg-green-950/40",  text: "text-green-700 dark:text-green-300" },
    ] : [];

    return (
        <div className="flex flex-col gap-8">
            {/* Header */}
            <section>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">Import Excel</h1>
                <p className="text-muted-foreground mt-2">
                    Upload a .xlsx file with sheets: <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Предметы</span>{" "}
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Учебники</span>{" "}
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Темы</span>{" "}
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">Вопросы</span>
                </p>
            </section>

            {/* Drop zone — idle only */}
            {status === "idle" && (
                <div
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`group flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-dashed p-20 cursor-pointer transition-all ${
                        isDragOver
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 scale-[1.01]"
                            : "border-border hover:border-blue-400 hover:bg-muted/40"
                    }`}
                >
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragOver ? "bg-blue-100 dark:bg-indigo-900" : "bg-muted group-hover:bg-blue-50 dark:group-hover:bg-blue-950"}`}>
                        <Upload className={`w-7 h-7 transition-colors ${isDragOver ? "text-blue-500" : "text-muted-foreground group-hover:text-blue-500"}`} />
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-foreground">Drop your Excel file here</p>
                        <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                    />
                </div>
            )}

            {/* Parsing spinner */}
            {status === "parsing" && (
                <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Parsing {file?.name}…</span>
                </div>
            )}

            {/* Preview / importing / done */}
            {parsed && status !== "idle" && status !== "parsing" && status !== "error" && (
                <div className="flex flex-col gap-6">
                    {/* File pill */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-2.5">
                            <FileSpreadsheet className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-foreground truncate max-w-xs">{file?.name}</span>
                        </div>
                        {status === "preview" && (
                            <button onClick={reset} className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors" title="Remove file">
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    {/* Stat cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {statCards.map(({ label, count, icon: Icon, ring, bg, text }) => (
                            <div key={label} className={`rounded-2xl ring-1 ${ring} ${bg} p-5 flex flex-col gap-2`}>
                                <Icon className={`w-5 h-5 ${text}`} />
                                <div className={`text-3xl font-black ${text}`}>{count}</div>
                                <div className={`text-xs font-semibold uppercase tracking-widest ${text} opacity-70`}>{label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Import button */}
                    {status === "preview" && (
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleImport}
                                className="flex items-center gap-2 rounded-xl bg-foreground px-8 py-3 font-semibold text-background hover:opacity-90 transition-all shadow-sm"
                            >
                                <Upload size={18} />
                                Import to Firebase
                            </button>
                            <button onClick={reset} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Choose different file
                            </button>
                        </div>
                    )}

                    {/* Progress log */}
                    {(status === "importing" || status === "done") && (
                        <div className="rounded-2xl border border-border bg-card overflow-hidden">
                            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-5 py-3">
                                {status === "importing"
                                    ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    : <CheckCircle2 className="w-4 h-4 text-green-500" />
                                }
                                <span className="text-sm font-semibold text-foreground">
                                    {status === "importing" ? "Importing…" : "Done"}
                                </span>
                            </div>
                            <div
                                ref={logBoxRef}
                                className="p-5 font-mono text-xs space-y-0.5 max-h-72 overflow-y-auto"
                            >
                                {logs.map((line, i) => (
                                    <div key={i} className={logClass(line)}>{line}</div>
                                ))}
                                {status === "importing" && (
                                    <div className="flex items-center gap-1.5 text-muted-foreground pt-1">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        <span>Working…</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Success summary */}
                    {status === "done" && result && (
                        <div className="rounded-2xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-6">
                            <div className="flex items-center gap-2 font-bold text-green-700 dark:text-green-400 mb-3">
                                <CheckCircle2 className="w-5 h-5" />
                                Import successful
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm text-green-700 dark:text-green-400">
                                <div className="flex flex-col"><span className="text-2xl font-black">{result.subjects}</span><span className="text-xs font-semibold opacity-70 uppercase tracking-widest">Subjects</span></div>
                                <div className="flex flex-col"><span className="text-2xl font-black">{result.textbooks}</span><span className="text-xs font-semibold opacity-70 uppercase tracking-widest">Textbooks</span></div>
                                <div className="flex flex-col"><span className="text-2xl font-black">{result.topics}</span><span className="text-xs font-semibold opacity-70 uppercase tracking-widest">Topics</span></div>
                                <div className="flex flex-col"><span className="text-2xl font-black">{result.questions}</span><span className="text-xs font-semibold opacity-70 uppercase tracking-widest">Questions</span></div>
                            </div>
                            <button
                                onClick={reset}
                                className="mt-5 px-5 py-2 rounded-lg bg-green-700 dark:bg-green-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                            >
                                Import another file
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Error panel */}
            {status === "error" && error && (
                <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-6 flex items-start gap-4">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="font-semibold text-red-700 dark:text-red-400">Error</p>
                        <p className="mt-1 text-sm text-red-600 dark:text-red-300">{error}</p>
                        <button onClick={reset} className="mt-3 text-sm font-semibold text-red-700 dark:text-red-400 underline underline-offset-2">
                            Try again
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
