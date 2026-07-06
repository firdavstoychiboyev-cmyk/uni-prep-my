import {
    collection,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    orderBy,
    serverTimestamp,
    getCountFromServer,
    increment
} from "firebase/firestore";
import { db } from "./firebase";
import { User, Filial } from "./firestore-schema";
import { AdminScope, REGISTAN_ORG } from "../store/useAdminScopeStore";

/**
 * Смена роли пользователя супер-админом (в т.ч. промо в "registanAdmin").
 * По правилам Firestore записать чужую роль может только супер-админ (isAdmin).
 */
export const setUserRole = (userId: string, role: import("./firestore-schema").UserRole) =>
    updateDoc(doc(db, "users", userId), { role, updatedAt: new Date().toISOString() });

/** Привязка пользователя к филиалу (или снятие привязки при filialId=null). */
export const setUserFilial = (userId: string, filialId: string | null) =>
    updateDoc(doc(db, "users", userId), { filialId, updatedAt: new Date().toISOString() });

/** Все филиалы Registan: filials/{id}, сортировка по дате создания. */
export const fetchFilials = async (): Promise<Filial[]> => {
    const snap = await getDocs(query(collection(db, "filials"), orderBy("createdAt", "asc")));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Filial);
};

/** Пользователи организации Registan (одно чтение, без composite-индекса). */
export const fetchRegistanUsers = async (): Promise<User[]> => {
    const snap = await getDocs(query(collection(db, "users"), where("organization", "==", REGISTAN_ORG)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as User);
};

/**
 * Пользователи для списков «Ученики»/«Учителя» с учётом scope.
 *   all       → все пользователи роли (по платформе);
 *   registan  → только отмеченные организацией Registan.
 * Роль/организация фильтруются по разным полям, поэтому одну сторону берём
 * запросом, другую — на клиенте (без composite-индекса).
 */
export const fetchAdminUsers = async (
    role: "student" | "teacher",
    scope: AdminScope
): Promise<User[]> => {
    // В списке учеников показываем и Registan-админов (их промоутят из учеников),
    // чтобы супер-админ мог их видеть и понижать роль обратно.
    const roles = role === "student" ? ["student", "registanAdmin"] : ["teacher"];
    const matches = (r?: string) => roles.includes(r ?? "");
    try {
        if (scope === "registan") {
            const users = await fetchRegistanUsers();
            return users.filter((u) => matches(u.role));
        }
        const snap = await getDocs(query(collection(db, "users"), where("role", "in", roles)));
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as User);
    } catch (error) {
        console.error("Error fetching admin users:", error);
        return [];
    }
};

/** ID учеников в текущем scope — для аналитики (только настоящие ученики). */
export const fetchScopedStudentIds = async (scope: AdminScope): Promise<string[]> =>
    (await fetchAdminUsers("student", scope)).filter((u) => u.role === "student").map((u) => u.id);

export interface AdminStats {
    subjects: number;
    textbooks: number;
    topics: number;
    questions: number;
    students: number;
    teachers: number;
    /** Контент (fanlar/savollar…) общий для всех — не фильтруется по scope */
    contentShared: boolean;
}

/**
 * Статистика дашборда с учётом scope.
 *
 * ВАЖНО (флаг): контент (subjects/textbooks/topics/questions/mocks) НЕ имеет
 * привязки к организации — он общий для всей платформы. Поэтому в scope
 * "registan" по-Registan фильтруются только счётчики учеников/учителей, а
 * счётчики контента остаются платформенными (contentShared=true). Если
 * Registan должен иметь СВОЙ отдельный контент — нужна новая привязка в схеме.
 */
export const fetchAdminStats = async (scope: AdminScope = "all"): Promise<AdminStats> => {
    try {
        const [subjectsCount, textbooksCount, topicsCount, questionsCount] = await Promise.all([
            getCountFromServer(collection(db, "subjects")),
            getCountFromServer(collection(db, "textbooks")),
            getCountFromServer(collection(db, "topics")),
            getCountFromServer(collection(db, "questions")),
        ]);

        let students: number;
        let teachers: number;
        if (scope === "registan") {
            const users = await fetchRegistanUsers();
            students = users.filter((u) => u.role === "student").length;
            teachers = users.filter((u) => u.role === "teacher").length;
        } else {
            const [s, t] = await Promise.all([
                getCountFromServer(query(collection(db, "users"), where("role", "==", "student"))),
                getCountFromServer(query(collection(db, "users"), where("role", "==", "teacher"))),
            ]);
            students = s.data().count;
            teachers = t.data().count;
        }

        return {
            subjects: subjectsCount.data().count,
            textbooks: textbooksCount.data().count,
            topics: topicsCount.data().count,
            questions: questionsCount.data().count,
            students,
            teachers,
            contentShared: scope === "registan",
        };
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        return { subjects: 0, textbooks: 0, topics: 0, questions: 0, students: 0, teachers: 0, contentShared: false };
    }
};

/**
 * Универсальный CRUD: Добавление
 */
export const adminAddItem = async (collectionName: string, data: Record<string, unknown>) => {
    try {
        const { id, ...rest } = data;
        const finalData = {
            ...rest,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        if (id && typeof id === "string") {
            const { doc, setDoc } = await import("firebase/firestore");
            await setDoc(doc(db, collectionName, id), finalData);
            return { id, ...rest };
        } else {
            const docRef = await addDoc(collection(db, collectionName), finalData);
            return { id: docRef.id, ...rest };
        }
    } catch (error) {
        console.error(`Error adding to ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Универсальный CRUD: Удаление
 */
export const adminDeleteItem = async (collectionName: string, id: string) => {
    try {
        await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
        console.error(`Error deleting from ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Универсальный CRUD: Обновление
 */
export const adminUpdateItem = async (collectionName: string, id: string, data: Record<string, unknown>) => {
    try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error(`Error updating ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Инкремент/декремент числового поля документа
 */
export const adminIncrementField = async (collectionName: string, id: string, field: string, delta: number) => {
    try {
        const docRef = doc(db, collectionName, id);
        await updateDoc(docRef, { [field]: increment(delta) });
    } catch (error) {
        console.error(`Error incrementing ${field} in ${collectionName}:`, error);
        throw error;
    }
};

/**
 * Получение всех элементов коллекции с сортировкой
 */
export const adminFetchCollection = async (collectionName: string, sortField: string = "createdAt") => {
    try {
        const q = query(collection(db, collectionName), orderBy(sortField, "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error(`Error fetching ${collectionName}:`, error);
        return [];
    }
};
