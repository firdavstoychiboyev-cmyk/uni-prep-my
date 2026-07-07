"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import {
    collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, doc,
    query, where, arrayUnion, arrayRemove, increment, deleteField,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Language } from "@/lib/firestore-schema";
import {
    Plus, Trash2, Pencil, Loader2, CheckCircle2, AlertTriangle, PenLine, ListChecks, ImagePlus, X,
} from "lucide-react";
import AdminLanguageToggle from "@/components/admin-language-toggle";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { uploadToStorage } from "@/lib/upload";

interface MockDoc {
    id: string;
    title: string;
    subject?: string;
    language?: string;
    questionIds?: string[];
    questions?: unknown[];
    questionCount?: number;
}

interface QuestionDoc {
    id: string;
    text: string;
    options?: { a?: string; b?: string; c?: string; d?: string };
    correctAnswer: string;
    type?: string; // "mc" (default) | "open"
    explanation?: string;
    imageUrl?: string;
    optionImages?: { a?: string; b?: string; c?: string; d?: string };
}

const OPTION_KEYS = ["a", "b", "c", "d"] as const;

interface Draft {
    id: string | null; // null → new question
    text: string;
    type: "mc" | "open";
    options: { a: string; b: string; c: string; d: string };
    correctKey: "a" | "b" | "c" | "d";
    referenceAnswer: string;
    explanation: string;
    /** Existing URL from Firestore (empty string = none) */
    imageUrl: string;
    /** Existing option image URLs from Firestore */
    optionImages: { a: string; b: string; c: string; d: string };
}

const emptyDraft = (): Draft => ({
    id: null,
    text: "",
    type: "mc",
    options: { a: "", b: "", c: "", d: "" },
    correctKey: "a",
    referenceAnswer: "",
    explanation: "",
    imageUrl: "",
    optionImages: { a: "", b: "", c: "", d: "" },
});

const draftFromQuestion = (q: QuestionDoc): Draft => ({
    id: q.id,
    text: q.text ?? "",
    type: q.type === "open" ? "open" : "mc",
    options: {
        a: q.options?.a ?? "",
        b: q.options?.b ?? "",
        c: q.options?.c ?? "",
        d: q.options?.d ?? "",
    },
    correctKey: (OPTION_KEYS as readonly string[]).includes(q.correctAnswer) ? (q.correctAnswer as Draft["correctKey"]) : "a",
    referenceAnswer: q.type === "open" ? (q.correctAnswer ?? "") : "",
    explanation: q.explanation ?? "",
    imageUrl: q.imageUrl ?? "",
    optionImages: {
        a: q.optionImages?.a ?? "",
        b: q.optionImages?.b ?? "",
        c: q.optionImages?.c ?? "",
        d: q.optionImages?.d ?? "",
    },
});

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Статус валидности вопроса для индикатора в списке */
const questionStatus = (q: QuestionDoc): "ok" | "broken" | "noAnswer" => {
    if (q.type === "open") {
        return q.correctAnswer?.trim() ? "ok" : "noAnswer";
    }
    const filled = OPTION_KEYS.filter(k => q.options?.[k]?.trim());
    if (filled.length < 2 || !q.options?.[q.correctAnswer as "a"]?.trim()) return "broken";
    return "ok";
};

export default function AdminMockQuestionsPage() {
    const { t } = useTranslation();
    const [lang, setLang] = useState<Language>("ru");
    const [mocks, setMocks] = useState<MockDoc[]>([]);
    const [selectedMockId, setSelectedMockId] = useState("");
    const [questions, setQuestions] = useState<QuestionDoc[]>([]);
    const [loading, setLoading] = useState(false);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [deleting, setDeleting] = useState<QuestionDoc | null>(null);
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");

    // Pending image files — selected but not yet uploaded (deferred until Save)
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [pendingPreview, setPendingPreview] = useState("");
    const [pendingOptionFiles, setPendingOptionFiles] = useState<Record<string, File | null>>({ a: null, b: null, c: null, d: null });
    const [pendingOptionPreviews, setPendingOptionPreviews] = useState<Record<string, string>>({ a: "", b: "", c: "", d: "" });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const uploadSlotRef = useRef<string>("");

    const selectedMock = mocks.find(m => m.id === selectedMockId) ?? null;
    const embeddedOnly = Boolean(selectedMock && !selectedMock.questionIds?.length && selectedMock.questions?.length);

    const clearPendingFiles = useCallback(() => {
        if (pendingPreview) URL.revokeObjectURL(pendingPreview);
        Object.values(pendingOptionPreviews).forEach(p => { if (p) URL.revokeObjectURL(p); });
        setPendingFile(null);
        setPendingPreview("");
        setPendingOptionFiles({ a: null, b: null, c: null, d: null });
        setPendingOptionPreviews({ a: "", b: "", c: "", d: "" });
    }, [pendingPreview, pendingOptionPreviews]);

    const openDraft = (d: Draft) => {
        clearPendingFiles();
        setDraft(d);
    };

    const closeDraft = () => {
        clearPendingFiles();
        setDraft(null);
    };

    useEffect(() => {
        const load = async () => {
            const snap = await getDocs(query(collection(db, "mocks"), where("language", "==", lang)));
            setMocks(snap.docs.map(d => ({ id: d.id, ...d.data() } as MockDoc)));
            setSelectedMockId("");
            setQuestions([]);
            closeDraft();
            setStatusMsg("");
        };
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lang]);

    const loadQuestions = async (mock: MockDoc) => {
        if (!mock.questionIds?.length) { setQuestions([]); return; }
        setLoading(true);
        const snaps = await Promise.all(
            mock.questionIds.map(qid => getDoc(doc(db, "questions", qid)))
        );
        setQuestions(
            snaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() } as QuestionDoc))
        );
        setLoading(false);
    };

    const selectMock = (id: string) => {
        setSelectedMockId(id);
        closeDraft();
        setStatusMsg("");
        const mock = mocks.find(m => m.id === id);
        if (mock) loadQuestions(mock);
        else setQuestions([]);
    };

    const triggerUpload = (slot: string) => {
        uploadSlotRef.current = slot;
        fileInputRef.current?.click();
    };

    // Synchronous: store file + local preview only — no upload yet
    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const slot = uploadSlotRef.current;
        if (fileInputRef.current) fileInputRef.current.value = "";

        const preview = URL.createObjectURL(file);
        if (slot === "question") {
            if (pendingPreview) URL.revokeObjectURL(pendingPreview);
            setPendingFile(file);
            setPendingPreview(preview);
        } else {
            if (pendingOptionPreviews[slot]) URL.revokeObjectURL(pendingOptionPreviews[slot]);
            setPendingOptionFiles(prev => ({ ...prev, [slot]: file }));
            setPendingOptionPreviews(prev => ({ ...prev, [slot]: preview }));
        }
    };

    const removePendingOrExisting = (slot: string) => {
        if (slot === "question") {
            if (pendingPreview) {
                URL.revokeObjectURL(pendingPreview);
                setPendingFile(null);
                setPendingPreview("");
            } else {
                setDraft(d => d && { ...d, imageUrl: "" });
            }
        } else {
            if (pendingOptionPreviews[slot]) {
                URL.revokeObjectURL(pendingOptionPreviews[slot]);
                setPendingOptionFiles(prev => ({ ...prev, [slot]: null }));
                setPendingOptionPreviews(prev => ({ ...prev, [slot]: "" }));
            } else {
                setDraft(d => d && { ...d, optionImages: { ...d.optionImages, [slot]: "" } });
            }
        }
    };

    const canSave = Boolean(
        draft && draft.text.trim() && (
            draft.type === "open"
                ? draft.referenceAnswer.trim()
                : OPTION_KEYS.filter(k => draft.options[k].trim()).length >= 2
                  && draft.options[draft.correctKey].trim()
        )
    );

    const handleSave = async () => {
        if (!draft || !selectedMock || !canSave) return;
        setSaving(true);
        setStatusMsg("");
        try {
            // Upload any pending images now (deferred from file-select)
            let questionImageUrl = draft.imageUrl;
            if (pendingFile) {
                questionImageUrl = await uploadToStorage(pendingFile);
            }

            const optionImageUrls = { ...draft.optionImages };
            for (const k of OPTION_KEYS) {
                if (pendingOptionFiles[k]) {
                    optionImageUrls[k] = await uploadToStorage(pendingOptionFiles[k]!);
                }
            }

            const hasOptionImages = Object.values(optionImageUrls).some(v => v);
            const imageFields = {
                ...(questionImageUrl ? { imageUrl: questionImageUrl } : { imageUrl: deleteField() }),
            };
            const optionImageFields = draft.type === "mc"
                ? { ...(hasOptionImages ? { optionImages: optionImageUrls } : { optionImages: deleteField() }) }
                : { optionImages: deleteField() };

            if (draft.id) {
                await updateDoc(doc(db, "questions", draft.id), {
                    text: draft.text.trim(),
                    type: draft.type,
                    explanation: draft.explanation.trim(),
                    ...imageFields,
                    ...optionImageFields,
                    ...(draft.type === "open"
                        ? { correctAnswer: draft.referenceAnswer.trim(), options: deleteField() }
                        : { correctAnswer: draft.correctKey, options: {
                            a: draft.options.a.trim(), b: draft.options.b.trim(),
                            c: draft.options.c.trim(), d: draft.options.d.trim(),
                        } }),
                });
            } else {
                const ref = await addDoc(collection(db, "questions"), {
                    text: draft.text.trim(),
                    type: draft.type,
                    explanation: draft.explanation.trim(),
                    ...(questionImageUrl ? { imageUrl: questionImageUrl } : {}),
                    ...(draft.type === "mc" && hasOptionImages ? { optionImages: optionImageUrls } : {}),
                    ...(draft.type === "open"
                        ? { correctAnswer: draft.referenceAnswer.trim() }
                        : { correctAnswer: draft.correctKey, options: {
                            a: draft.options.a.trim(), b: draft.options.b.trim(),
                            c: draft.options.c.trim(), d: draft.options.d.trim(),
                        } }),
                    difficulty: "medium",
                    subjectId: selectedMock.subject ?? "",
                    language: lang,
                    isMockQuestion: true,
                    createdAt: new Date(),
                });
                await updateDoc(doc(db, "mocks", selectedMock.id), {
                    questionIds: arrayUnion(ref.id),
                    questionCount: increment(1),
                });
                selectedMock.questionIds = [...(selectedMock.questionIds ?? []), ref.id];
            }
            closeDraft();
            setStatusMsg(t("adminMockQ.saved"));
            await loadQuestions(selectedMock);
        } catch (e) {
            console.error(e);
            setStatusMsg(`${t("adminMockQ.errSave")}: ${String(e)}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleting || !selectedMock) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, "mocks", selectedMock.id), {
                questionIds: arrayRemove(deleting.id),
                questionCount: increment(-1),
            });
            await deleteDoc(doc(db, "questions", deleting.id));
            selectedMock.questionIds = (selectedMock.questionIds ?? []).filter(id => id !== deleting.id);
            setDeleting(null);
            setStatusMsg(t("adminMockQ.saved"));
            await loadQuestions(selectedMock);
        } catch (e) {
            console.error(e);
            setStatusMsg(`${t("adminMockQ.errSave")}: ${String(e)}`);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-10">
            <div>
                <h1 className="text-4xl font-semibold tracking-tight text-foreground">{t("adminMockQ.title")}</h1>
                <p className="text-muted-foreground mt-2">{t("adminMockQ.subtitle")}</p>
            </div>

            <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.contentLang")}</label>
                <AdminLanguageToggle value={lang} onChange={l => setLang(l)} />
            </div>

            <div className="flex flex-col gap-2 max-w-md">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("adminMockQ.pickMock")}</label>
                <select
                    value={selectedMockId}
                    onChange={e => selectMock(e.target.value)}
                    className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 appearance-none"
                >
                    <option value="">—</option>
                    {mocks.map(m => (
                        <option key={m.id} value={m.id}>
                            {m.title} ({m.questionIds?.length ?? m.questionCount ?? 0})
                        </option>
                    ))}
                </select>
            </div>

            {statusMsg && (
                <p className={`text-sm font-medium -mt-4 ${statusMsg.startsWith("❌") || statusMsg.includes("Error") || statusMsg.includes("err") ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>
                    {statusMsg}
                </p>
            )}

            {embeddedOnly && (
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 dark:text-amber-400"><AlertTriangle size={14} className="shrink-0" strokeWidth={2} /> {t("adminMockQ.embeddedUnsupported")}</p>
            )}

            {selectedMock && !embeddedOnly && (
                <section className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                        <span className="font-bold text-foreground">{selectedMock.title}</span>
                        <button
                            onClick={() => openDraft(emptyDraft())}
                            className="px-4 py-2 rounded-lg bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-all flex items-center gap-2"
                        >
                            <Plus size={16} />
                            {t("adminMockQ.addQuestion")}
                        </button>
                    </div>

                    {loading ? (
                        <div className="p-6 flex flex-col gap-2">
                            {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-lg animate-pulse bg-muted/40" />)}
                        </div>
                    ) : questions.length === 0 ? (
                        <p className="px-6 py-10 text-center text-muted-foreground font-medium">{t("adminMockQ.noQuestions")}</p>
                    ) : (
                        <ul className="divide-y divide-border">
                            {questions.map((q, i) => {
                                const status = questionStatus(q);
                                return (
                                    <li key={q.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/40 transition-colors">
                                        <span className="w-8 shrink-0 text-sm font-bold text-muted-foreground tabular-nums">{i + 1}</span>
                                        <span className="flex-1 min-w-0 truncate text-sm text-foreground" title={stripHtml(q.text)}>
                                            {stripHtml(q.text) || "—"}
                                        </span>
                                        <span className={`shrink-0 flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-lg ${
                                            q.type === "open"
                                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                                                : "bg-muted text-muted-foreground"
                                        }`}>
                                            {q.type === "open" ? <PenLine size={12} /> : <ListChecks size={12} />}
                                            {q.type === "open" ? t("adminMockQ.typeOpen") : t("adminMockQ.typeMc")}
                                        </span>
                                        <span className="shrink-0 w-40 flex items-center gap-1.5 text-[11px] font-semibold">
                                            {status === "ok" ? (
                                                <><CheckCircle2 size={13} className="text-green-500" /><span className="text-green-600 dark:text-green-400">OK</span></>
                                            ) : (
                                                <><AlertTriangle size={13} className="text-red-500" />
                                                <span className="text-red-500">
                                                    {status === "broken" ? t("adminMockQ.statusBroken") : t("adminMockQ.statusNoAnswer")}
                                                </span></>
                                            )}
                                        </span>
                                        <button
                                            onClick={() => openDraft(draftFromQuestion(q))}
                                            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                                            title={t("adminMockQ.editQuestion")}
                                        >
                                            <Pencil size={15} />
                                        </button>
                                        <button
                                            onClick={() => setDeleting(q)}
                                            className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors"
                                            title={t("common.delete")}
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </section>
            )}

            {/* Edit / add dialog */}
            {draft && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl flex flex-col gap-5">
                        <h2 className="text-xl font-bold text-foreground">
                            {draft.id ? t("adminMockQ.editQuestion") : t("adminMockQ.newQuestion")}
                        </h2>

                        {/* Question text */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("adminMockQ.qText")}</label>
                            <textarea
                                value={draft.text}
                                onChange={e => setDraft(d => d && { ...d, text: e.target.value })}
                                rows={3}
                                className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 resize-y"
                            />
                        </div>

                        {/* Question image — local preview or existing URL */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("admin.imageOptional")}</label>
                            {(pendingPreview || draft.imageUrl) ? (
                                <div className="flex flex-col gap-2">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={pendingPreview || draft.imageUrl}
                                        alt="preview"
                                        className="max-h-40 rounded-lg object-contain border border-border bg-muted"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removePendingOrExisting("question")}
                                        className="flex items-center gap-1.5 w-fit text-sm text-red-500 hover:text-red-600 transition-colors"
                                    >
                                        <X size={14} /> {t("admin.removeImage")}
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => triggerUpload("question")}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-muted border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all w-fit"
                                >
                                    <ImagePlus size={16} /> {t("admin.addImage")}
                                </button>
                            )}
                        </div>

                        {/* Type toggle */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("adminMockQ.qType")}</label>
                            <div className="flex gap-2">
                                {(["mc", "open"] as const).map(tp => (
                                    <button
                                        key={tp}
                                        onClick={() => setDraft(d => d && { ...d, type: tp })}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                                            draft.type === tp
                                                ? "bg-foreground text-background"
                                                : "bg-muted text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {tp === "mc" ? <ListChecks size={14} /> : <PenLine size={14} />}
                                        {tp === "mc" ? t("adminMockQ.typeMc") : t("adminMockQ.typeOpen")}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Options (MC) or reference answer (open) */}
                        {draft.type === "mc" ? (
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("adminMockQ.options")}</label>
                                {OPTION_KEYS.map(k => (
                                    <div key={k} className="flex flex-col gap-1.5">
                                        <div className="flex items-center gap-3">
                                            <label className="flex items-center gap-1.5 cursor-pointer shrink-0 w-20" title={t("adminMockQ.correctMark")}>
                                                <input
                                                    type="radio"
                                                    name="correctKey"
                                                    checked={draft.correctKey === k}
                                                    onChange={() => setDraft(d => d && { ...d, correctKey: k })}
                                                    className="accent-green-600"
                                                />
                                                <span className={`text-sm font-bold ${draft.correctKey === k ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                                                    {k.toUpperCase()}
                                                </span>
                                            </label>
                                            <input
                                                value={draft.options[k]}
                                                onChange={e => setDraft(d => d && { ...d, options: { ...d.options, [k]: e.target.value } })}
                                                className="flex-1 bg-muted border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30"
                                            />
                                            {(pendingOptionPreviews[k] || draft.optionImages[k]) ? (
                                                <button
                                                    type="button"
                                                    onClick={() => removePendingOrExisting(k)}
                                                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/70 transition-colors"
                                                    title={t("admin.removeImage")}
                                                >
                                                    <X size={14} />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => triggerUpload(k)}
                                                    className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-all"
                                                    title={t("admin.addImage")}
                                                >
                                                    <ImagePlus size={14} />
                                                </button>
                                            )}
                                        </div>
                                        {(pendingOptionPreviews[k] || draft.optionImages[k]) && (
                                            <div className="ml-[92px]">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={pendingOptionPreviews[k] || draft.optionImages[k]}
                                                    alt=""
                                                    className="max-h-24 rounded-lg object-contain border border-border bg-muted"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("adminMockQ.referenceAnswer")}</label>
                                <textarea
                                    value={draft.referenceAnswer}
                                    onChange={e => setDraft(d => d && { ...d, referenceAnswer: e.target.value })}
                                    rows={2}
                                    className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 resize-y"
                                />
                            </div>
                        )}

                        {/* Explanation */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("adminMockQ.explanationField")}</label>
                            <textarea
                                value={draft.explanation}
                                onChange={e => setDraft(d => d && { ...d, explanation: e.target.value })}
                                rows={2}
                                className="w-full bg-muted border border-border rounded-lg p-3 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/30 resize-y"
                            />
                        </div>

                        {/* Hidden file input — shared for all image slots */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                        />

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={closeDraft}
                                disabled={saving}
                                className="px-5 py-2.5 rounded-lg border border-border font-semibold text-sm hover:bg-muted transition-colors text-foreground"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!canSave || saving}
                                className="px-5 py-2.5 rounded-lg bg-foreground text-background font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-2"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {saving ? t("admin.uploading") : t("common.save")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation dialog */}
            {deleting && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md shadow-xl flex flex-col gap-4">
                        <h2 className="text-lg font-bold text-foreground">{t("adminMockQ.deleteConfirmTitle")}</h2>
                        <p className="text-sm text-muted-foreground">{t("adminMockQ.deleteConfirmText")}</p>
                        <p className="text-sm text-foreground bg-muted rounded-lg p-3 line-clamp-3">{stripHtml(deleting.text)}</p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setDeleting(null)}
                                disabled={saving}
                                className="px-5 py-2.5 rounded-lg border border-border font-semibold text-sm hover:bg-muted transition-colors text-foreground"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={saving}
                                className="px-5 py-2.5 rounded-lg bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 size={15} />}
                                {t("common.delete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
