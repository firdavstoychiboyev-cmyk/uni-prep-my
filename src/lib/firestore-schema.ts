/**
 * Firestore logical schema and TypeScript types for the application.
 */

// Трёхуровневая иерархия ролей:
//   "super_admin"    — полный доступ (Firdavs). Заменяет устаревший "admin".
//   "director_admin" — read-only по всем филиалам (сравнительная аналитика).
//   "filial_admin"   — только свой филиал. Заменяет устаревший "registanAdmin".
// Устаревшие значения "admin" и "registanAdmin" сохранены для обратной
// совместимости на время миграции существующих аккаунтов.
export type UserRole = "student" | "teacher" | "super_admin" | "director_admin" | "filial_admin" | "admin" | "registanAdmin";

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
  filialId?: string; // Филиал Registan (filials/{id}); выставляется при регистрации по коду или вручную супер-админом
  name: string; // Имя
  surname?: string; // Фамилия (опционально)
  role: UserRole;
  subjects: string[]; // массив ID предметов
  language?: Language; // предпочитаемый язык контента ('ru' | 'uz'); по умолчанию 'ru'
  createdAt: string;
  updatedAt?: string; // Дата последнего обновления
  avatar: string; // URL аватара
  // Денормализованные агрегаты для главной и рейтинга класса. Читаются любым
  // вошедшим пользователем (в отличие от userProgress, доступного только
  // владельцу/учителю), поэтому одноклассник видит их в рейтинге. Пишутся
  // при завершении теста.
  totalCorrect?: number; // всего верно решённых заданий по всем темам
  accuracy?: number;     // общая точность, %
  streakDays?: number;
}

/**
 * Код доступа к конкретному мок-тесту: mockCodes/{CODE}.
 * Отдельная коллекция — не связана с accessCodes (регистрационные коды).
 * Администратор создаёт код и распространяет его; студент вводит код
 * на вкладке «Kod orqali» и получает доступ к мок-тесту.
 */
export interface MockCode {
  code: string;          // строка-код, совпадает с id документа
  mockId: string;        // ссылка на mocks/{id}
  filialId: string | null; // ссылка на filials/{id}; null — без ограничения по филиалу
  reusable: boolean;     // true — многоразовый; false — одноразовый
  createdBy: string;     // uid администратора
  createdAt: string;
  usedBy: string[];      // uid-ы студентов, активировавших код
  maxUses: number | null; // null — без ограничения
}

/**
 * Запись об активированном мок-тесте: users/{uid}/redeemedMocks/{mockId}.
 * Служит индексом — позволяет студенту видеть свои разблокированные тесты
 * без листинга всей коллекции mockCodes.
 */
export interface RedeemedMock {
  code: string;        // какой код был использован
  redeemedAt: string;  // ISO timestamp
}

/**
 * Код доступа организации-партнёра: accessCodes/{CODE}.
 * Студент вводит код при регистрации и получает organization в профиле.
 */
export interface AccessCode {
  organization: string; // напр. "registan"
  filialId?: string;    // ссылка на filials/{id}; если задан — студент получает этот филиал при регистрации
  active: boolean;
  createdAt: string;
  maxUses: number | null; // null — без лимита
  usesCount: number;
}

/**
 * Физический филиал Registan: filials/{id}.
 * Супер-админ создаёт и управляет; Registan-админы привязаны к одному филиалу.
 */
export interface Filial {
  id: string;
  name: { ru: string; uz: string };
  createdAt: string;
  createdBy: string;
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

/**
 * Вступительный тест (Qabul testi / Вступительный тест) — отдельная сущность
 * от Rush/DTM-моков, для приёма по классу+предмету. Настраивается админом
 * (Registan-админом/супер-админом) на пару grade+subject. Вопросы берутся из
 * существующего пула (mock как набор questionIds) — своей БД вопросов нет.
 *
 * ФЛАГ: у учеников нет поля grade/sinf, поэтому список классов формируется из
 * опубликованных тестов, а ученик выбирает свой класс сам.
 */
export type EntranceTestStatus = "draft" | "published";
// Тип вопросов: в приложении используются "mc" (multiple choice) и "open".
export type EntranceQuestionType = "mc" | "open" | "mixed";
// Источник вопросов: общий предметный банк или отдельный загруженный набор.
export type EntranceQuestionSource = "general" | "dedicated";

export interface EntranceTest {
  id: string;
  grade: string;                 // "5", "6", …
  subjectId: string;
  questionCount: number;
  questionType: EntranceQuestionType;
  timeLimitMinutes: number;
  questionSource: EntranceQuestionSource;
  /** Для source "dedicated" — ссылка на entranceSets/{id} */
  dedicatedSetId?: string;
  /**
   * Зафиксированный набор вопросов, выбранный при СОЗДАНИИ теста (и general, и
   * dedicated), чтобы все ученики видели один и тот же набор — воспроизводимо,
   * без ре-рандомизации на каждую попытку (по аналогии с Rush).
   */
  questionIds?: string[];
  /** Легаси-поле: mocks/{id} как пул (для тестов, созданных до сорсинга). */
  questionPoolRef?: string;
  status: EntranceTestStatus;
  createdBy: string;
  language?: Language;
  createdAt: string;
  title?: string;
}

/**
 * Отдельный (dedicated) набор вопросов вступительного теста: entranceSets/{id}.
 * Загружается тем же XLSX-механизмом, что и Mocklar, но живёт в своей коллекции
 * и помечен grade+subject — не попадает в списки Mocklar/Rush. Сами вопросы —
 * в общей коллекции questions с флагом isEntranceQuestion.
 */
export interface EntranceSet {
  id: string;
  title: string;
  grade: string;
  subjectId: string;
  questionIds: string[];
  questionCount: number;
  language?: Language;
  createdBy: string;
  createdAt: string;
}

/** Попытка вступительного теста: entranceTestAttempts/{id}. */
export interface EntranceTestAttempt {
  id: string;
  testId: string;
  studentId: string;
  subjectId: string;
  grade: string;
  answers: (string | null)[];
  startedAt: string;
  expiresAt: string;
  submittedAt?: string;
  score?: number;                // верных MC-ответов
  total?: number;                // сколько заданий подлежит автопроверке
  /** Сколько раз ученик выходил из полноэкранного режима (анти-чит) */
  fullscreenExitCount?: number;
}

/**
 * Rush-сессия (DTM-имитация): rushSessions/{id}. Один предмет, ровно 55
 * (или меньше, если пул мал) фиксированных вопросов. Два способа появления:
 *  - "manual"  — ученик стартует сам; startedAt/expiresAt на самой сессии;
 *  - "scheduled" — учитель/админ назначает группе окно доступности
 *                  (scheduledFor..windowEnd); персональный отсчёт у каждого
 *                  ученика хранится на RushAttempt.
 */
export type RushStatus = "scheduled" | "active" | "completed";
export type RushCreatorRole = "student" | "teacher" | "admin";

export interface RushSession {
  id: string;
  subjectId: string;
  title?: string;
  questionIds: string[];        // фиксированные 55 (или меньше — флаг в rush-utils)
  sourceMockId?: string;        // ингестированный мок, из которого взяты вопросы
  status: RushStatus;
  createdBy: string;            // uid
  creatorRole: RushCreatorRole;
  language?: Language;
  createdAt: string;
  // Manual solo: личный отсчёт живёт здесь
  startedAt?: string;
  expiresAt?: string;
  // Scheduled group: окно доступности
  groupId?: string;             // classes/{id}
  scheduledFor?: string;        // ISO — когда сессия открывается
  windowEnd?: string;           // ISO — до когда можно начать
}

/** Попытка ученика по сессии: rushAttempts/{id}. */
export interface RushAttempt {
  id: string;
  sessionId: string;
  studentId: string;
  subjectId: string;
  answers: (string | null)[];   // по порядку questionIds
  startedAt: string;            // персональный старт (источник таймера)
  expiresAt: string;            // startedAt + 120 мин
  submittedAt?: string;         // пусто, пока не сдано
  autoSubmitted?: boolean;      // сдано по истечении таймера
  // Результаты скоринга (см. lib/scoring/rushScoring.ts)
  rawScore?: number;
  zScore?: number;
  tScore?: number;
  grade?: string;
  gradeType?: "standard" | "specialty";
  specialtyBall?: number;
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

