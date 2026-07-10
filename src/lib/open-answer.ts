/**
 * Открытые ("open") вопросы: ученик вводит ответ текстом, а он сверяется с
 * набором принимаемых вариантов. Раньше принимался ровно один эталонный ответ
 * (Question.correctAnswer). Теперь их может быть несколько (acceptedAnswers[]).
 *
 * Обратная совместимость: у старых вопросов нет acceptedAnswers — тогда единый
 * correctAnswer трактуется как массив из одного элемента (миграция «на лету»).
 */

/** Минимальная форма вопроса, достаточная для сверки открытого ответа. */
export interface OpenAnswerLike {
    correctAnswer?: string;
    acceptedAnswers?: string[];
}

/** Нормализация для сравнения: обрезка, схлопывание пробелов, нижний регистр. */
export const normalizeAnswer = (s: string): string =>
    s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Все принимаемые ответы вопроса. Отдаёт acceptedAnswers, если они заданы;
 * иначе — единый correctAnswer как одноэлементный массив. Пустые строки
 * отфильтровываются.
 */
export const getAcceptedAnswers = (q: OpenAnswerLike): string[] => {
    const list =
        Array.isArray(q.acceptedAnswers) && q.acceptedAnswers.length
            ? q.acceptedAnswers
            : q.correctAnswer != null
              ? [q.correctAnswer]
              : [];
    return list.map((a) => a ?? "").filter((a) => a.trim() !== "");
};

/**
 * Верен ли введённый учеником ответ: совпадает ли (после нормализации) хотя бы
 * с одним из принимаемых вариантов. Используется во всех местах авто-проверки
 * открытых/текстовых ответов, чтобы поведение было единым.
 */
export const isOpenAnswerCorrect = (studentAnswer: string, q: OpenAnswerLike): boolean => {
    if (!studentAnswer || !studentAnswer.trim()) return false;
    const norm = normalizeAnswer(studentAnswer);
    return getAcceptedAnswers(q).some((a) => normalizeAnswer(a) === norm);
};
