"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fetchSubjects } from "@/lib/data-fetching";
import {
    fetchAvailableRushSessions, createManualRushSession, isRushOpen,
} from "@/lib/rush-utils";
import { RushSession, RushAttempt, Subject } from "@/lib/firestore-schema";
import { Zap, Clock, Play, CheckCircle2, Lock, ChevronRight, Loader2 } from "lucide-react";

const fmtCountdown = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
};

export default function RushListPage() {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const router = useRouter();

    const [sessions, setSessions] = useState<RushSession[]>([]);
    const [attempts, setAttempts] = useState<Record<string, RushAttempt>>({});
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [pickSubject, setPickSubject] = useState("");
    const [starting, setStarting] = useState(false);
    const [now, setNow] = useState(Date.now());

    // Тик для обратного отсчёта запланированных сессий
    useEffect(() => {
        const iv = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(iv);
    }, []);

    useEffect(() => {
        if (!user) return;
        let cancelled = false;
        (async () => {
            try {
                const [subs, sess, attSnap] = await Promise.all([
                    fetchSubjects(),
                    fetchAvailableRushSessions(user),
                    getDocs(query(collection(db, "rushAttempts"), where("studentId", "==", user.id))),
                ]);
                if (cancelled) return;
                setSubjects(subs);
                setSessions(sess);
                const map: Record<string, RushAttempt> = {};
                attSnap.docs.forEach((d) => {
                    const a = { id: d.id, ...d.data() } as RushAttempt;
                    map[a.sessionId] = a;
                });
                setAttempts(map);
            } catch (e) {
                console.error("Error loading rush sessions:", e);
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? id;
    const subjectEmoji = (id: string) => subjects.find((s) => s.id === id)?.emoji;

    // Предметы, по которым есть активные моки — берём из fetchSubjects (упрощённо
    // показываем все; при старте проверяем наличие вопросов)
    const startableSubjects = useMemo(() => subjects, [subjects]);

    const handleStart = async () => {
        if (!user || !pickSubject || starting) return;
        setStarting(true);
        try {
            const id = await createManualRushSession(user, pickSubject);
            router.push(`/rush/${id}`);
        } catch (e) {
            console.error(e);
            alert(t("rush.noMockForSubject"));
            setStarting(false);
        }
    };

    const active: RushSession[] = [];
    const past: RushSession[] = [];
    sessions.forEach((s) => {
        const att = attempts[s.id];
        if (att?.submittedAt) past.push(s);
        else active.push(s);
    });

    return (
        <div className="flex flex-col gap-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div>
                <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    <Zap className="h-7 w-7 text-amber-500" /> {t("rush.title")}
                </h1>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{t("rush.subtitle")}</p>
            </div>

            {/* Start a manual rush */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h2 className="mb-4 text-[15px] font-bold text-foreground">{t("rush.startNew")}</h2>
                <div className="flex flex-col gap-3 sm:flex-row">
                    <select
                        value={pickSubject}
                        onChange={(e) => setPickSubject(e.target.value)}
                        className="h-12 flex-1 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25"
                    >
                        <option value="">{t("rush.pickSubject")}</option>
                        {startableSubjects.map((s) => (
                            <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ""}{s.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleStart}
                        disabled={!pickSubject || starting}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-7 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-40"
                    >
                        {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        {t("rush.begin")}
                    </button>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{t("rush.questionsMeta")} · {t("rush.beginNote")}</p>
            </div>

            {/* Available / scheduled */}
            <section>
                <h2 className="mb-4 text-[17px] font-bold text-foreground">{t("rush.available")}</h2>
                {!loaded ? (
                    <div className="flex flex-col gap-3">
                        {[1, 2].map((n) => <div key={n} className="h-20 animate-pulse rounded-2xl bg-muted" />)}
                    </div>
                ) : active.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-muted/50 px-6 py-12 text-center dark:bg-muted/30">
                        <p className="font-medium text-muted-foreground">{t("rush.noneAvailable")}</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {active.map((s) => {
                            const open = isRushOpen(s, now);
                            const scheduledMs = s.scheduledFor ? new Date(s.scheduledFor).getTime() - now : 0;
                            const windowClosed = s.creatorRole !== "student" && !open && scheduledMs <= 0;
                            const inProgress = Boolean(attempts[s.id] && !attempts[s.id].submittedAt);
                            return (
                                <div key={s.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-lg">
                                            {subjectEmoji(s.subjectId) ?? "⚡"}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate font-bold text-foreground">
                                                {s.title || subjectName(s.subjectId)}
                                            </div>
                                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <Clock className="h-3.5 w-3.5" /> {t("rush.questionsMeta")}
                                                {s.creatorRole !== "student" && (
                                                    <span className="ml-1 rounded-full bg-muted px-2 py-0.5 font-semibold">
                                                        {t("rush.scheduleBtn")}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    {windowClosed ? (
                                        <span className="shrink-0 text-xs font-semibold text-muted-foreground">{t("rush.windowClosed")}</span>
                                    ) : !open ? (
                                        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                                            <Lock className="h-3.5 w-3.5" />
                                            {t("rush.opensIn", { time: fmtCountdown(scheduledMs) })}
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => router.push(`/rush/${s.id}`)}
                                            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.97]"
                                        >
                                            {inProgress ? t("rush.continue") : t("rush.begin")}
                                            <ChevronRight className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Past attempts */}
            {past.length > 0 && (
                <section>
                    <h2 className="mb-4 text-[17px] font-bold text-foreground">{t("rush.past")}</h2>
                    <div className="flex flex-col gap-3">
                        {past.map((s) => {
                            const att = attempts[s.id];
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => router.push(`/rush/${s.id}`)}
                                    className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:bg-muted/40"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-lg">
                                            {subjectEmoji(s.subjectId) ?? "⚡"}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="truncate font-bold text-foreground">{s.title || subjectName(s.subjectId)}</div>
                                            <div className="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                                <CheckCircle2 className="h-3.5 w-3.5" /> {t("rush.completed")}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-3">
                                        <span className="rounded-lg border border-border bg-muted px-3 py-1.5 text-sm font-black text-foreground">
                                            {att?.grade ?? "—"}
                                        </span>
                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </section>
            )}
        </div>
    );
}
