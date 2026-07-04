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
  username?: string; // Уникальный username (нижний регистр) для входа по логину
  phone?: string; // Телефон в формате E.164 (+998...) для входа по номеру
  organization?: string; // Организация-партнёр (напр. "registan"), выставляется по коду доступа при регистрации
  name: string; // Имя
  surname?: string; // Фамилия (опционально)
  role: UserRole;
  subjects: string[]; // массив ID предметов
  language?: Language; // предпочитаемый язык контента ('ru' | 'uz'); по умолчанию 'ru'
  createdAt: string;
  updatedAt?: string; // Дата последнего обновления
  avatar: string; // URL аватара
}

/**
 * Код доступа организации-партнёра: accessCodes/{CODE}.
 * Студент вводит код при регистрации и получает organization в профиле.
 */
export interface AccessCode {
  organization: string; // напр. "registan"
  active: boolean;
  createdAt: string;
  maxUses: number | null; // null — без лимита
  usesCount: number;
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
  hasTextbooks?: boolean;
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
  language?: Language;
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

/**
 * Домашнее задание класса: classes/{classId}/homework/{homeworkId}.
 * Два типа: "topics" — набор тем предмета (возможно, из учебника);
 * "mock" — один мок-тест предмета. Выполнение выводится из существующих
 * записей: userProgress/{topicId}.completedAt и mockResults/{mockId}.
 */
export type HomeworkType = "topics" | "mock";

export interface Homework {
  id: string;
  type: HomeworkType;
  subjectId: string;
  textbookId?: string; // только для type "topics", если темы из учебника
  topicIds?: string[]; // для type "topics"
  mockId?: string; // для type "mock"
  dueDate: string; // ISO-дата (yyyy-mm-dd); срок — конец этого дня
  createdAt: string;
  createdBy: string; // uid учителя
}

/** Отметка о завершении мок-теста: users/{uid}/mockResults/{mockId} */
export interface MockResult {
  mockId: string;
  completedAt: string;
  /** Ответы ученика по порядку вопросов мока (null — без ответа); нужны для экрана разбора */
  answers?: (string | null)[];
  correct?: number;
  total?: number;
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

