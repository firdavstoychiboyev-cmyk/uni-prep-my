import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "./firebase";
import { Question } from "./firestore-schema";
import { fetchTopicById, fetchSubjectById, fetchTextbookById } from "./data-fetching";

/**
 * Одна ошибка ученика: вопрос, который он в последний раз прошёл неверно.
 * Источник — users/{uid}/userProgress/{topicId}.questionStatuses: карта
 * { questionId: { status, answer } }. status "incorrect" = ошибка. Карта
 * хранит только последнее состояние вопроса, поэтому вопрос, позже решённый
 * верно, из ошибок исчезает автоматически, а дубли по вопросу невозможны.
 */
export interface MistakeEntry {
    questionId: string;
    topicId: string;
    topicTitle: string;
    subjectName: string;
    subjectEmoji?: string;
    questionText: string;
    options?: { a?: string; b?: string; c?: string; d?: string };
    type?: string; // "mc" (по умолчанию) | "open" | "text"
    /** Ответ ученика: ключ варианта для mc, текст для open/text; "" если не записан */
    yourAnswer: string;
    correctAnswer: string;
    acceptedAnswers?: string[];
    explanation?: string;
    /** Дата последней попытки (ISO) — completedAt темы; "" если неизвестна */
    lastAttemptAt: string;
}

interface RawWrong {
    questionId: string;
    topicId: string;
    answer: string;
    at: string;
}

/**
 * Все вопросы, которые ученик в последний раз прошёл неверно — сначала самые
 * свежие, по одному на вопрос. Читает свою подколлекцию userProgress (доступно
 * владельцу по правилам), затем пакетно добирает документы вопросов, тем и
 * предметов. Вопросы, удалённые из базы, пропускаются.
 */
export const fetchStudentMistakes = async (userId: string): Promise<MistakeEntry[]> => {
    const snap = await getDocs(collection(db, "users", userId, "userProgress"));

    // Собираем неверные ответы, при дублях (тот же вопрос в другом заходе) —
    // оставляем самый свежий по completedAt
    const wrongByQid = new Map<string, RawWrong>();
    snap.forEach((d) => {
        const data = d.data() as {
            completedAt?: string;
            questionStatuses?: Record<string, { status?: string; answer?: string }>;
        };
        const at = data.completedAt ?? "";
        const statuses = data.questionStatuses ?? {};
        for (const [qid, st] of Object.entries(statuses)) {
            if (st?.status !== "incorrect") continue;
            const prev = wrongByQid.get(qid);
            if (!prev || at > prev.at) {
                wrongByQid.set(qid, { questionId: qid, topicId: d.id, answer: st.answer ?? "", at });
            }
        }
    });

    if (wrongByQid.size === 0) return [];

    // Пакетная загрузка вопросов ('in' принимает до 10 id за запрос)
    const qids = Array.from(wrongByQid.keys());
    const questionById = new Map<string, Question>();
    const chunks: string[][] = [];
    for (let i = 0; i < qids.length; i += 10) chunks.push(qids.slice(i, i + 10));
    const qSnaps = await Promise.all(
        chunks.map((chunk) => getDocs(query(collection(db, "questions"), where(documentId(), "in", chunk))))
    );
    qSnaps.forEach((s) => s.docs.forEach((d) => questionById.set(d.id, { id: d.id, ...d.data() } as Question)));

    // Тема + предмет для каждой темы (helpers кешируются)
    const topicIds = Array.from(new Set(Array.from(wrongByQid.values()).map((w) => w.topicId)));
    const topicMeta = new Map<string, { title: string; subjectName: string; subjectEmoji?: string }>();
    await Promise.all(
        topicIds.map(async (tid) => {
            const topic = await fetchTopicById(tid);
            let subjectId = topic?.subjectId;
            if (!subjectId && topic?.textbookId) {
                const tb = await fetchTextbookById(topic.textbookId);
                subjectId = tb?.subjectId;
            }
            let subjectName = "";
            let subjectEmoji: string | undefined;
            if (subjectId) {
                const subj = await fetchSubjectById(subjectId);
                subjectName = subj?.name ?? "";
                subjectEmoji = subj?.emoji;
            }
            topicMeta.set(tid, { title: topic?.title ?? "", subjectName, subjectEmoji });
        })
    );

    const entries: MistakeEntry[] = [];
    for (const w of Array.from(wrongByQid.values())) {
        const q = questionById.get(w.questionId);
        if (!q) continue; // вопрос удалён из базы
        const meta = topicMeta.get(w.topicId);
        entries.push({
            questionId: w.questionId,
            topicId: w.topicId,
            topicTitle: meta?.title ?? "",
            subjectName: meta?.subjectName ?? "",
            subjectEmoji: meta?.subjectEmoji,
            questionText: q.text,
            options: q.options,
            type: q.type,
            yourAnswer: w.answer,
            correctAnswer: q.correctAnswer,
            acceptedAnswers: q.acceptedAnswers,
            explanation: q.explanation,
            lastAttemptAt: w.at,
        });
    }

    // Свежие сверху
    entries.sort((a, b) => (b.lastAttemptAt || "").localeCompare(a.lastAttemptAt || ""));
    return entries;
};
