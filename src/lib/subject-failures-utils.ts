import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { fetchTopicById, fetchTextbookById, fetchSubjectById } from "./data-fetching";

/**
 * Ошибки по предмету — сколько вопросов ученик (или весь класс) прошёл неверно
 * в разрезе предмета. Считается из users/{uid}/userProgress: у каждой темы уже
 * есть агрегаты solvedQuestions (верно) и errors (неверно), а предмет темы
 * берётся из topic.subjectId (или через учебник). Отдельная коллекция попыток
 * не нужна.
 */
export interface SubjectFailure {
    subjectId: string;
    subjectName: string;
    subjectEmoji?: string;
    /** Язык документа предмета — чтобы при слиянии дублей выбрать имя под UI-язык */
    subjectLanguage?: string;
    wrong: number;       // всего неверных ответов по предмету
    total: number;       // всего попыток (верно + неверно)
    wrongPct: number;    // процент неверных, целое 0–100
}

/** Тема → id предмета (через topic.subjectId либо учебник). Хелперы кешируются. */
const resolveTopicSubject = async (topicId: string): Promise<string | undefined> => {
    const topic = await fetchTopicById(topicId);
    if (topic?.subjectId) return topic.subjectId;
    if (topic?.textbookId) {
        const tb = await fetchTextbookById(topic.textbookId);
        return tb?.subjectId;
    }
    return undefined;
};

/** Сырые счётчики { subjectId: { wrong, total } } для одного ученика. */
const rawFailuresByUser = async (userId: string): Promise<Map<string, { wrong: number; total: number }>> => {
    const snap = await getDocs(collection(db, "users", userId, "userProgress"));

    const topics: { topicId: string; wrong: number; total: number }[] = [];
    snap.forEach((d) => {
        const data = d.data() as { solvedQuestions?: number; errors?: number };
        const wrong = data.errors ?? 0;
        const solved = data.solvedQuestions ?? 0;
        if (wrong + solved === 0) return; // тема без попыток
        topics.push({ topicId: d.id, wrong, total: wrong + solved });
    });

    // Резолвим предметы параллельно, затем агрегируем синхронно (без гонок за карту)
    const subjectIds = await Promise.all(topics.map((t) => resolveTopicSubject(t.topicId)));
    const bySubject = new Map<string, { wrong: number; total: number }>();
    topics.forEach((t, i) => {
        const sid = subjectIds[i];
        if (!sid) return;
        const cur = bySubject.get(sid) ?? { wrong: 0, total: 0 };
        cur.wrong += t.wrong;
        cur.total += t.total;
        bySubject.set(sid, cur);
    });
    return bySubject;
};

/** Общий финал: подтягиваем имена предметов, считаем %, оставляем только с ошибками, худшие сверху. */
const decorate = async (bySubject: Map<string, { wrong: number; total: number }>): Promise<SubjectFailure[]> => {
    const entries = await Promise.all(
        Array.from(bySubject.entries()).map(async ([subjectId, { wrong, total }]) => {
            const subj = await fetchSubjectById(subjectId);
            return {
                subjectId,
                subjectName: subj?.name ?? subjectId,
                subjectEmoji: subj?.emoji,
                subjectLanguage: subj?.language,
                wrong,
                total,
                wrongPct: total > 0 ? Math.round((wrong / total) * 100) : 0,
            } as SubjectFailure;
        })
    );
    // Худший предмет — с наибольшим числом ошибок; ничьи по проценту, затем по имени
    return entries
        .filter((e) => e.wrong > 0)
        .sort(
            (a, b) =>
                b.wrong - a.wrong ||
                b.wrongPct - a.wrongPct ||
                a.subjectName.localeCompare(b.subjectName)
        );
};

/** Ошибки по предметам для одного ученика (личная статистика). */
export const fetchSubjectFailures = async (userId: string): Promise<SubjectFailure[]> =>
    decorate(await rawFailuresByUser(userId));

/**
 * Ошибки по предметам для всего класса (учительская аналитика): суммируем
 * сырые счётчики всех учеников, затем считаем проценты. Требует прав учителя на
 * чтение userProgress учеников (по правилам Firestore).
 */
export const fetchClassSubjectFailures = async (studentIds: string[]): Promise<SubjectFailure[]> => {
    if (studentIds.length === 0) return [];
    const perStudent = await Promise.all(studentIds.map((id) => rawFailuresByUser(id)));
    const merged = new Map<string, { wrong: number; total: number }>();
    perStudent.forEach((m) =>
        m.forEach((v, k) => {
            const cur = merged.get(k) ?? { wrong: 0, total: 0 };
            cur.wrong += v.wrong;
            cur.total += v.total;
            merged.set(k, cur);
        })
    );
    return decorate(merged);
};
