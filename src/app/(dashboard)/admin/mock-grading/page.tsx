"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { ClipboardCheck, Loader2, ChevronLeft, Users2, CheckCircle2, XCircle } from "lucide-react";
import { MockAttempt, User } from "@/lib/firestore-schema";
import { fetchAttemptsForMock, saveEssayGrades } from "@/lib/mock-attempts";
import { computeMockScores, questionValue, suggestedEssayScore, ScorableQuestion } from "@/lib/mock-exam";

const stripHtml = (s: string) => (s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

interface MockRow { id: string; title: string; }
interface GQuestion extends ScorableQuestion {
    text: string;
    options?: { a?: string; b?: string; c?: string; d?: string };
}

const isEssay = (q: GQuestion) => q.type === "open" || q.type === "text";

export default function AdminMockGradingPage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();

    const [mocks, setMocks] = useState<MockRow[]>([]);
    const [selectedMockId, setSelectedMockId] = useState("");
    const [questions, setQuestions] = useState<GQuestion[]>([]);
    const [attempts, setAttempts] = useState<MockAttempt[]>([]);
    const [usersById, setUsersById] = useState<Record<string, User>>({});
    const [loading, setLoading] = useState(false);

    // Grading panel
    const [openAttempt, setOpenAttempt] = useState<MockAttempt | null>(null);
    const [essayDraft, setEssayDraft] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getDocs(collection(db, "mocks"))
            .then(snap => setMocks(snap.docs.map(d => ({ id: d.id, title: (d.data().title as string) || d.id }))))
            .catch(() => {});
    }, []);

    const loadMock = async (mockId: string) => {
        setSelectedMockId(mockId);
        setOpenAttempt(null);
        if (!mockId) { setAttempts([]); setQuestions([]); return; }
        setLoading(true);
        try {
            // Questions (same shape/keys as the student flow: id = docId, or index for embedded)
            const mockSnap = await getDoc(doc(db, "mocks", mockId));
            const mockData = mockSnap.data() as { questionIds?: string[]; questions?: GQuestion[] } | undefined;
            let qs: GQuestion[] = [];
            if (mockData?.questionIds?.length) {
                const docs = await Promise.all(mockData.questionIds.map(qid => getDoc(doc(db, "questions", qid))));
                qs = docs.filter(d => d.exists()).map(d => ({ id: d.id, ...(d.data() as object) } as GQuestion));
            } else if (mockData?.questions?.length) {
                qs = mockData.questions.map((q, i) => ({ ...q, id: q.id ?? String(i) }));
            }
            qs = qs.map((q, i) => ({ ...q, id: q.id ?? String(i) }));
            setQuestions(qs);

            const list = await fetchAttemptsForMock(mockId);
            setAttempts(list);

            // Load student names
            const ids = Array.from(new Set(list.map(a => a.studentId)));
            const userDocs = await Promise.all(ids.map(uid => getDoc(doc(db, "users", uid))));
            const map: Record<string, User> = {};
            userDocs.forEach(d => { if (d.exists()) map[d.id] = { id: d.id, ...(d.data() as object) } as User; });
            setUsersById(map);
        } finally {
            setLoading(false);
        }
    };

    const studentName = (uid: string) => {
        const u = usersById[uid];
        return u ? `${u.name}${u.surname ? " " + u.surname : ""}` : uid.slice(0, 8);
    };

    // Population average across submitted attempts
    const submitted = attempts.filter(a => a.status === "completed" || a.status === "auto_submitted");
    const avgPct = submitted.length
        ? Math.round(submitted.reduce((s, a) => s + (a.percentage ?? 0), 0) / submitted.length)
        : null;

    const openForGrading = (a: MockAttempt) => {
        setOpenAttempt(a);
        const draft: Record<string, string> = {};
        for (const q of questions) {
            if (!isEssay(q)) continue;
            const existing = a.essayScores?.[q.id];
            const val = typeof existing === "number"
                ? existing
                : suggestedEssayScore(q, a.answers?.[q.id] ?? null); // pre-fill suggestion
            draft[q.id] = String(val);
        }
        setEssayDraft(draft);
    };

    const essayScoresNumeric = useMemo(() => {
        const out: Record<string, number> = {};
        for (const [k, v] of Object.entries(essayDraft)) {
            const n = parseFloat(v);
            if (!Number.isNaN(n)) out[k] = n;
        }
        return out;
    }, [essayDraft]);

    // Live recompute preview for the open attempt
    const preview = useMemo(() => {
        if (!openAttempt) return null;
        return computeMockScores(questions, openAttempt.answers ?? {}, essayScoresNumeric);
    }, [openAttempt, questions, essayScoresNumeric]);

    const saveGrades = async () => {
        if (!openAttempt || !user || !preview) return;
        setSaving(true);
        try {
            await saveEssayGrades(openAttempt.id, {
                essayScores: essayScoresNumeric,
                rawScore: preview.rawScore,
                weightedScore: preview.weightedScore,
                maxWeightedScore: preview.maxWeightedScore,
                percentage: preview.percentage,
                grade: preview.grade,
                gradedBy: user.id,
            });
            // Reflect locally
            setAttempts(prev => prev.map(a => a.id === openAttempt.id
                ? { ...a, ...preview, essayScores: essayScoresNumeric, gradedBy: user.id }
                : a));
            setOpenAttempt(null);
        } catch (e) {
            console.error("Error saving grades:", e);
        } finally {
            setSaving(false);
        }
    };

    const statusBadge = (s: MockAttempt["status"]) => {
        const map: Record<MockAttempt["status"], string> = {
            in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
            completed: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
            auto_submitted: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
        };
        return <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${map[s]}`}>{t(`mockGrade.status.${s}`)}</span>;
    };

    const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

    // ── Grading panel ─────────────────────────────────────────────────────────
    if (openAttempt) {
        return (
            <div className="flex flex-col gap-6">
                <button onClick={() => setOpenAttempt(null)} className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground w-fit">
                    <ChevronLeft size={16} /> {t("mockGrade.backToList")}
                </button>
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{studentName(openAttempt.studentId)}</h1>
                        <div className="mt-1 flex items-center gap-2">{statusBadge(openAttempt.status)}<span className="text-sm text-muted-foreground">{fmt(openAttempt.submittedAt)}</span></div>
                    </div>
                    {preview && (
                        <div className="text-right">
                            <div className="text-3xl font-black text-foreground">{preview.percentage}% · {preview.grade}</div>
                            <div className="text-xs text-muted-foreground">{preview.weightedScore} / {preview.maxWeightedScore} {t("mockGrade.points")}</div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3">
                    {questions.map((q, i) => {
                        const ans = openAttempt.answers?.[q.id] ?? null;
                        const weight = questionValue(q);
                        const essay = isEssay(q);
                        const mcCorrect = !essay && ans != null && ans === q.correctAnswer;
                        return (
                            <div key={q.id} className="rounded-xl border border-border bg-card p-4">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <span className="text-sm font-bold text-foreground">
                                        {i + 1}. {stripHtml(q.text).slice(0, 140)}
                                    </span>
                                    <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">×{weight}</span>
                                </div>
                                <div className="text-sm text-muted-foreground mb-2">
                                    <span className="font-semibold">{t("mockGrade.studentAnswer")}: </span>
                                    {ans == null || ans === ""
                                        ? <span className="italic text-red-500">{t("mockGrade.noAnswer")}</span>
                                        : essay ? <span className="text-foreground whitespace-pre-wrap">{ans}</span>
                                            : <span className="text-foreground">{ans.toUpperCase()}. {stripHtml(q.options?.[ans as "a"] ?? "")}</span>}
                                </div>
                                {essay ? (
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("mockGrade.points")}</label>
                                        <input
                                            type="number" min={0} max={weight} step={0.5}
                                            value={essayDraft[q.id] ?? ""}
                                            onChange={e => setEssayDraft(d => ({ ...d, [q.id]: e.target.value }))}
                                            className="w-24 bg-muted border border-border rounded-lg p-2 text-sm focus:outline-none focus:border-ring"
                                        />
                                        <span className="text-xs text-muted-foreground">/ {weight}</span>
                                    </div>
                                ) : (
                                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${mcCorrect ? "text-green-600" : "text-red-500"}`}>
                                        {mcCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                                        {mcCorrect ? t("mockGrade.correct") : t("mockGrade.incorrect")}
                                        {!essay && <span className="text-muted-foreground font-normal ml-1">({t("mockGrade.correctAnswer")}: {(q.correctAnswer ?? "").toUpperCase()})</span>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end sticky bottom-0 bg-background py-3">
                    <button onClick={saveGrades} disabled={saving}
                        className="px-6 py-3 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 disabled:opacity-40 flex items-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t("mockGrade.saveGrades")}
                    </button>
                </div>
            </div>
        );
    }

    // ── Attempts list ─────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
                    <ClipboardCheck size={22} /> {t("mockGrade.title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("mockGrade.subtitle")}</p>
            </div>

            <div className="flex flex-col gap-2 max-w-md">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("mockGrade.pickMock")}</label>
                <select value={selectedMockId} onChange={e => loadMock(e.target.value)}
                    className="h-12 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25">
                    <option value="">—</option>
                    {mocks.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
            </div>

            {loading ? (
                <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> …</div>
            ) : selectedMockId && (
                <>
                    {avgPct !== null && (
                        <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/40 px-5 py-4 w-fit">
                            <Users2 className="w-6 h-6 text-blue-600" />
                            <div>
                                <div className="text-2xl font-black text-foreground">{avgPct}%</div>
                                <div className="text-xs text-muted-foreground">{t("mockGrade.avgAcross", { count: submitted.length })}</div>
                            </div>
                        </div>
                    )}

                    <section className="bg-card border border-border rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-muted/50 border-b border-border">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("mockGrade.student")}</th>
                                    <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("mockGrade.statusCol")}</th>
                                    <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("mockGrade.submitted")}</th>
                                    <th className="px-6 py-3 text-xs font-bold text-muted-foreground uppercase tracking-widest">{t("mockGrade.score")}</th>
                                    <th className="px-6 py-3 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {attempts.length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">{t("mockGrade.noAttempts")}</td></tr>
                                ) : attempts.map(a => (
                                    <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-foreground">{studentName(a.studentId)}</td>
                                        <td className="px-6 py-4">{statusBadge(a.status)}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{fmt(a.submittedAt)}</td>
                                        <td className="px-6 py-4 text-foreground">
                                            {a.status === "in_progress" ? "—" : `${a.percentage ?? 0}% · ${a.grade ?? "—"}`}
                                            {a.gradedBy && <span className="ml-2 text-[11px] text-green-600 font-semibold">{t("mockGrade.graded")}</span>}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => openForGrading(a)} disabled={a.status === "in_progress"}
                                                className="px-4 py-2 rounded-lg bg-foreground text-background text-xs font-semibold hover:opacity-90 disabled:opacity-40">
                                                {t("mockGrade.grade")}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </>
            )}
        </div>
    );
}
