import {
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, limit, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";
import { User, UserRole, Language, DEFAULT_LANGUAGE } from "./firestore-schema";
import { pageCache } from "./page-cache";

const googleProvider = new GoogleAuthProvider();

/**
 * Вход через Google
 */
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google:", error);
        throw error;
    }
};

/**
 * Выход из системы
 */
export const logOut = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Error signing out:", error);
        throw error;
    }
};

/**
 * Получение профиля пользователя из Firestore
 */
export const getUserProfile = (uid: string): Promise<User | null> =>
    pageCache.fetch(`userProfile:${uid}`, async () => {
        const snap = await getDoc(doc(db, "users", uid));
        return snap.exists() ? (snap.data() as User) : null;
    }, 5 * 60 * 1000);

/**
 * Генерация короткого ID (только англ буквы и цифры)
 */
const generateShortId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
};

/**
 * Короткий ID с проверкой уникальности (до 5 попыток; коллизия крайне маловероятна)
 */
const generateUniqueShortId = async (): Promise<string> => {
    for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = generateShortId();
        try {
            const snap = await getDocs(query(collection(db, "users"), where("shortId", "==", candidate), limit(1)));
            if (snap.empty) return candidate;
        } catch {
            return candidate; // проверка недоступна — используем как есть
        }
    }
    return generateShortId();
};

/**
 * Создание или обновление профиля пользователя
 */
export const createUserProfile = async (
    firebaseUser: FirebaseUser,
    role?: UserRole,
    subjects: string[] = [],
    name?: string,
    surname?: string
) => {
    try {
        const userRef = doc(db, "users", firebaseUser.uid);
        const docSnap = await getDoc(userRef);

        // Если профиль уже есть, проверяем shortId
        let shortId = docSnap.exists() ? (docSnap.data() as User).shortId : "";
        if (!shortId) {
            shortId = await generateUniqueShortId();
        }

        // Firestore отклоняет undefined-значения полей, поэтому createdAt добавляем условно
        const userData: Partial<User> = {
            id: firebaseUser.uid,
            shortId,
            email: firebaseUser.email || "",
            name: name || firebaseUser.displayName || "Ученик",
            surname: surname || "",
            avatar: firebaseUser.photoURL || "",
            updatedAt: new Date().toISOString()
        };
        if (!docSnap.exists()) {
            userData.createdAt = new Date().toISOString();
        }

        // Новым пользователям выставляем язык по умолчанию (русский)
        if (!docSnap.exists() || !(docSnap.data() as User).language) {
            userData.language = DEFAULT_LANGUAGE;
        }

        if (role) {
            userData.role = role;
            userData.subjects = subjects;
        }

        await setDoc(userRef, userData, { merge: true });

        // Get full updated data
        const finalSnap = await getDoc(userRef);
        return { id: firebaseUser.uid, ...finalSnap.data() } as User;
    } catch (error) {
        console.error("Error creating user profile:", error);
        throw error;
    }
};

/**
 * Редактирование профиля пользователя
 */
export const updateUserProfile = async (uid: string, data: { name: string; surname?: string }) => {
    try {
        const userRef = doc(db, "users", uid);
        const updateData = {
            ...data,
            updatedAt: new Date().toISOString()
        };
        await setDoc(userRef, updateData, { merge: true });

        const finalSnap = await getDoc(userRef);
        const updated = { id: uid, ...finalSnap.data() } as User;
        pageCache.invalidate(`userProfile:${uid}`);
        pageCache.set(`userProfile:${uid}`, updated, 5 * 60 * 1000);
        return updated;
    } catch (error) {
        console.error("Error updating user profile:", error);
        throw error;
    }
};

/**
 * Сохранение выбранного языка в профиль пользователя
 */
export const updateUserLanguage = async (uid: string, language: Language) => {
    try {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, { language, updatedAt: new Date().toISOString() }, { merge: true });

        const finalSnap = await getDoc(userRef);
        const updated = { id: uid, ...finalSnap.data() } as User;
        pageCache.invalidate(`userProfile:${uid}`);
        pageCache.set(`userProfile:${uid}`, updated, 5 * 60 * 1000);
        return updated;
    } catch (error) {
        console.error("Error updating user language:", error);
        throw error;
    }
};
