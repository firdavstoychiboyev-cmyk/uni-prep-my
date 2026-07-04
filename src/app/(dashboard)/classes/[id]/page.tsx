"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Class, User, Homework, HomeworkType, Topic, Subject, Textbook } from "@/lib/firestore-schema";
import { SUBJECTS } from "@/lib/constants";
import { findStudentById, addStudentToClass, deleteStudentFromClass, deleteClass, fetchClassStudents } from "@/lib/class-utils";
import { fetchClassHomework, assignHomework, deleteHomework, fetchHomeworkProgress, fetchActiveMocks, isHomeworkOverdue, MockOption, HomeworkProgress } from "@/lib/homework-utils";
import { fetchSubjects, fetchTopicById, fetchTopicsBySubject, fetchTextbooksBySubject, fetchTopicsByTextbook } from "@/lib/data-fetching";
import { useAuthStore } from "@/store/useAuthStore";
import { Search, UserPlus, Trash2, ChevronRight, X, Eye, BookOpen, ClipboardList, CalendarDays } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/useTranslation";
import HomeworkProgressView from "@/components/homework-progress";
import ClassLeaderboard from "@/components/class-leaderboard";
import SubjectFailures from "@/components/subject-failures";
import RushScheduler from "@/components/rush-scheduler";

export default function ClassDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { t, language } = useTranslation();
    const [cls, setCls] = useState<Class | null>(null);
    const [students, setStudents] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResult, setSearchResult] = useState<User | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuthStore();

    // ── Homework state ──
    const [homeworks, setHomeworks] = useState<Homework[]>([]);
    const [hwProgress, setHwProgress] = useState<Record<string, HomeworkProgress>>({});
    const [hwTopicNames, setHwTopicNames] = useState<Record<string, string>>({});
    const [hwAllMocks, setHwAllMocks] = useState<MockOption[]>([]);
    // Форма: тип ДЗ ("topics" | "mock"), затем каскад предмет → (учебник) → темы, либо предмет → мок
    const [hwType, setHwType] = useState<HomeworkType>("topics");
    const [hwSubjects, setHwSubjects] = useState<Subject[]>([]);
    const [hwSubjectId, setHwSubjectId] = useState("");
    const [hwTextbooks, setHwTextbooks] = useState<Textbook[]>([]);
    const [hwTextbookId, setHwTextbookId] = useState("");
    const [hwDirectTopics, setHwDirectTopics] = useState<Topic[]>([]);
    const [hwTopics, setHwTopics] = useState<Topic[]>([]);
    const [hwSelectedTopics, setHwSelectedTopics] = useState<string[]>([]);
    const [hwMockId, setHwMockId] = useState("");
    const [hwDueDate, setHwDueDate] = useState("");
    const [hwBusy, setHwBusy] = useState(false);
    const [hwError, setHwError] = useState<string | null>(null);
    const [hwExpanded, setHwExpanded] = useState<Record<string, boolean>>({});
    // Ref-защита от двойного сабмита: state hwBusy в быстрых повторных
    // кликах читается из устаревшего замыкания и пропускает второй вызов
    const hwBusyRef = useRef(false);

    // Специальное значение селекта учебников: темы предмета вне учебников
    const NO_TEXTBOOK = "__no_textbook__";

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const classRef = doc(db, "classes", id as string);
                const classSnap = await getDoc(classRef);
                if (classSnap.exists()) {
                    const classData = { id: classSnap.id, ...classSnap.data() } as Class;
                    setCls(classData);
                    const studentData = await fetchClassStudents(classData.students);
                    setStudents(studentData);
                }
            } catch (err) {
                console.error(err);
                setError(t("cd.loadError"));
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Домашние задания: список, предметы для каскада, моки, счётчики выполнения.
    // Зависит от cls: при изменении состава класса счётчики пересчитываются.
    useEffect(() => {
        if (!cls) return;
        let cancelled = false;
        (async () => {
            try {
                const [mocks, hws] = await Promise.all([
                    fetchActiveMocks(),
                    fetchClassHomework(cls.id),
                ]);
                if (cancelled) return;
                setHwAllMocks(mocks);
                setHomeworks(hws);

                // Названия тем для списка ДЗ (темы могут быть из любого предмета/учебника)
                const allTopicIds = Array.from(new Set(hws.flatMap((hw) => hw.topicIds ?? [])));
                const names: Record<string, string> = {};
                await Promise.all(
                    allTopicIds.map(async (tid) => {
                        const topic = await fetchTopicById(tid);
                        if (topic) names[tid] = topic.title;
                    })
                );
                if (!cancelled) setHwTopicNames(names);
            } catch (err) {
                console.error("Error loading homework:", err);
            }
        })();
        return () => { cancelled = true; };
    }, [cls]);

    // Прогресс выполнения ДЗ: считается по загруженным профилям класса (нужны
    // имена для списка невыполнивших), поэтому пересчитывается при изменении
    // списка заданий или состава класса.
    useEffect(() => {
        if (homeworks.length === 0 || students.length === 0) {
            setHwProgress({});
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const entries = await Promise.all(
                    homeworks.map(async (hw) =>
                        [hw.id, await fetchHomeworkProgress(students, hw)] as const
                    )
                );
                if (!cancelled) setHwProgress(Object.fromEntries(entries));
            } catch (err) {
                console.error("Error computing homework progress:", err);
            }
        })();
        return () => { cancelled = true; };
    }, [homeworks, students]);

    // Предметы для формы — на текущем языке интерфейса (в subjects раздельные
    // документы для ru и uz). Смена языка перезагружает список и сбрасывает
    // каскад: выбранный предмет принадлежит списку другого языка.
    useEffect(() => {
        let cancelled = false;
        fetchSubjects()
            .then((subjects) => { if (!cancelled) setHwSubjects(subjects); })
            .catch((err) => console.error("Error loading subjects:", err));
        setHwSubjectId("");
        setHwTextbookId("");
        setHwTextbooks([]);
        setHwDirectTopics([]);
        setHwTopics([]);
        setHwSelectedTopics([]);
        setHwMockId("");
        return () => { cancelled = true; };
    }, [language]);

    // Переключение типа ДЗ сбрасывает форму целиком
    const handleTypeChange = (type: HomeworkType) => {
        setHwType(type);
        setHwSubjectId("");
        setHwTextbookId("");
        setHwTextbooks([]);
        setHwDirectTopics([]);
        setHwTopics([]);
        setHwSelectedTopics([]);
        setHwMockId("");
        setHwError(null);
    };

    // Выбор предмета — сбрасывает всё ниже; для типа "topics" грузит учебники и темы
    const handleSubjectChange = async (subjectId: string) => {
        setHwSubjectId(subjectId);
        setHwTextbookId("");
        setHwSelectedTopics([]);
        setHwMockId("");
        setHwTextbooks([]);
        setHwDirectTopics([]);
        setHwTopics([]);
        if (!subjectId || hwType === "mock") return;
        try {
            const [textbooks, subjectTopics] = await Promise.all([
                fetchTextbooksBySubject(subjectId),
                fetchTopicsBySubject(subjectId),
            ]);
            // Прямые темы — не привязанные ни к какому учебнику
            const directOnly = subjectTopics.filter((tp) => !tp.textbookId);
            setHwTextbooks(textbooks);
            setHwDirectTopics(directOnly);
            // Без учебников темы выбираются сразу; с учебниками — после выбора учебника
            if (textbooks.length === 0) setHwTopics(subjectTopics);
        } catch (err) {
            console.error("Error loading subject topics/textbooks:", err);
        }
    };

    // Выбор учебника (или тем вне учебников) для типа "topics"
    const handleTextbookChange = async (textbookId: string) => {
        setHwTextbookId(textbookId);
        setHwSelectedTopics([]);
        setHwTopics([]);
        if (!textbookId) return;
        if (textbookId === NO_TEXTBOOK) {
            setHwTopics(hwDirectTopics);
            return;
        }
        try {
            setHwTopics(await fetchTopicsByTextbook(textbookId));
        } catch (err) {
            console.error("Error loading textbook topics:", err);
        }
    };

    const toggleHwTopic = (topicId: string) => {
        setHwSelectedTopics((prev) =>
            prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
        );
    };

    // Моки выбранного предмета; моки без привязки к предмету видны всегда
    const hwFilteredMocks = hwAllMocks.filter((m) => !m.subject || m.subject === hwSubjectId);
    const hwTextbookStepDone = hwTextbooks.length === 0 || hwTextbookId !== "";
    const hwFormReady =
        hwSubjectId !== "" && hwDueDate !== "" &&
        (hwType === "topics"
            ? hwTextbookStepDone && hwSelectedTopics.length > 0
            : hwMockId !== "");

    const handleAssignHomework = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cls || !user || !hwFormReady || hwBusyRef.current) return;
        hwBusyRef.current = true;
        setHwBusy(true);
        setHwError(null);
        try {
            const payload = {
                type: hwType,
                subjectId: hwSubjectId,
                ...(hwType === "topics"
                    ? {
                          topicIds: hwSelectedTopics,
                          ...(hwTextbookId && hwTextbookId !== NO_TEXTBOOK ? { textbookId: hwTextbookId } : {}),
                      }
                    : { mockId: hwMockId }),
                dueDate: hwDueDate,
                createdBy: user.id,
            };
            const hwId = await assignHomework(cls.id, payload);
            const newHw: Homework = { id: hwId, createdAt: new Date().toISOString(), ...payload };
            setHomeworks((prev) => [newHw, ...prev]);
            if (hwType === "topics") {
                setHwTopicNames((prev) => {
                    const next = { ...prev };
                    hwSelectedTopics.forEach((tid) => {
                        const topic = hwTopics.find((tp) => tp.id === tid);
                        if (topic) next[tid] = topic.title;
                    });
                    return next;
                });
            }
            setHwSelectedTopics([]);
            setHwMockId("");
            setHwDueDate("");
        } catch (err) {
            console.error("Error assigning homework:", err);
            setHwError(t("hw.assignError"));
        } finally {
            hwBusyRef.current = false;
            setHwBusy(false);
        }
    };

    const handleDeleteHomework = async (hwId: string) => {
        if (!cls || !confirm(t("hw.deleteConfirm"))) return;
        try {
            await deleteHomework(cls.id, hwId);
            setHomeworks((prev) => prev.filter((h) => h.id !== hwId));
        } catch {
            alert(t("hw.deleteError"));
        }
    };

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery) return;
        setIsSearching(true);
        setSearchResult(null);
        setError(null);
        try {
            const student = await findStudentById(searchQuery);
            if (student) {
                setSearchResult(student);
            } else {
                setError(t("cd.studentNotFound"));
            }
        } catch {
            setError(t("cd.searchError"));
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddStudent = async () => {
        if (!searchResult || !cls) return;
        if (cls.students.includes(searchResult.id)) {
            setError(t("cd.alreadyAdded"));
            return;
        }
        try {
            await addStudentToClass(cls.id, searchResult.id);
            setStudents((prev) => [...prev, searchResult]);
            setCls((prev) => prev ? { ...prev, students: [...prev.students, searchResult.id] } : null);
            setSearchResult(null);
            setSearchQuery("");
        } catch {
            setError(t("cd.addError"));
        }
    };

    const handleDeleteStudent = async (studentId: string) => {
        if (!cls || !confirm(t("cd.removeConfirm"))) return;
        try {
            await deleteStudentFromClass(cls.id, studentId);
            setStudents((prev) => prev.filter(s => s.id !== studentId));
            setCls((prev) => prev ? { ...prev, students: prev.students.filter(id => id !== studentId) } : null);
        } catch {
            alert(t("cd.removeError"));
        }
    };

    const handleDeleteClass = async () => {
        if (!cls || !confirm(t("cd.deleteConfirm"))) return;
        try {
            await deleteClass(cls.id);
            router.push("/classes");
        } catch {
            alert(t("cd.deleteError"));
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-10 w-72 animate-pulse rounded-2xl bg-muted" />
            </div>
        );
    }

    if (!cls) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="max-w-sm rounded-2xl border border-border bg-card px-8 py-10 text-center">
                    <h2 className="mb-2 text-xl font-semibold text-foreground">{t("cd.notFound")}</h2>
                    <p className="text-sm text-muted-foreground">{t("cd.checkLink")}</p>
                    <Link
                        href="/classes"
                        className="mt-5 inline-flex items-center justify-center rounded-2xl bg-foreground px-6 py-3 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.97]"
                    >
                        {t("cd.toClasses")}
                    </Link>
                </div>
            </div>
        );
    }

    const subject = SUBJECTS.find((s) => s.id === cls.subjectId);

    return (
        <div className="flex flex-col gap-10 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
                <Link href="/classes" className="transition-colors hover:text-foreground">
                    {t("cd.classesShort")}
                </Link>
                <ChevronRight size={14} className="text-muted-foreground/70" />
                <span className="text-foreground">{cls.name}</span>
            </nav>

            {/* Header */}
            <section>
                <div className="flex items-center gap-4 mb-3">
                    <span className="text-5xl">{subject?.emoji || "📚"}</span>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                            {cls.name}
                        </h1>
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-sm">
                            {subject?.name || t("classes.noSubject")} • {t("classes.studentsCount", { count: students.length })}
                        </span>
                    </div>
                </div>
            </section>

            {/* Add Student */}
            <section className="rounded-2xl border border-border bg-muted/50 p-7 dark:bg-muted/30">
                <div className="mb-5 flex items-center justify-between gap-4">
                    <h2 className="text-lg font-bold tracking-tight text-foreground">{t("cd.addStudent")}</h2>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                        {t("cd.byShortId")}
                    </span>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t("cd.searchPlaceholder")}
                            className="w-full rounded-xl border border-border bg-background py-3 pl-12 pr-4 text-foreground placeholder:text-muted-foreground transition-colors focus:border-border focus:outline-none focus:ring-2 focus:ring-ring/25"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isSearching}
                        className="inline-flex items-center justify-center rounded-xl bg-foreground px-7 py-3 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                    >
                        {isSearching ? t("cd.searching") : t("cd.find")}
                    </button>
                </form>

                {error && (
                    <div className="mt-3 animate-in fade-in slide-in-from-top-1 text-sm font-medium text-destructive">
                        {error}
                    </div>
                )}

                {searchResult && (
                    <div className="mt-5 flex animate-in fade-in zoom-in flex-col items-start justify-between gap-4 rounded-xl border border-border bg-card p-5 duration-200 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted font-bold text-foreground">
                                {searchResult.name?.[0] || "?"}
                            </div>
                            <div className="flex flex-col">
                                <p className="font-semibold text-foreground">
                                    {searchResult.name} {searchResult.surname || ""}
                                </p>
                                <p className="text-sm text-muted-foreground">{searchResult.email}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleAddStudent}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.97] dark:bg-emerald-700 dark:hover:bg-emerald-600"
                        >
                            <UserPlus size={16} />
                            <span>{t("common.add")}</span>
                        </button>
                    </div>
                )}
            </section>

            {/* Students */}
            <section>
                <div className="flex items-center justify-between gap-4 mb-5">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">{t("cd.students")}</h2>
                    <span className="rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {t("classes.studentsCount", { count: students.length })}
                    </span>
                </div>

                {students.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                        {students.map((student) => (
                            <div
                                key={student.id}
                                className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:bg-muted/40 sm:flex-row sm:items-center"
                            >
                                <div className="flex items-center gap-4 min-w-0">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted font-bold text-foreground shadow-sm">
                                        {student.name?.[0] || "?"}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold text-foreground">
                                            {student.name} {student.surname || ""}
                                        </p>
                                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{student.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-2">
                                    <Link
                                        href={`/student/${student.id}`}
                                        className="inline-flex items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm transition-all hover:bg-muted hover:text-foreground"
                                        title={t("cd.viewProfile")}
                                    >
                                        <Eye size={16} className="mr-2" />
                                        {t("settings.profile")}
                                    </Link>
                                    <button
                                        onClick={() => handleDeleteStudent(student.id)}
                                        className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 transition-all hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                                        title={t("cd.removeFromClass")}
                                    >
                                        <X size={16} className="mr-2" />
                                        {t("common.delete")}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border bg-muted/50 px-6 py-16 text-center dark:bg-muted/30">
                        <p className="font-medium text-muted-foreground">{t("cd.noStudents")}</p>
                    </div>
                )}
            </section>

            {/* Leaderboard */}
            <ClassLeaderboard students={students} />

            {/* Class analytics: most failing subjects */}
            {cls.students.length > 0 && <SubjectFailures studentIds={cls.students} />}

            {/* Schedule a Rush exam for this group */}
            {user && <RushScheduler classId={cls.id} user={user} />}

            {/* Homework */}
            <section>
                <div className="flex items-center justify-between gap-4 mb-5">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">{t("hw.title")}</h2>
                    <span className="rounded-xl border border-border bg-muted px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        {homeworks.length}
                    </span>
                </div>

                {/* Assign form */}
                <form onSubmit={handleAssignHomework} className="mb-5 rounded-2xl border border-border bg-muted/50 p-6 dark:bg-muted/30">
                    <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-muted-foreground">{t("hw.assign")}</h3>

                    {/* Тип ДЗ: набор тем или мок-тест */}
                    <div className="mb-4 grid max-w-sm grid-cols-2 gap-1 rounded-2xl border border-border bg-muted p-1">
                        {(["topics", "mock"] as HomeworkType[]).map((tp) => (
                            <button
                                key={tp}
                                type="button"
                                onClick={() => handleTypeChange(tp)}
                                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-semibold transition-colors ${
                                    hwType === tp
                                        ? "bg-card text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                }`}
                            >
                                {tp === "topics" ? <BookOpen size={14} /> : <ClipboardList size={14} />}
                                {tp === "topics" ? t("hw.typeTopics") : t("hw.typeMock")}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <select
                            value={hwSubjectId}
                            onChange={(e) => void handleSubjectChange(e.target.value)}
                            required
                            className="h-12 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25"
                        >
                            <option value="">{t("hw.selectSubject")}</option>
                            {hwSubjects.map((s) => (
                                <option key={s.id} value={s.id}>{s.emoji ? `${s.emoji} ` : ""}{s.name}</option>
                            ))}
                        </select>

                        {hwType === "topics" && hwTextbooks.length > 0 && (
                            <select
                                value={hwTextbookId}
                                onChange={(e) => void handleTextbookChange(e.target.value)}
                                required
                                className="h-12 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25"
                            >
                                <option value="">{t("hw.selectTextbook")}</option>
                                {hwTextbooks.map((tb) => (
                                    <option key={tb.id} value={tb.id}>{tb.title}</option>
                                ))}
                                {hwDirectTopics.length > 0 && (
                                    <option value={NO_TEXTBOOK}>{t("hw.noTextbook")}</option>
                                )}
                            </select>
                        )}

                        {hwType === "mock" && (
                            <select
                                value={hwMockId}
                                onChange={(e) => setHwMockId(e.target.value)}
                                required
                                disabled={!hwSubjectId}
                                className="h-12 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-50"
                            >
                                <option value="">{t("hw.selectMock")}</option>
                                {hwFilteredMocks.map((m) => (
                                    <option key={m.id} value={m.id}>{m.title}</option>
                                ))}
                            </select>
                        )}

                        <input
                            type="date"
                            value={hwDueDate}
                            onChange={(e) => setHwDueDate(e.target.value)}
                            min={new Date().toISOString().slice(0, 10)}
                            required
                            className="h-12 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25"
                        />
                    </div>

                    {/* Список тем с чекбоксами (тип "topics") */}
                    {hwType === "topics" && hwSubjectId && hwTextbookStepDone && (
                        hwTopics.length > 0 ? (
                            <div className="mt-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                                        {t("hw.selectTopics")}
                                    </span>
                                    <span className="text-xs font-bold text-muted-foreground">
                                        {t("hw.selectedCount", { count: hwSelectedTopics.length })}
                                    </span>
                                </div>
                                <div className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto rounded-xl border border-border bg-background p-2 sm:grid-cols-2">
                                    {hwTopics.map((tp) => {
                                        const checked = hwSelectedTopics.includes(tp.id);
                                        return (
                                            <label
                                                key={tp.id}
                                                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                                                    checked ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted/60"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => toggleHwTopic(tp.id)}
                                                    className="h-4 w-4 shrink-0 accent-foreground"
                                                />
                                                <span className="min-w-0 truncate">{tp.title}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <p className="mt-3 text-sm text-muted-foreground">{t("hw.noTopics")}</p>
                        )
                    )}

                    <button
                        type="submit"
                        disabled={hwBusy || !hwFormReady}
                        className="mt-4 inline-flex h-12 items-center justify-center rounded-xl bg-foreground px-7 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                    >
                        {hwBusy ? t("hw.assigning") : t("hw.assignBtn")}
                    </button>
                    {hwError && (
                        <div className="mt-3 text-sm font-medium text-destructive">{hwError}</div>
                    )}
                </form>

                {/* Homework list */}
                {homeworks.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                        {homeworks.map((hw) => {
                            const isTopics = hw.type === "topics";
                            const topicIds = hw.topicIds ?? [];
                            const mock = hwAllMocks.find((m) => m.id === hw.mockId);
                            const subjectName = hwSubjects.find((s) => s.id === hw.subjectId)?.name;
                            const overdue = isHomeworkOverdue(hw.dueDate);
                            const expanded = Boolean(hwExpanded[hw.id]);
                            return (
                                <div
                                    key={hw.id}
                                    className="rounded-2xl border border-border bg-card p-5"
                                >
                                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                    isTopics
                                                        ? "bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400"
                                                        : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
                                                }`}>
                                                    {isTopics ? <BookOpen size={11} /> : <ClipboardList size={11} />}
                                                    {isTopics ? t("hw.typeTopics") : t("hw.typeMock")}
                                                </span>
                                                {subjectName && (
                                                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{subjectName}</span>
                                                )}
                                            </div>
                                            <div className="mt-1.5 font-semibold text-foreground">
                                                {isTopics ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => setHwExpanded((prev) => ({ ...prev, [hw.id]: !expanded }))}
                                                        className="inline-flex items-center gap-1.5 hover:text-muted-foreground transition-colors"
                                                    >
                                                        {t("hw.topicsCount", { count: topicIds.length })}
                                                        <ChevronRight size={15} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
                                                    </button>
                                                ) : (
                                                    <span className="truncate">{mock?.title || hw.mockId}</span>
                                                )}
                                            </div>
                                            <div className={`mt-1 inline-flex items-center gap-1.5 text-xs font-medium ${overdue ? "text-red-500" : "text-muted-foreground"}`}>
                                                <CalendarDays size={13} />
                                                {t("hw.due", { date: hw.dueDate })}
                                            </div>
                                        </div>
                                        <div className="flex items-start justify-between gap-3 sm:justify-end">
                                            <HomeworkProgressView progress={hwProgress[hw.id]} />
                                            <button
                                                onClick={() => handleDeleteHomework(hw.id)}
                                                className="inline-flex shrink-0 items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 transition-all hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                                                title={t("common.delete")}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                    {isTopics && expanded && (
                                        <ul className="mt-3 space-y-1 border-t border-border pt-3">
                                            {topicIds.map((tid) => (
                                                <li key={tid} className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span className="h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                                                    {hwTopicNames[tid] || tid}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border bg-muted/50 px-6 py-12 text-center dark:bg-muted/30">
                        <p className="font-medium text-muted-foreground">{t("hw.none")}</p>
                    </div>
                )}
            </section>

            {/* Danger Zone */}
            <section className="flex justify-center pt-2">
                <button
                    onClick={handleDeleteClass}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-3 text-sm font-semibold text-red-600 transition-all hover:bg-red-100 active:scale-[0.97] dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
                >
                    <Trash2 size={16} />
                    {t("cd.deleteClass")}
                </button>
            </section>
        </div>
    );
}
