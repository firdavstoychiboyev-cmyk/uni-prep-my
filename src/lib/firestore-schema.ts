/**
 * Firestore logical schema and TypeScript types for the application.
 */

export type UserRole = "student" | "teacher" | "admin";

/** Язык контента и интерфейса. По умолчанию — русский. */
export type Language = "ru" | "uz";

export const DEFAULT_LANGUAGE: Language = "ru";

export interface User {
  id: string; // Firebase UID
  shortId: string; // Короткий ID (только буквы и цифры)
  email: string;
  name: string; // Имя
  surname?: string; // Фамилия (опционально)
  role: UserRole;
  subjects: string[]; // массив ID предметов
  language?: Language; // предпочитаемый язык контента ('ru' | 'uz'); по умолчанию 'ru'
  createdAt: string;
  updatedAt?: string; // Дата последнего обновления
  avatar: string; // URL аватара
}

export interface Subject {
  id: string;
  name: string;
  emoji: string;
  color: string;
  order: number;
  language?: Language; // язык предмета ('ru' | 'uz'); отсутствие трактуется как 'ru'
  /**
   * Можно ли автоматически переводить контент этого предмета на другой язык.
   * true / отсутствует → переводится автоматически (будущий переводчик).
   * false → языковой предмет (Русский, родной язык) — ведётся вручную отдельно для каждого языка.
   */
  translatable?: boolean;
  backgroundImage: string;
  topicCount?: number; // Количество тем
  questionCount?: number; // Количество вопросов
}

export interface Textbook {
  id: string;
  subjectId: string;
  title: string;
  grade: string | number;
  coverImage: string;
  createdAt: string;
}

export interface Topic {
  id: string;
  textbookId?: string;   // опционально — отсутствует у тем без учебника
  subjectId?: string;    // обязательно для тем без учебника
  title: string;
  order: number;
  language?: Language; // язык темы ('ru' | 'uz'); отсутствие трактуется как 'ru'
  totalQuestions: number;
}

export interface Question {
  id: string;
  topicId: string;
  text: string;
  options?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correctAnswer: string; // "a"|"b"|"c"|"d" for MC; any string for "text"/"open"
  difficulty: "easy" | "medium" | "hard";
  language?: Language; // язык вопроса ('ru' | 'uz'); отсутствие трактуется как 'ru'
  type?: "mc" | "text" | "open"; // defaults to "mc"; "text" = MathQuill answer; "open" = plain-text answer
  explanation?: string; // step-by-step explanation shown after answering
  domain?: string;      // e.g. "Algebra", "Reading & Writing"
  skill?: string;       // e.g. "Linear equations in one variable"
  imageUrl?: string;    // CDN URL of optional question image (Uploadcare)
}

export type Medal = "none" | "green" | "grey" | "bronze";

export interface UserProgress {
  userId: string;
  topicId: string;
  solvedQuestions: number;
  correctFirstCount?: number;  // верно с первой попытки
  correctRetryCount?: number;  // верно после повторных попыток
  errors: number;
  /** Вопросы с флажком «Отметить» в последнем завершённом прохождении */
  markedQuestions?: number;
  medal: Medal;
  accuracy: number; // процент точности
  completedAt: string;
}

export interface SubjectRating {
  userId: string;
  subjectId: string;
  stars: number;
  lastUpdated: string;
}

export interface Class {
  id: string;
  teacherId: string;
  name: string;
  subjectId: string;
  students: string[]; // массив ID студентов
  createdAt: string;
}

export interface Badge {
  id: string;
  userId: string;
  name: string;
  description: string;
  textbookId: string;
  unlockedAt: string;
}

export interface TestResult {
  id: string;
  userId: string;
  topicId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  errors: number;
  timeSpentSeconds: number;
  completedAt: string;
}

