"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Plus, Trash2, Loader2, CheckCircle2, FileText } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fetchSubjects } from "@/lib/data-fetching";
import { fetchActiveMocks, MockOption } from "@/lib/homework-utils";
import {
    createEntranceTest, fetchAllEntranceTests, setEntranceTestStatus, deleteEntranceTest,
} from "@/lib/entrance-utils";
import { Subject, EntranceTest, EntranceQuestionType, Language } from "@/lib/firestore-schema";

const GRADES = ["5", "6", "7", "8", "9", "10", "11"];

export default function AdminEntrancePage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [mocks, setMocks] = useState<MockOption[]>([]);
    const [tests, setTests] = useState<EntranceTest[]>([]);
    const [busy, setBusy] = useState(false);

    // form
    const [grade, setGrade] = useState("");
    const [subjectId, setSubjectId] = useState("");
    const [poolRef, setPoolRef] = useState("");
    const [count, setCount] = useState("20");
    const [qType, setQType] = useState<EntranceQuestionType>("mc");
    const [time, setTime] = useState("30");

    const reload = () => fetchAllEntranceTests().then(setTests).catch(() => {});
    useEffect(() => {
        fetchSubjects().then(setSubjects).catch(() => {});
        fetchActiveMocks().then(setMocks).catch(() => {});
        reload();
    }, []);

    const poolOptions = mocks.filter((m) => !m.subject || m.subject === subjectId);
    const ready = grade && subjectId && poolRef && Number(count) > 0 && Number(time) > 0;
    const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;

    const create = async () => {
        if (!ready || !user || busy) return;
        setBusy(true);
        try {
            await createEntranceTest({
                grade, subjectId, questionPoolRef: poolRef,
                questionCount: Math.max(1, parseInt(count, 10) || 1),
                questionType: qType,
                timeLimitMinutes: Math.max(1, parseInt(time, 10) || 1),
                status: "published",
                createdBy: user.id,
                language: (user.language ?? "ru") as Language,
                title: `${grade}-${subjectName(subjectId)}`,
            });
            setPoolRef("");
            await reload();
        } catch (e) {
            console.error(e);
        } finally {
            setBusy(false);
        }
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label={t("adminEntrance.grade")}>
                        <select value={grade} onChange={(e) => setGrade(e.target.value)} className={selectCls}>
                            <option value="">—</option>
                            {GRADES.map((g) => <option key={g} value={g}>{t("entrance.grade", { grade: g })}</option>)}
                        </select>
                    </Field>
                    <Field label={t("adminEntrance.subject")}>
                        <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setPoolRef(""); }} className={selectCls}>
                            <option value="">—</option>
                            {subjects.map((s) => <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ""}{s.name}</option>)}
                        </select>
                    </Field>
                    <Field label={t("adminEntrance.pool")}>
                        <select value={poolRef} onChange={(e) => setPoolRef(e.target.value)} disabled={!subjectId} className={selectCls}>
                            <option value="">{subjectId && poolOptions.length === 0 ? t("adminEntrance.noPool") : "—"}</option>
                            {poolOptions.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
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
                <button onClick={create} disabled={!ready || busy}
                    className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-6 text-sm font-semibold text-background transition-all hover:opacity-90 disabled:opacity-40">
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
                                    <td className="px-3 py-3 text-muted-foreground tabular-nums">{tst.questionCount}</td>
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
