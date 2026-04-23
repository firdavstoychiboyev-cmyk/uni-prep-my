import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { Textbook, Topic, Subject, Question } from "./firestore-schema";
import { pageCache } from "./page-cache";

const TTL_STATIC = 15 * 1000; // 15 seconds — allows fast updates while still deduplicating concurrent calls
const TTL_QUESTIONS = 2 * 60 * 1000; // 2 min

export const fetchSubjects = (): Promise<Subject[]> =>
    pageCache.fetch("subjects", async () => {
        const q = query(collection(db, "subjects"), orderBy("order", "asc"));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Subject);
    }, TTL_STATIC);

export const fetchSubjectById = (id: string): Promise<Subject | null> =>
    pageCache.fetch(`subject:${id}`, async () => {
        const snap = await getDoc(doc(db, "subjects", id));
        return snap.exists() ? ({ id: snap.id, ...snap.data() } as Subject) : null;
    }, TTL_STATIC);

export const fetchTextbookById = (id: string): Promise<Textbook | null> =>
    pageCache.fetch(`textbook:${id}`, async () => {
        const snap = await getDoc(doc(db, "textbooks", id));
        return snap.exists() ? ({ id: snap.id, ...snap.data() } as Textbook) : null;
    }, TTL_STATIC);

export const fetchTextbooksBySubject = (subjectId: string): Promise<Textbook[]> =>
    pageCache.fetch(`textbooks:${subjectId}`, async () => {
        const q = query(collection(db, "textbooks"), where("subjectId", "==", subjectId));
        const snap = await getDocs(q);
        const textbooks = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Textbook);
        return textbooks.sort((a, b) => (parseInt(String(a.grade)) || 0) - (parseInt(String(b.grade)) || 0));
    }, TTL_STATIC);

export const fetchTopicById = (id: string): Promise<Topic | null> =>
    pageCache.fetch(`topic:${id}`, async () => {
        const snap = await getDoc(doc(db, "topics", id));
        return snap.exists() ? ({ id: snap.id, ...snap.data() } as Topic) : null;
    }, TTL_STATIC);

export const fetchTopicsByTextbook = (textbookId: string): Promise<Topic[]> =>
    pageCache.fetch(`topics:${textbookId}`, async () => {
        const q = query(collection(db, "topics"), where("textbookId", "==", textbookId));
        const snap = await getDocs(q);
        const topics = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Topic);
        return topics.sort((a, b) => a.order - b.order);
    }, TTL_STATIC);

export const fetchTopicsBySubject = (subjectId: string): Promise<Topic[]> =>
    pageCache.fetch(`topics-direct:${subjectId}`, async () => {
        const q = query(collection(db, "topics"), where("subjectId", "==", subjectId));
        const snap = await getDocs(q);
        return snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as Topic)
            .sort((a, b) => a.order - b.order);
    }, TTL_STATIC);

export const fetchQuestionsByTopic = (topicId: string): Promise<Question[]> =>
    pageCache.fetch(`questions:${topicId}`, async () => {
        const q = query(collection(db, "questions"), where("topicId", "==", topicId));
        const snap = await getDocs(q);
        const questions = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Question);
        // Shuffle once and cache — consistent order within the session
        return questions.sort(() => Math.random() - 0.5);
    }, TTL_QUESTIONS);
