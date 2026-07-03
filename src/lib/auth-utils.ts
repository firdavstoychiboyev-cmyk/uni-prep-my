import {
    GoogleAuthProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut,
    User as FirebaseUser
} from "firebase/auth";
import { doc, getDoc, setDoc, writeBatch, collection, query, where, limit, getDocs } from "firebase/firestore";
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

// ── Гибкий вход: email / телефон / username ─────────────────────────────────
//
// Firebase Auth умеет входить только по email, поэтому телефон и username
// резолвятся в email через lookup-коллекции Firestore:
//   usernames/{username}   → { uid, email }
//   phoneNumbers/{+E.164}  → { uid, email }
// Документы создаются при регистрации одним batch'ем с профилем пользователя.

export type IdentifierType = "email" | "phone" | "username";

// Начинается с буквы, чтобы username никогда не выглядел как телефон
export const USERNAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_]{2,19}$/;

export const normalizeUsername = (raw: string) => raw.trim().toLowerCase();

export const isValidUsername = (raw: string) => USERNAME_REGEX.test(raw.trim());

/**
 * Приведение телефона к E.164. Понимает узбекские номера:
 * "90 123 45 67" → "+998901234567", "998901234567" → "+998901234567",
 * "+998 90 123-45-67" → "+998901234567". Возвращает null, если не распознан.
 */
export const normalizePhone = (raw: string): string | null => {
    const cleaned = raw.replace(/[\s\-()]/g, "");
    if (!cleaned) return null;
    if (cleaned.startsWith("+")) {
        return /^\+\d{8,15}$/.test(cleaned) ? cleaned : null;
    }
    if (!/^\d+$/.test(cleaned)) return null;
    if (cleaned.length === 9) return `+998${cleaned}`;
    if (cleaned.length === 12 && cleaned.startsWith("998")) return `+${cleaned}`;
    return null;
};

/** Что пользователь ввёл в поле «Логин» */
export const detectIdentifierType = (raw: string): IdentifierType => {
    const value = raw.trim();
    if (value.includes("@")) return "email";
    if (/^[+\d][\d\s\-()]*$/.test(value)) return "phone";
    return "username";
};

export const isUsernameTaken = async (username: string) => {
    const snap = await getDoc(doc(db, "usernames", normalizeUsername(username)));
    return snap.exists();
};

export const isPhoneTaken = async (phone: string) => {
    const snap = await getDoc(doc(db, "phoneNumbers", phone));
    return snap.exists();
};

/** Бросается, когда username/телефон не найден в lookup-коллекциях */
export class IdentifierNotFoundError extends Error {
    constructor(public identifierType: IdentifierType) {
        super("identifier-not-found");
        this.name = "IdentifierNotFoundError";
    }
}

export const resolveIdentifierToEmail = async (
    identifier: string
): Promise<{ email: string; type: IdentifierType }> => {
    const type = detectIdentifierType(identifier);
    if (type === "email") return { email: identifier.trim(), type };

    if (type === "phone") {
        const phone = normalizePhone(identifier);
        if (!phone) throw new IdentifierNotFoundError("phone");
        const snap = await getDoc(doc(db, "phoneNumbers", phone));
        if (!snap.exists()) throw new IdentifierNotFoundError("phone");
        return { email: (snap.data() as { email: string }).email, type };
    }

    const snap = await getDoc(doc(db, "usernames", normalizeUsername(identifier)));
    if (!snap.exists()) throw new IdentifierNotFoundError("username");
    return { email: (snap.data() as { email: string }).email, type };
};

/**
 * Вход по email / телефону / username + пароль.
 * Телефон и username сначала резолвятся в email, дальше обычный
 * signInWithEmailAndPassword — существующие email-аккаунты работают как раньше.
 */
export const signInWithIdentifier = async (identifier: string, password: string) => {
    const { email } = await resolveIdentifierToEmail(identifier);
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
};

/**
 * Регистрация по email+паролю с username и (опционально) телефоном.
 * Профиль и lookup-документы пишутся одним batch'ем; уникальность username
 * дополнительно гарантируют правила Firestore (запись в чужой документ отклоняется).
 */
export const signUpWithEmail = async (params: {
    email: string;
    password: string;
    username: string;
    phone?: string; // уже нормализованный E.164
}) => {
    const username = normalizeUsername(params.username);
    const email = params.email.trim();

    if (await isUsernameTaken(username)) throw new Error("username-taken");
    if (params.phone && (await isPhoneTaken(params.phone))) throw new Error("phone-taken");

    const result = await createUserWithEmailAndPassword(auth, email, params.password);
    const uid = result.user.uid;

    try {
        const shortId = await generateUniqueShortId();
        const userData: Partial<User> = {
            id: uid,
            shortId,
            email,
            username,
            name: "",
            surname: "",
            avatar: "",
            language: DEFAULT_LANGUAGE,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        if (params.phone) userData.phone = params.phone;

        const batch = writeBatch(db);
        batch.set(doc(db, "users", uid), userData, { merge: true });
        batch.set(doc(db, "usernames", username), { uid, email });
        if (params.phone) batch.set(doc(db, "phoneNumbers", params.phone), { uid, email });
        await batch.commit();

        pageCache.invalidate(`userProfile:${uid}`);
        return result.user;
    } catch (error) {
        // Профиль не записался (например, username заняли параллельно) —
        // удаляем только что созданный auth-аккаунт, чтобы не оставить сироту
        try {
            await result.user.delete();
        } catch {
            /* ignore */
        }
        throw error;
    }
};

/** Письмо для сброса пароля (identifier резолвится в email при необходимости) */
export const sendPasswordReset = async (identifier: string) => {
    const { email } = await resolveIdentifierToEmail(identifier);
    await sendPasswordResetEmail(auth, email);
};

/**
 * Установка/смена username и телефона из настроек (для существующих аккаунтов,
 * в т.ч. Google). Старые lookup-документы удаляются, новые создаются одним batch'ем.
 */
export const updateUserIdentifiers = async (
    current: User,
    next: { username?: string; phone?: string }
) => {
    const batch = writeBatch(db);
    const profileUpdate: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    let hasChanges = false;

    if (next.username !== undefined) {
        const username = normalizeUsername(next.username);
        if (username !== (current.username || "")) {
            if (username && (await isUsernameTaken(username))) throw new Error("username-taken");
            if (current.username) batch.delete(doc(db, "usernames", current.username));
            if (username) batch.set(doc(db, "usernames", username), { uid: current.id, email: current.email });
            profileUpdate.username = username;
            hasChanges = true;
        }
    }

    if (next.phone !== undefined && next.phone !== (current.phone || "")) {
        if (next.phone && (await isPhoneTaken(next.phone))) throw new Error("phone-taken");
        if (current.phone) batch.delete(doc(db, "phoneNumbers", current.phone));
        if (next.phone) batch.set(doc(db, "phoneNumbers", next.phone), { uid: current.id, email: current.email });
        profileUpdate.phone = next.phone;
        hasChanges = true;
    }

    if (!hasChanges) return current;

    batch.set(doc(db, "users", current.id), profileUpdate, { merge: true });
    await batch.commit();

    const finalSnap = await getDoc(doc(db, "users", current.id));
    const updated = { id: current.id, ...finalSnap.data() } as User;
    pageCache.invalidate(`userProfile:${current.id}`);
    pageCache.set(`userProfile:${current.id}`, updated, 5 * 60 * 1000);
    return updated;
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
