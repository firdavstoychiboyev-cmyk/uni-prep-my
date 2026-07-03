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
    data: {
        type: "topics" | "mock";
        subjectId: string;
        textbookId?: string;
        topicIds?: string[];
        mockId?: string;
        dueDate: string;
        createdBy: string;
    }
) => {
    // Firestore отклоняет undefined-поля — собираем документ по типу
    const docData: Record<string, unknown> = {
        type: data.type,
        subjectId: data.subjectId,
        dueDate: data.dueDate,
        createdBy: data.createdBy,
        createdAt: new Date().toISOString()
    };
    if (data.type === "topics") {
        docData.topicIds = data.topicIds ?? [];
        if (data.textbookId) docData.textbookId = data.textbookId;
    } else {
        docData.mockId = data.mockId;
    }
    const ref = await addDoc(collection(db, "classes", classId, "homework"), docData);
    return ref.id;
};

export const deleteHomework = (classId: string, homeworkId: string) =>
    deleteDoc(doc(db, "classes", classId, "homework", homeworkId));

export interface HomeworkStatus {
    done: boolean;
    /** Для type "topics": статус каждой темы */
    topicsDone: Record<string, boolean>;
    /** Для type "mock" */
    mockDone: boolean;
}

/**
 * Статус одного ученика по одному ДЗ:
 * "topics" — выполнены ВСЕ назначенные темы; "mock" — мок завершён.
 */
export const fetchStudentHomeworkStatus = async (
    studentId: string,
    hw: Homework
): Promise<HomeworkStatus> => {
    if (hw.type === "mock") {
        const snap = hw.mockId
            ? await getDoc(doc(db, "users", studentId, "mockResults", hw.mockId))
            : null;
        const mockDone = Boolean(snap?.exists());
        return { done: mockDone, topicsDone: {}, mockDone };
    }
    const topicIds = hw.topicIds ?? [];
    const snaps = await Promise.all(
        topicIds.map((tid) => getDoc(doc(db, "users", studentId, "userProgress", tid)))
    );
    const topicsDone: Record<string, boolean> = {};
    topicIds.forEach((tid, i) => {
        topicsDone[tid] = snaps[i].exists() && Boolean(snaps[i].data()?.completedAt);
    });
    const done = topicIds.length > 0 && topicIds.every((tid) => topicsDone[tid]);
    return { done, topicsDone, mockDone: false };
};

/** Сколько учеников класса выполнили ДЗ целиком */
export const countHomeworkCompletions = async (
    studentIds: string[],
    hw: Homework
): Promise<number> => {
    if (studentIds.length === 0) return 0;
    const statuses = await Promise.all(
        studentIds.map((sid) => fetchStudentHomeworkStatus(sid, hw))
    );
    return statuses.filter((s) => s.done).length;
};

export interface MockOption {
    id: string;
    title: string;
    /** id документа предмета (subjects/{id}); у старых моков может отсутствовать */
    subject?: string;
}

/** Активные мок-тесты для выпадающего списка назначения */
export const fetchActiveMocks = async (): Promise<MockOption[]> => {
    const snap = await getDocs(collection(db, "mocks"));
    return snap.docs
        .map((d) => ({
            id: d.id,
            title: (d.data().title as string) || d.id,
            subject: (d.data().subject as string) || undefined,
            active: d.data().active
        }))
        .filter((m) => m.active !== false)
        .map(({ id, title, subject }) => ({ id, title, subject }));
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
