import { User } from "./firestore-schema";

/**
 * Строка рейтинга класса. Метрика — totalCorrect (всего верных ответов по всем
 * темам), денормализованная на документ пользователя при завершении теста.
 * Берём её именно с документа пользователя, а не из подколлекции userProgress:
 * последняя по правилам Firestore доступна только владельцу и учителю, поэтому
 * ученик не смог бы посчитать рейтинг одноклассников. Ничьи разбиваются по
 * точности, затем по имени.
 */
export interface LeaderboardEntry {
    user: User;
    totalCorrect: number;
    accuracy: number;
    /** Место в рейтинге, 1-based; при равенстве метрик место общее */
    rank: number;
    /** Есть ли у ученика хоть какая-то активность (иначе — в самый низ) */
    hasActivity: boolean;
}

/**
 * Рейтинг учеников класса по числу верно решённых заданий (по убыванию),
 * при равенстве — по точности, затем по имени. Ученики без активности
 * (totalCorrect === 0 или поле ещё не заполнено) естественно оказываются
 * внизу и делят общее последнее место, не ломая нумерацию сверху. Считается
 * из уже загруженных документов учеников — без дополнительных чтений.
 */
export const buildClassLeaderboard = (students: User[]): LeaderboardEntry[] => {
    const stats = students.map((user) => ({
        user,
        totalCorrect: user.totalCorrect ?? 0,
        accuracy: user.accuracy ?? 0,
    }));

    stats.sort(
        (a, b) =>
            b.totalCorrect - a.totalCorrect ||
            b.accuracy - a.accuracy ||
            (a.user.name || "").localeCompare(b.user.name || "")
    );

    // Competition ranking (1, 2, 2, 4): равные по метрике делят место
    let rank = 0;
    let prevKey: string | null = null;
    return stats.map((entry, i) => {
        const key = `${entry.totalCorrect}:${entry.accuracy}`;
        if (key !== prevKey) {
            rank = i + 1;
            prevKey = key;
        }
        return { ...entry, rank, hasActivity: entry.totalCorrect > 0 };
    });
};
