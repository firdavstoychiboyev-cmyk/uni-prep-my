"use client";

import { useCallback, useEffect, useState } from "react";
import { Zap, Loader2, CalendarClock, Trash2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fetchSubjects } from "@/lib/data-fetching";
import { fetchActiveMocks, MockOption } from "@/lib/homework-utils";
import { scheduleGroupRush, fetchGroupRushSessions, deleteRushSession } from "@/lib/rush-utils";
import { Subject, User, Language, RushSession } from "@/lib/firestore-schema";
import { isAnyAdmin } from "@/lib/roles";

/**
 * Учительская форма: назначить Rush-сессию группе — выбрать предмет, набор
 * вопросов (ингестированный мок), время открытия и (необязательно) окно
 * закрытия. Самодостаточна: сама грузит предметы и активные моки.
 */
export default function RushScheduler({ classId, user }: { classId: string; user: User }) {
    const { t, language } = useTranslation();
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [mocks, setMocks] = useState<MockOption[]>([]);
    const [subjectId, setSubjectId] = useState("");
    const [mockId, setMockId] = useState("");
    const [scheduledFor, setScheduledFor] = useState("");
    const [windowEnd, setWindowEnd] = useState("");
    const [resultsRevealAt, setResultsRevealAt] = useState("");
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState("");
    const [planned, setPlanned] = useState<RushSession[] | null>(null);

    useEffect(() => {
        fetchSubjects().then(setSubjects).catch(() => {});
        fetchActiveMocks().then(setMocks).catch(() => {});
    }, [language]);

    const loadPlanned = useCallback(() => {
        setPlanned(null);
        fetchGroupRushSessions(classId).then(setPlanned).catch(() => setPlanned([]));
    }, [classId]);

    useEffect(() => { loadPlanned(); }, [loadPlanned]);

    const cancelRush = async (id: string) => {
        if (!window.confirm(t("rush.cancelConfirm"))) return;
        try {
            await deleteRushSession(id);
            setPlanned((prev) => prev?.filter((s) => s.id !== id) ?? null);
        } catch (e) {
            console.error(e);
        }
    };

    const fmt = (iso?: string) =>
        iso ? new Date(iso).toLocaleString(language === "uz" ? "uz-UZ" : "ru-RU", {
            day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
        }) : "—";

    const filteredMocks = mocks.filter((m) => !m.subject || m.subject === subjectId);
    const selectedMock = mocks.find((m) => m.id === mockId);
    // A mock with no attached questions can't seed a rush — block it up front.
    const mockIsEmpty = Boolean(selectedMock && (selectedMock.questionCount ?? 0) === 0);
    const ready = subjectId && mockId && scheduledFor && !mockIsEmpty;

    const submit = async () => {
        if (!ready || busy) return;
        setBusy(true);
        setMsg("");
        try {
            await scheduleGroupRush({
                subjectId,
                mockId,
                groupId: classId,
                scheduledFor: new Date(scheduledFor).toISOString(),
                windowEnd: windowEnd ? new Date(windowEnd).toISOString() : undefined,
                resultsRevealAt: resultsRevealAt ? new Date(resultsRevealAt).toISOString() : undefined,
                createdBy: user.id,
                creatorRole: isAnyAdmin(user) ? "admin" : "teacher",
                language: (user.language ?? "ru") as Language,
                title: subjects.find((s) => s.id === subjectId)?.name,
            });
            setMsg(t("rush.scheduledOk"));
            setSubjectId(""); setMockId(""); setScheduledFor(""); setWindowEnd(""); setResultsRevealAt("");
            loadPlanned();
        } catch (e) {
            console.error(e);
            // Surface the real reason instead of a catch-all. The most common
            // failure is a mock with zero questions.
            const code = e instanceof Error ? e.message : "";
            setMsg(code === "no-questions-for-subject" ? t("rush.mockEmpty") : t("rush.scheduleError"));
        } finally {
            setBusy(false);
        }
    };

    return (
        <section>
            <div className="mb-5 flex items-center gap-2.5">
                <Zap className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-bold tracking-tight text-foreground">{t("rush.schedule")}</h2>
            </div>
            <div className="rounded-2xl border border-border bg-muted/50 p-6 dark:bg-muted/30">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <select value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setMockId(""); }}
                        className="h-12 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25">
                        <option value="">{t("rush.pickSubject")}</option>
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ""}{s.name}</option>)}
                    </select>
                    <select value={mockId} onChange={(e) => setMockId(e.target.value)} disabled={!subjectId}
                        className="h-12 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-50">
                        <option value="">{t("rush.pickMock")}</option>
                        {filteredMocks.map((m) => (
                            <option key={m.id} value={m.id}>
                                {m.title} · {m.questionCount ?? 0} {t("rush.mockQuestionCount")}
                            </option>
                        ))}
                    </select>
                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {t("rush.scheduleFor")}
                        <input type="datetime-local" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)}
                            className="h-12 rounded-xl border border-border bg-background px-3.5 text-sm font-normal normal-case text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {t("rush.windowEnd")}
                        <input type="datetime-local" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)}
                            className="h-12 rounded-xl border border-border bg-background px-3.5 text-sm font-normal normal-case text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground sm:col-span-2">
                        {t("rush.resultsRevealAt")}
                        <input type="datetime-local" value={resultsRevealAt} onChange={(e) => setResultsRevealAt(e.target.value)}
                            className="h-12 rounded-xl border border-border bg-background px-3.5 text-sm font-normal normal-case text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25" />
                        <span className="text-[11px] font-normal normal-case text-muted-foreground">{t("rush.resultsRevealHint")}</span>
                    </label>
                </div>
                {mockIsEmpty && <p className="mt-3 text-sm font-medium text-red-500">{t("rush.mockEmpty")}</p>}
                {msg && <p className={`mt-3 text-sm font-medium ${msg.startsWith("❌") || msg === t("rush.scheduleError") || msg === t("rush.mockEmpty") ? "text-red-500" : "text-green-600 dark:text-green-400"}`}>{msg}</p>}
                <button onClick={submit} disabled={!ready || busy}
                    className="mt-4 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-7 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {busy ? t("rush.scheduling") : t("rush.scheduleBtn")}
                </button>
            </div>

            {/* Already-scheduled Rush sessions for this group */}
            <div className="mt-8">
                <div className="mb-3 flex items-center gap-2.5">
                    <CalendarClock className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-bold tracking-tight text-foreground">{t("rush.plannedTitle")}</h3>
                </div>
                {planned === null ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> …
                    </div>
                ) : planned.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                        {t("rush.plannedEmpty")}
                    </p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {planned.map((s) => (
                            <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                                <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-foreground">
                                        {s.title || subjects.find((sub) => sub.id === s.subjectId)?.name || s.subjectId}
                                        <span className="ml-2 text-xs font-medium text-muted-foreground">
                                            {s.questionIds?.length ?? 0} {t("rush.mockQuestionCount")}
                                        </span>
                                    </div>
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                        {t("rush.opensAt")}: {fmt(s.scheduledFor)}
                                        {s.windowEnd ? ` · ${t("rush.closesAt")}: ${fmt(s.windowEnd)}` : ""}
                                    </div>
                                </div>
                                <button
                                    onClick={() => cancelRush(s.id)}
                                    title={t("rush.cancelRush")}
                                    className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}
