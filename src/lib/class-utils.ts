import {
    collection,
    doc,
    addDoc,
    getDocs,
    query,
    where,
    documentId,
    updateDoc,
    arrayUnion,
    arrayRemove,
    deleteDoc,
    serverTimestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { Class, User } from "./firestore-schema";
import { pageCache } from "./page-cache";

/**
 * Создание нового класса учителем
 */
export const createClass = async (teacherId: string, name: string, subjectId: string) => {
    try {
        const classData = {
            teacherId,
            name,
            subjectId,
            students: [],
            createdAt: serverTimestamp(),
        };
        const docRef = await addDoc(collection(db, "classes"), classData);
        pageCache.invalidatePrefix(`teacherClasses:${teacherId}`);
        return { id: docRef.id, ...classData };
    } catch (error) {
        console.error("Error creating class:", error);
        throw error;
    }
};

/**
 * Получение всех классов конкретного учителя
 */
export const fetchTeacherClasses = (teacherId: string): Promise<Class[]> =>
    pageCache.fetch(`teacherClasses:${teacherId}`, async () => {
        const q = query(collection(db, "classes"), where("teacherId", "==", teacherId));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Class);
    }, 2 * 60 * 1000);

/**
 * Поиск ученика по короткому ID
 */
export const findStudentById = async (shortId: string): Promise<User | null> => {
    try {
        const q = query(
            collection(db, "users"),
            where("shortId", "==", shortId.toUpperCase()),
            where("role", "==", "student")
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const doc = querySnapshot.docs[0];
            return { id: doc.id, ...doc.data() } as User;
        }
        return null;
    } catch (error) {
        console.error("Error finding student by shortID:", error);
        return null;
    }
};

/**
 * Добавление ученика в класс
 */
export const addStudentToClass = async (classId: string, studentId: string) => {
    try {
        const classRef = doc(db, "classes", classId);
        await updateDoc(classRef, {
            students: arrayUnion(studentId),
        });
    } catch (error) {
        console.error("Error adding student to class:", error);
        throw error;
    }
};

/**
 * Получение данных о студентах класса
 */
export const fetchClassStudents = async (studentIds: string[]): Promise<User[]> => {
    if (studentIds.length === 0) return [];
    try {
        // 'in'-запрос принимает максимум 10 ID — читаем чанками параллельно вместо N одиночных чтений
        const chunks: string[][] = [];
        for (let i = 0; i < studentIds.length; i += 10) chunks.push(studentIds.slice(i, i + 10));
        const snaps = await Promise.all(
            chunks.map((chunk) =>
                getDocs(query(collection(db, "users"), where(documentId(), "in", chunk)))
            )
        );
        const byId = new Map<string, User>();
        snaps.forEach((snap) => snap.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() } as User)));
        // Сохраняем исходный порядок списка класса
        return studentIds.map((id) => byId.get(id)).filter((u): u is User => Boolean(u));
    } catch (error) {
        console.error("Error fetching class students:", error);
        return [];
    }
};

/**
 * Удаление ученика из класса
 */
export const deleteStudentFromClass = async (classId: string, studentId: string) => {
    try {
        const classRef = doc(db, "classes", classId);
        await updateDoc(classRef, {
            students: arrayRemove(studentId),
        });
    } catch (error) {
        console.error("Error deleting student from class:", error);
        throw error;
    }
};

/**
 * Удаление класса целиком
 */
export const deleteClass = async (classId: string) => {
    try {
        await deleteDoc(doc(db, "classes", classId));
    } catch (error) {
        console.error("Error deleting class:", error);
        throw error;
    }
};
