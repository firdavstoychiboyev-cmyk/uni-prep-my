import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    orderBy
} from "firebase/firestore";
import { db } from "./firebase";
import { Homework } from "./firestore-schema";

/**
 * Уй вазифаси (домашние задания класса): classes/{classId}/homework/{id}.
 * Выполнение НЕ хранится отдельно — выводится из существующих записей
 * ученика: userProgress/{topicId}.completedAt (тема) и mockResults/{mockId} (мок).
 */

export const fetchClassHomework = async (classId: string): Promise<Homework[]> => {
    const snap = await getDocs(
        query(collection(db, "classes", classId, "homework"), orderBy("createdAt", "desc"))
    );
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Homework);
};

export const assignHomework = async (
    classId: string,
    data: { topicId: string; mockId: string; dueDate: string; createdBy: string }
) => {
    const ref = await addDoc(collection(db, "classes", classId, "homework"), {
        ...data,
        createdAt: new Date().toISOString()
    });
    return ref.id;
};

export const deleteHomework = (classId: string, homeworkId: string) =>
    deleteDoc(doc(db, "classes", classId, "homework", homeworkId));

export interface HomeworkStatus {
    topicDone: boolean;
    mockDone: boolean;
    done: boolean;
}

/** Статус одного ученика по одному ДЗ (тема пройдена И мок завершён) */
export const fetchStudentHomeworkStatus = async (
    studentId: string,
    topicId: string,
    mockId: string
): Promise<HomeworkStatus> => {
    const [progSnap, mockSnap] = await Promise.all([
        getDoc(doc(db, "users", studentId, "userProgress", topicId)),
        getDoc(doc(db, "users", studentId, "mockResults", mockId))
    ]);
    const topicDone = progSnap.exists() && Boolean(progSnap.data()?.completedAt);
    const mockDone = mockSnap.exists();
    return { topicDone, mockDone, done: topicDone && mockDone };
};

/** Сколько учеников класса выполнили ДЗ целиком */
export const countHomeworkCompletions = async (
    studentIds: string[],
    topicId: string,
    mockId: string
): Promise<number> => {
    if (studentIds.length === 0) return 0;
    const statuses = await Promise.all(
        studentIds.map((sid) => fetchStudentHomeworkStatus(sid, topicId, mockId))
    );
    return statuses.filter((s) => s.done).length;
};

/** Активные мок-тесты для выпадающего списка назначения */
export const fetchActiveMocks = async (): Promise<{ id: string; title: string }[]> => {
    const snap = await getDocs(collection(db, "mocks"));
    return snap.docs
        .map((d) => ({ id: d.id, title: (d.data().title as string) || d.id, active: d.data().active }))
        .filter((m) => m.active !== false)
        .map(({ id, title }) => ({ id, title }));
};

/** Отметка о завершении мок-теста (вызывается со страницы мока) */
export const saveMockResult = (userId: string, mockId: string) =>
    setDoc(
        doc(db, "users", userId, "mockResults", mockId),
        { mockId, completedAt: new Date().toISOString() },
        { merge: true }
    );

/** Просрочено ли ДЗ (срок — конец дня dueDate) */
export const isHomeworkOverdue = (dueDate: string) => {
    const end = new Date(dueDate);
    end.setHours(23, 59, 59, 999);
    return Date.now() > end.getTime();
};
