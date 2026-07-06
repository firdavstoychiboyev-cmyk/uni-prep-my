"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Plus, Trash2, Loader2, CheckCircle2, FileText, Upload, Database, FolderUp, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fetchSubjects } from "@/lib/data-fetching";
import {
    createEntranceTest, fetchAllEntranceTests, setEntranceTestStatus, deleteEntranceTest,
    fetchGeneralBankQuestions, fetchEntranceSets, uploadEntranceSet,
} from "@/lib/entrance-utils";
import {
    Subject, EntranceTest, EntranceQuestionType, EntranceQuestionSource, EntranceSet, Language,
} from "@/lib/firestore-schema";

const GRADES = ["5", "6", "7", "8", "9", "10", "11"];

export default function AdminEntrancePage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const lang = (user?.language ?? "ru") as Language;
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [tests, setTests] = useState<EntranceTest[]>([]);
    const [busy, setBusy] = useState(false);

    // form
    const [grade, setGrade] = useState("");
    const [subjectId, setSubjectId] = useState("");
    const [count, setCount] = useState("20");
    const [qType, setQType] = useState<EntranceQuestionType>("mc");
    const [time, setTime] = useState("30");
    const [source, setSource] = useState<EntranceQuestionSource>("general");

    // general-bank availability
    const [generalAvail, setGeneralAvail] = useState<number | null>(null);
    // dedicated sets + upload
    const [sets, setSets] = useState<EntranceSet[]>([]);
    const [dedicatedSetId, setDedicatedSetId] = useState("");
    const [upFile, setUpFile] = useState<File | null>(null);
    const [upTitle, setUpTitle] = useState("");
    const [uploading, setUploading] = useState(false);
    const [upMsg, setUpMsg] = useState("");

    const reload = () => fetchAllEntranceTests().then(setTests).catch(() => {});
    useEffect(() => { fetchSubjects().then(setSubjects).catch(() => {}); reload(); }, []);

    // general-bank count for subject+type
    useEffect(() => {
        if (source !== "general" || !subjectId) { setGeneralAvail(null); return; }
        let cancelled = false;
        setGeneralAvail(null);
        fetchGeneralBankQuestions(subjectId, qType)
            .then((qs) => { if (!cancelled) setGeneralAvail(qs.length); })
            .catch(() => { if (!cancelled) setGeneralAvail(0); });
        return () => { cancelled = true; };
    }, [source, subjectId, qType, lang]);

    // dedicated sets for grade+subject
    const loadSets = () => {
        if (!grade || !subjectId) { setSets([]); return; }
        fetchEntranceSets(grade, subjectId, lang).then(setSets).catch(() => setSets([]));
    };
    useEffect(() => {
        if (source !== "dedicated") return;
        setDedicatedSetId("");
        loadSets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [source, grade, subjectId, lang]);

    const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;
    const wantCount = Math.max(1, parseInt(count, 10) || 1);
    const notEnoughGeneral = source === "general" && generalAvail !== null && generalAvail < wantCount;

    const ready = grade && subjectId && wantCount > 0 && Number(time) > 0 && (
        source === "general" ? (generalAvail ?? 0) > 0 : Boolean(dedicatedSetId)
    );

    const doUpload = async () => {
        if (!upFile || !upTitle.trim() || !grade || !subjectId || !user || uploading) return;
        setUploading(true); setUpMsg("");
        try {
            const { count: n } = await uploadEntranceSet(upFile, { title: upTitle.trim(), grade, subjectId, language: lang, createdBy: user.id });
            setUpMsg(t("adminEntrance.uploaded", { count: n }));
            setUpFile(null); setUpTitle("");
            loadSets();
        } catch (e) {
            console.error(e); setUpMsg("❌ " + String(e));
        } finally { setUploading(false); }
    };

    const create = async () => {
        if (!ready || !user || busy) return;
        setBusy(true);
        try {
            await createEntranceTest({
                grade, subjectId,
                questionCount: wantCount,
                questionType: qType,
                timeLimitMinutes: Math.max(1, parseInt(time, 10) || 1),
                questionSource: source,
                dedicatedSetId: source === "dedicated" ? dedicatedSetId : undefined,
                status: "published",
                createdBy: user.id,
                language: lang,
                title: `${grade}-${subjectName(subjectId)}`,
            });
            await reload();
        } catch (e) { console.error(e); } finally { setBusy(false); }
    };

    return (
        <div className="flex flex-col gap-8">
            <div>
                <h1 className="flex items-center gap-2 text-4xl font-semibold tracking-tight text-foreground">
                    <GraduationCap size={28} /> {t("adminEntrance.title")}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">{t("adminEntrance.subtitle")}</p>
            </div>

            {/* Create form */}
            <div className="rounded-2xl border border-border bg-card p-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <Field label={t("adminEntrance.grade")}>
                        <select value={grade} onChange={(e) => setGrade(e.target.value)} className={selectCls}>
                            <option value="">—</option>
                            {GRADES.map((g) => <option key={g} value={g}>{t("entrance.grade", { grade: g })}</option>)}
                        </select>
                    </Field>
                    <Field label={t("adminEntrance.subject")}>
                        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={selectCls}>
                            <option value="">—</option>
                            {subjects.map((s) => <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ""}{s.name}</option>)}
                        </select>
                    </Field>
                    <Field label={t("adminEntrance.count")}>
                        <input value={count} onChange={(e) => setCount(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={selectCls} />
                    </Field>
                    <Field label={t("adminEntrance.qType")}>
                        <select value={qType} onChange={(e) => setQType(e.target.value as EntranceQuestionType)} className={selectCls}>
                            <option value="mc">{t("adminEntrance.typeMc")}</option>
                            <option value="open">{t("adminEntrance.typeOpen")}</option>
                            <option value="mixed">{t("adminEntrance.typeMixed")}</option>
                        </select>
                    </Field>
                    <Field label={t("adminEntrance.time")}>
                        <input value={time} onChange={(e) => setTime(e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={selectCls} />
                    </Field>
                </div>

                {/* Source selector */}
                <div className="mt-5">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t("adminEntrance.source")}</span>
                    <div className="mt-2 grid max-w-xl grid-cols-2 gap-2">
                        {([
                            { v: "general", label: t("adminEntrance.sourceGeneral"), icon: Database },
                            { v: "dedicated", label: t("adminEntrance.sourceDedicated"), icon: FolderUp },
                        ] as const).map((o) => (
                            <button key={o.v} type="button" onClick={() => setSource(o.v)}
                                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${source === o.v ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"}`}>
                                <o.icon size={15} /> {o.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* General: availability / warning */}
                {source === "general" && subjectId && (
                    <div className="mt-3">
                        {generalAvail === null ? (
                            <p className="text-xs text-muted-foreground">…</p>
                        ) : notEnoughGeneral ? (
                            <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
                                <AlertTriangle size={14} /> {t("adminEntrance.notEnough", { have: generalAvail, want: wantCount })}
                            </p>
                        ) : (
                            <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 size={14} className="text-emerald-500" /> {t("adminEntrance.generalAvail", { count: generalAvail })}
                            </p>
                        )}
                    </div>
                )}

                {/* Dedicated: set dropdown + upload */}
                {source === "dedicated" && (
                    <div className="mt-3 flex flex-col gap-3">
                        {grade && subjectId ? (
                            sets.length > 0 ? (
                                <Field label={t("adminEntrance.pickSet")}>
                                    <select value={dedicatedSetId} onChange={(e) => setDedicatedSetId(e.target.value)} className={`${selectCls} max-w-md`}>
                                        <option value="">—</option>
                                        {sets.map((st) => <option key={st.id} value={st.id}>{st.title} ({st.questionCount})</option>)}
                                    </select>
                                </Field>
                            ) : (
                                <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                                    <AlertTriangle size={14} /> {t("adminEntrance.noSet")}
                                </p>
                            )
                        ) : null}

                        {/* Upload panel (mirrors Mocklar XLSX ingestion) */}
                        {grade && subjectId && (
                            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
                                <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    <Upload size={14} /> {t("adminEntrance.uploadSet")}
                                </div>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    <input value={upTitle} onChange={(e) => setUpTitle(e.target.value)} placeholder={t("adminEntrance.setTitle")} className={selectCls} />
                                    <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3.5 text-sm text-muted-foreground hover:border-foreground/30">
                                        <FileText size={14} /> {upFile ? upFile.name : t("adminEntrance.pickFile")}
                                        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setUpFile(f); setUpMsg(""); } }} />
                                    </label>
                                </div>
                                {upMsg && <p className={`mt-2 text-sm font-medium ${upMsg.startsWith("❌") ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>{upMsg}</p>}
                                <button onClick={doUpload} disabled={!upFile || !upTitle.trim() || uploading}
                                    className="mt-3 inline-flex h-10 items-center gap-2 rounded-xl bg-foreground px-5 text-sm font-semibold text-background transition-all hover:opacity-90 disabled:opacity-40">
                                    {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                                    {uploading ? t("adminEntrance.uploading") : t("adminEntrance.upload")}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                <button onClick={create} disabled={!ready || busy}
                    className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-6 text-sm font-semibold text-background transition-all hover:opacity-90 disabled:opacity-40">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {t("adminEntrance.create")}
                </button>
            </div>

            {/* Tests list */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {tests.length === 0 ? (
                    <p className="p-8 text-center text-sm text-muted-foreground">{t("adminEntrance.empty")}</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                <th className="px-5 py-3">{t("adminEntrance.grade")}</th>
                                <th className="px-3 py-3">{t("adminEntrance.subject")}</th>
                                <th className="px-3 py-3">{t("adminEntrance.source")}</th>
                                <th className="px-3 py-3">{t("adminEntrance.count")}</th>
                                <th className="px-3 py-3">{t("adminEntrance.time")}</th>
                                <th className="px-3 py-3">{t("adminCodes.colStatus")}</th>
                                <th className="px-3 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {tests.map((tst) => (
                                <tr key={tst.id} className="hover:bg-muted/40">
                                    <td className="px-5 py-3 font-semibold text-foreground">{t("entrance.grade", { grade: tst.grade })}</td>
                                    <td className="px-3 py-3 text-muted-foreground">{subjectName(tst.subjectId)}</td>
                                    <td className="px-3 py-3 text-muted-foreground">
                                        {tst.questionSource === "dedicated" ? t("adminEntrance.sourceDedicated") : t("adminEntrance.sourceGeneral")}
                                    </td>
                                    <td className="px-3 py-3 text-muted-foreground tabular-nums">{tst.questionIds?.length ?? tst.questionCount}</td>
                                    <td className="px-3 py-3 text-muted-foreground tabular-nums">{tst.timeLimitMinutes}</td>
                                    <td className="px-3 py-3">
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tst.status === "published" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                                            {tst.status === "published" ? <CheckCircle2 size={11} /> : <FileText size={11} />}
                                            {tst.status === "published" ? t("adminEntrance.published") : t("adminEntrance.draft")}
                                        </span>
                                    </td>
                                    <td className="px-3 py-3">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button onClick={() => setEntranceTestStatus(tst.id, tst.status === "published" ? "draft" : "published").then(reload)}
                                                className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground">
                                                {tst.status === "published" ? t("adminEntrance.unpublish") : t("adminEntrance.publish")}
                                            </button>
                                            <button onClick={() => { if (confirm(t("adminEntrance.title") + "?")) deleteEntranceTest(tst.id).then(reload); }}
                                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30">
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

const selectCls = "h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-50";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
            {children}
        </label>
    );
}
