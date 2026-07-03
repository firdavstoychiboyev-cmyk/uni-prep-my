"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fetchStudentClasses } from "@/lib/profile-utils";
import { fetchTopicById } from "@/lib/data-fetching";
import {
    fetchClassHomework,
    fetchStudentHomeworkStatus,
    isHomeworkOverdue,
} from "@/lib/homework-utils";
import { HomeworkType } from "@/lib/firestore-schema";
import { BookOpen, ClipboardList, CalendarDays, Check, CircleAlert, NotebookPen } from "lucide-react";

interface HomeworkItemLink {
    id: string;
    title: string;
    done: boolean;
    href: string;
}

interface HomeworkItem {
    id: string;
    classId: string;
    className: string;
    type: HomeworkType;
    dueDate: string;
    done: boolean;
    links: HomeworkItemLink[]; // темы (type "topics") или один мок (type "mock")
}

/**
 * Блок «Домашние задания» на главной странице ученика.
 * Тип "topics" — выполнено, когда пройдены ВСЕ назначенные темы;
 * тип "mock" — когда завершён мок. Ничего не рендерит, если пользователь
 * не ученик или заданий нет.
 */
export default function HomeworkSection() {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const [items, setItems] = useState<HomeworkItem[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!user || user.role !== "student") return;
        let cancelled = false;
        (async () => {
            try {
                const classes = await fetchStudentClasses(user.id);
                const all: HomeworkItem[] = [];
                await Promise.all(
                    classes.map(async (cls) => {
                        const hws = await fetchClassHomework(cls.id);
                        await Promise.all(
                            hws.map(async (hw) => {
                                const status = await fetchStudentHomeworkStatus(user.id, hw);
                                let links: HomeworkItemLink[] = [];
                                if (hw.type === "mock" && hw.mockId) {
                                    const mockSnap = await getDoc(doc(db, "mocks", hw.mockId));
                                    links = [{
                                        id: hw.mockId,
                                        title: (mockSnap.data()?.title as string) || hw.mockId,
                                        done: status.mockDone,
                                        href: `/mocks/${hw.mockId}`,
                                    }];
                                } else if (hw.type === "topics") {
                                    links = await Promise.all(
                                        (hw.topicIds ?? []).map(async (tid) => {
                                            const topic = await fetchTopicById(tid);
                                            return {
                                                id: tid,
                                                title: topic?.title || tid,
                                                done: Boolean(status.topicsDone[tid]),
                                                href: `/test/${tid}`,
                                            };
                                        })
                                    );
                                }
                                if (links.length === 0) return;
                                all.push({
                                    id: hw.id,
                                    classId: cls.id,
                                    className: cls.name,
                                    type: hw.type,
                                    dueDate: hw.dueDate,
                                    done: status.done,
                                    links,
                                });
                            })
                        );
                    })
                );
                if (!cancelled) {
                    // Невыполненные сверху, внутри групп — по сроку
                    all.sort((a, b) => Number(a.done) - Number(b.done) || a.dueDate.localeCompare(b.dueDate));
                    setItems(all);
                }
            } catch (e) {
                console.error("Error loading homework:", e);
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    if (!user || user.role !== "student" || !loaded || items.length === 0) return null;

    return (
        <section>
            <div className="mb-4 flex items-center gap-2.5">
                <NotebookPen size={18} className="text-muted-foreground" />
                <h2 className="text-xl font-bold tracking-tight text-foreground">{t("hw.myTitle")}</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {items.map((hw) => {
                    const overdue = !hw.done && isHomeworkOverdue(hw.dueDate);
                    const doneCount = hw.links.filter((l) => l.done).length;
                    const TypeIcon = hw.type === "topics" ? BookOpen : ClipboardList;
                    return (
                        <div
                            key={`${hw.classId}-${hw.id}`}
                            className={`rounded-2xl border bg-card p-5 ${
                                overdue ? "border-red-300 dark:border-red-900" : "border-border"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                                            {hw.className}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                                            <TypeIcon size={10} />
                                            {hw.type === "topics"
                                                ? `${t("hw.typeTopics")} · ${doneCount}/${hw.links.length}`
                                                : t("hw.typeMock")}
                                        </span>
                                    </div>
                                    <div className={`mt-1 inline-flex items-center gap-1.5 text-xs font-medium ${overdue ? "text-red-500" : "text-muted-foreground"}`}>
                                        <CalendarDays size={13} />
                                        {t("hw.due", { date: hw.dueDate })}
                                    </div>
                                </div>
                                {hw.done ? (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                        <Check size={12} /> {t("hw.statusDone")}
                                    </span>
                                ) : overdue ? (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                                        <CircleAlert size={12} /> {t("hw.statusOverdue")}
                                    </span>
                                ) : (
                                    <span className="inline-flex shrink-0 items-center rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                                        {t("hw.statusPending")}
                                    </span>
                                )}
                            </div>

                            <div className={`mt-4 grid grid-cols-1 gap-2 ${hw.links.length > 1 ? "sm:grid-cols-2" : ""}`}>
                                {hw.links.map((link) => (
                                    <Link
                                        key={link.id}
                                        href={link.href}
                                        className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-colors ${
                                            link.done
                                                ? "border-emerald-200 bg-emerald-50/60 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-400"
                                                : "border-border bg-background text-foreground hover:bg-muted"
                                        }`}
                                    >
                                        <TypeIcon size={15} className="shrink-0" />
                                        <span className="min-w-0 flex-1 truncate">{link.title}</span>
                                        {link.done && <Check size={14} className="shrink-0" />}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
