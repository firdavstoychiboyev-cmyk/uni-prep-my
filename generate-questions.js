// UniPrep — Question Bank Generator
// Generates 100 MCQs per topic (14 topics = 1400 questions) using Claude API,
// then saves question_bank_full.xlsx in the same format as UniPrep_question_bank_starter.xlsx
//
// SETUP:
//   export ANTHROPIC_API_KEY=sk-ant-...
//   node generate-questions.js

const fs   = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const Anthropic = require("@anthropic-ai/sdk");

// ── Config ────────────────────────────────────────────────────────────────────
const OUTPUT_FILE  = "question_bank_full.xlsx";
const QUESTIONS_PER_TOPIC = 100;

// ── Anthropic client ──────────────────────────────────────────────────────────
function loadEnv(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) return {};
  const env = {};
  for (const line of fs.readFileSync(abs, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const idx = t.indexOf("=");
    if (idx === -1) continue;
    env[t.slice(0, idx).trim()] = t.slice(idx + 1).trim();
  }
  return env;
}

const localEnv = loadEnv(".env.local");
const apiKey   = process.env.ANTHROPIC_API_KEY || localEnv.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.error("❌  ANTHROPIC_API_KEY not found.");
  console.error("    Run:  export ANTHROPIC_API_KEY=sk-ant-...");
  console.error("    Or add ANTHROPIC_API_KEY=... to .env.local");
  process.exit(1);
}

const client = new Anthropic({ apiKey });

// ── Subjects & Topics ─────────────────────────────────────────────────────────
const SUBJECTS = [
  { Название: "Математика",  "Эмодзи": "📐", "Цвет (HEX)": "#6366f1", Порядок: 0 },
  { Название: "Английский",  "Эмодзи": "🇬🇧", "Цвет (HEX)": "#3b82f6", Порядок: 1 },
  { Название: "Русский",     "Эмодзи": "📖", "Цвет (HEX)": "#ef4444", Порядок: 2 },
  { Название: "Биология",    "Эмодзи": "🧬", "Цвет (HEX)": "#22c55e", Порядок: 3 },
  { Название: "История",     "Эмодзи": "🏛️", "Цвет (HEX)": "#f59e0b", Порядок: 4 },
  { Название: "Физика",      "Эмодзи": "⚛️", "Цвет (HEX)": "#8b5cf6", Порядок: 5 },
  { Название: "Химия",       "Эмодзи": "🧪", "Цвет (HEX)": "#14b8a6", Порядок: 6 },
];

const TOPICS = [
  { Предмет: "Математика", Тема: "Линейные уравнения",                    Порядок: 0 },
  { Предмет: "Математика", Тема: "Геометрия: основы",                     Порядок: 1 },
  { Предмет: "Английский", Тема: "Grammar: Present Simple",                Порядок: 0 },
  { Предмет: "Английский", Тема: "Словарный запас: базовая лексика",       Порядок: 1 },
  { Предмет: "Русский",    Тема: "Грамматика: части речи",                 Порядок: 0 },
  { Предмет: "Русский",    Тема: "Чтение: понимание текста",               Порядок: 1 },
  { Предмет: "Биология",   Тема: "Клетка: строение и функции",            Порядок: 0 },
  { Предмет: "Биология",   Тема: "Анатомия человека",                      Порядок: 1 },
  { Предмет: "История",    Тема: "Всемирная история: древний мир",         Порядок: 0 },
  { Предмет: "История",    Тема: "Новая история",                          Порядок: 1 },
  { Предмет: "Физика",     Тема: "Механика: основы",                       Порядок: 0 },
  { Предмет: "Физика",     Тема: "Электричество",                          Порядок: 1 },
  { Предмет: "Химия",      Тема: "Периодическая система",                  Порядок: 0 },
  { Предмет: "Химия",      Тема: "Химические реакции",                     Порядок: 1 },
];

// ── Extra context per topic so Claude generates better questions ───────────────
const TOPIC_HINTS = {
  "Линейные уравнения":
    "Включи: решение уравнений вида ax+b=c, ax+b=cx+d, задачи на составление уравнений, " +
    "системы двух уравнений, неравенства, уравнения с дробями, задачи на скорость/возраст/смеси.",
  "Геометрия: основы":
    "Включи: периметр и площадь треугольника, прямоугольника, ромба, трапеции, круга; " +
    "теорема Пифагора; виды углов и треугольников; свойства параллельных прямых; медиана, биссектриса, высота.",
  "Grammar: Present Simple":
    "Include questions in Russian about: forming Present Simple (affirmative/negative/question), " +
    "3rd person singular -s/-es, time adverbs (always/usually/never/every day), usage rules vs Present Continuous.",
  "Словарный запас: базовая лексика":
    "Включи перевод и выбор правильного слова для: семья, дом, еда, одежда, цвета, числа, " +
    "профессии, транспорт, природа, глаголы действия — всё на уровне A1-A2.",
  "Грамматика: части речи":
    "Включи: определение части речи в предложении, склонение существительных, спряжение глаголов, " +
    "степени сравнения прилагательных, виды местоимений, наречия, предлоги, союзы, частицы.",
  "Чтение: понимание текста":
    "Дай короткий абзац (3-5 предложений) и спроси: главная мысль, значение слова, вывод из текста, " +
    "деталь из текста. Тексты о природе, школе, путешествиях, науке, истории.",
  "Клетка: строение и функции":
    "Включи: органеллы (митохондрия, рибосома, ЭПС, комплекс Гольджи, лизосома, ядро, клеточная стенка), " +
    "их функции; прокариоты vs эукариоты; митоз и мейоз; клеточный цикл; отличия растительной и животной клеток.",
  "Анатомия человека":
    "Включи: кровеносная система (сердце, артерии, вены), дыхательная (лёгкие, трахея), " +
    "пищеварительная (желудок, кишечник), нервная (нейроны, мозг), скелет (кости), мышечная система, кожа.",
  "Всемирная история: древний мир":
    "Включи: Древний Египет (фараоны, пирамиды, иероглифы), Месопотамия (Вавилон, Хаммурапи), " +
    "Древняя Греция (полисы, Александр Македонский, Олимпийские игры), Древний Рим (республика, империя), " +
    "Древний Китай (Шёлковый путь, Великая стена).",
  "Новая история":
    "Включи: Возрождение (14-17 вв.), Реформация (Лютер), Великие географические открытия, " +
    "Французская революция (1789), промышленная революция, наполеоновские войны, " +
    "Первая мировая война (1914-1918), Вторая мировая война (1939-1945).",
  "Механика: основы":
    "Включи: законы Ньютона, кинематика (скорость, ускорение, пройденный путь), " +
    "свободное падение, работа и энергия, мощность, импульс, закон сохранения импульса и энергии, " +
    "равномерное и равноускоренное движение.",
  "Электричество":
    "Включи: закон Ома (I=U/R), последовательное и параллельное соединение, мощность (P=UI), " +
    "энергия электрического тока, сила тока, напряжение, сопротивление, закон Кулона, " +
    "электрическое поле, конденсатор.",
  "Периодическая система":
    "Включи: периоды и группы, порядковый номер и заряд ядра, массовое число, изотопы, " +
    "электронная конфигурация, металлы/неметаллы/полуметаллы, закономерности в таблице Менделеева, " +
    "важнейшие элементы (H, O, C, N, Na, K, Ca, Fe, Cu, Cl).",
  "Химические реакции":
    "Включи: типы реакций (соединение, разложение, замещение, обмен), расстановка коэффициентов, " +
    "окисление и восстановление, окислитель и восстановитель, кислоты/основания/соли, " +
    "pH, экзо- и эндотермические реакции, катализ.",
};

// ── Generate questions for one topic via Claude ───────────────────────────────
async function generateForTopic(subject, topic, n) {
  const hints = TOPIC_HINTS[topic] || "";
  const prompt = `Ты создаёшь тестовые вопросы для учеников 9-11 классов в Узбекистане.
Предмет: ${subject}
Тема: ${topic}
Подсказки по содержанию: ${hints}

Сгенерируй ровно ${n} вопросов с несколькими вариантами ответа на РУССКОМ языке.
Распредели сложность: примерно треть easy, треть medium, треть hard.
Правильный ответ должен быть у разных вариантов (не всегда a).

Верни ТОЛЬКО JSON-массив (без маркдауна, без пояснений), где каждый элемент:
{
  "q": "текст вопроса",
  "a": "вариант A",
  "b": "вариант B",
  "c": "вариант C",
  "d": "вариант D",
  "ans": "a" | "b" | "c" | "d",
  "diff": "easy" | "medium" | "hard",
  "exp": "краткое объяснение правильного ответа"
}

Требования:
- Вопросы разнообразные — не повторяй одну и ту же формулировку
- Все 4 варианта правдоподобны (дистракторы реалистичны)
- Объяснение 1-2 предложения
- Числовые задачи должны иметь проверяемый правильный ответ`;

  let raw = "";
  let retries = 3;

  while (retries-- > 0) {
    try {
      const msg = await client.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 16000,
        messages:   [{ role: "user", content: prompt }],
      });

      raw = msg.content[0].text.trim();

      // Strip markdown fences if present
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("Not an array");
      return parsed;
    } catch (err) {
      console.warn(`   ⚠️  Retry ${3 - retries}/3 for "${topic}": ${err.message}`);
      if (retries === 0) {
        console.error(`   ❌  Failed to parse response for "${topic}". Skipping.`);
        console.error("   Raw output start:", raw.slice(0, 200));
        return [];
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  return [];
}

// ── Build spreadsheet rows ────────────────────────────────────────────────────
function toRow(subject, topic, q) {
  return {
    "Предмет":                     subject,
    "Тема":                        topic,
    "Текст вопроса":               q.q || "",
    "Вариант A":                   q.a || "",
    "Вариант B":                   q.b || "",
    "Вариант C":                   q.c || "",
    "Вариант D":                   q.d || "",
    "Правильный ответ (a/b/c/d)": (q.ans || "a").toLowerCase(),
    "Сложность":                   q.diff || "medium",
    "Объяснение (необязательно)":  q.exp || "",
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const allQuestions = [];
  const total = TOPICS.length;

  console.log(`🚀  Generating ${QUESTIONS_PER_TOPIC} questions × ${total} topics = ${QUESTIONS_PER_TOPIC * total} total\n`);

  for (let i = 0; i < TOPICS.length; i++) {
    const { Предмет: subject, Тема: topic } = TOPICS[i];
    process.stdout.write(`[${i + 1}/${total}] ${subject} › ${topic} ... `);

    const questions = await generateForTopic(subject, topic, QUESTIONS_PER_TOPIC);
    questions.forEach(q => allQuestions.push(toRow(subject, topic, q)));
    console.log(`✅  ${questions.length} questions`);

    // Small pause to stay within rate limits
    if (i < TOPICS.length - 1) await new Promise(r => setTimeout(r, 500));
  }

  // ── Write XLSX ──────────────────────────────────────────────────────────────
  console.log("\n📝  Building spreadsheet...");

  const wb = XLSX.utils.book_new();

  // Инструкция sheet (copy from starter if it exists)
  try {
    const starter = XLSX.readFile("UniPrep_question_bank_starter.xlsx");
    if (starter.Sheets["Инструкция"]) {
      XLSX.utils.book_append_sheet(wb, starter.Sheets["Инструкция"], "Инструкция");
    }
  } catch (_) { /* ignore if starter not present */ }

  // Предметы
  const wsSubjects = XLSX.utils.json_to_sheet(SUBJECTS);
  XLSX.utils.book_append_sheet(wb, wsSubjects, "Предметы");

  // Темы
  const wsTopics = XLSX.utils.json_to_sheet(TOPICS);
  XLSX.utils.book_append_sheet(wb, wsTopics, "Темы");

  // Вопросы
  const wsQuestions = XLSX.utils.json_to_sheet(allQuestions);
  XLSX.utils.book_append_sheet(wb, wsQuestions, "Вопросы");

  XLSX.writeFile(wb, OUTPUT_FILE);

  console.log(`\n🎉  Saved: ${OUTPUT_FILE}`);
  console.log(`    Subjects : ${SUBJECTS.length}`);
  console.log(`    Topics   : ${TOPICS.length}`);
  console.log(`    Questions: ${allQuestions.length}`);
  console.log("\n    Next step: node import-to-firebase.js");
}

main().catch(err => {
  console.error("❌", err.message || err);
  process.exit(1);
});
