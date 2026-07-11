import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { fetchTopicById, fetchTextbookById, fetchSubjectById } from "./data-fetching";

/**
 * Ошибки по темам — сколько вопросов ученик (или весь класс) прошёл неверно
 * в разрезе темы (mavzu). Считается из users/{uid}/userProgress: у каждой темы
 * уже есть агрегаты solvedQuestions (верно) и errors (неверно), документ уже
 * лежит по ключу topicId — отдельная коллекция попыток не нужна.
 */
export interface TopicFailure {
    topicId: string;
    topicTitle: string;
    subjectId: string;
    subjectName: string;
    subjectEmoji?: string;
    /** Язык документа предмета — для иконки/цвета темы */
    subjectLanguage?: string;
    wrong: number;       // всего неверных ответов по теме
    total: number;       // всего попыток (верно + неверно)
    wrongPct: number;    // процент неверных, целое 0–100
}

/** Тема → id предмета (через topic.subjectId либо учебник). */
const resolveTopicSubject = async (topicId: string): Promise<string | undefined> => {
    const topic = await fetchTopicById(topicId);
    if (topic?.subjectId) return topic.subjectId;
    if (topic?.textbookId) {
        const tb = await fetchTextbookById(topic.textbookId);
        return tb?.subjectId;
    }
    return undefined;
};

/** Сырые счётчики { topicId: { wrong, total } } для одного ученика. */
const rawFailuresByUser = async (userId: string): Promise<Map<string, { wrong: number; total: number }>> => {
    const snap = await getDocs(collection(db, "users", userId, "userProgress"));

    const byTopic = new Map<string, { wrong: number; total: number }>();
    snap.forEach((d) => {
        const data = d.data() as { solvedQuestions?: number; errors?: number };
        const wrong = data.errors ?? 0;
        const solved = data.solvedQuestions ?? 0;
        if (wrong + solved === 0) return; // тема без попыток
        byTopic.set(d.id, { wrong, total: wrong + solved });
    });
    return byTopic;
};

/** Общий финал: подтягиваем тему/предмет, считаем %, оставляем только с ошибками, худшие сверху. */
const decorate = async (byTopic: Map<string, { wrong: number; total: number }>): Promise<TopicFailure[]> => {
    const entries = await Promise.all(
        Array.from(byTopic.entries()).map(async ([topicId, { wrong, total }]) => {
            const topic = await fetchTopicById(topicId);
            const subjectId = await resolveTopicSubject(topicId);
            const subj = subjectId ? await fetchSubjectById(subjectId) : null;
            return {
                topicId,
                topicTitle: topic?.title ?? topicId,
                subjectId: subjectId ?? "",
                subjectName: subj?.name ?? "",
                subjectEmoji: subj?.emoji,
                subjectLanguage: subj?.language,
                wrong,
                total,
                wrongPct: total > 0 ? Math.round((wrong / total) * 100) : 0,
            } as TopicFailure;
        })
    );
    // Худшая тема — с наибольшим числом ошибок; ничьи по проценту, затем по названию
    return entries
        .filter((e) => e.wrong > 0)
        .sort(
            (a, b) =>
                b.wrong - a.wrong ||
                b.wrongPct - a.wrongPct ||
                a.topicTitle.localeCompare(b.topicTitle)
        );
};

/** Ошибки по темам для одного ученика (личная статистика). */
export const fetchTopicFailures = async (userId: string): Promise<TopicFailure[]> =>
    decorate(await rawFailuresByUser(userId));

/**
 * Ошибки по темам для всего класса (учительская аналитика): суммируем
 * сырые счётчики всех учеников по теме, затем считаем проценты. Требует прав
 * учителя на чтение userProgress учеников (по правилам Firestore).
 */
export const fetchClassTopicFailures = async (studentIds: string[]): Promise<TopicFailure[]> => {
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
