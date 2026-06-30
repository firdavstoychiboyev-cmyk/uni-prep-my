// UniPrep — Firebase Import Script
// Run this ONCE to populate your Firestore database with all subjects, topics and questions.
//
// SETUP (run these in Terminal inside your uniprep-app folder):
//   npm install xlsx firebase
//
// USAGE:
//   node import-to-firebase.js
//
// The script reads your Firebase config from .env.local automatically.
// It will create: 7 subjects, 14 topics, 42 questions.

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// ── Read .env.local ──────────────────────────────────────────────────────────
function loadEnv(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    console.error("❌  .env.local not found at", abs);
    process.exit(1);
  }
  const lines = fs.readFileSync(abs, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

const env = loadEnv(".env.local");

// ── Firebase setup ────────────────────────────────────────────────────────────
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  serverTimestamp,
} = require("firebase/firestore");

const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Read spreadsheet ──────────────────────────────────────────────────────────
function readSheet(wb, sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.error(`❌  Sheet "${sheetName}" not found in workbook.`);
    process.exit(1);
  }
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}

// ── Transliterate Russian → Latin (for generating IDs) ───────────────────────
function toId(str) {
  const map = {
    а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",
    к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",
    х:"h",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",
  };
  return str.toLowerCase().trim().split("").map(c =>
    map[c] !== undefined ? map[c] : /[a-z0-9]/.test(c) ? c : c === " " ? "-" : ""
  ).join("").replace(/-+/g, "-").replace(/^-|-$/g, "") || "item";
}

// ── Main import ───────────────────────────────────────────────────────────────
async function main() {
  // Find spreadsheet
  const candidates = [
    "question_bank_full.xlsx",
    "UniPrep_question_bank_starter.xlsx",
    path.join(process.env.HOME || "~", "Downloads", "UniPrep_question_bank_starter.xlsx"),
    path.join(process.env.HOME || "~", "Desktop", "UniPrep_question_bank_starter.xlsx"),
    path.join(process.env.HOME || "~", "Documents", "UniPrep_question_bank_starter.xlsx"),
  ];

  let xlsxPath = null;
  for (const c of candidates) {
    if (fs.existsSync(c)) { xlsxPath = c; break; }
  }

  if (!xlsxPath) {
    console.error("❌  Could not find UniPrep_question_bank_starter.xlsx");
    console.error("    Place it in the same folder as this script, or in Downloads/Desktop/Documents.");
    process.exit(1);
  }

  console.log(`📂  Reading: ${xlsxPath}`);
  const wb = XLSX.readFile(xlsxPath);

  const subjectsRaw  = readSheet(wb, "Предметы");
  const topicsRaw    = readSheet(wb, "Темы");
  const questionsRaw = readSheet(wb, "Вопросы");

  console.log(`📊  Found: ${subjectsRaw.length} subjects, ${topicsRaw.length} topics, ${questionsRaw.length} questions`);

  // Subject name → Firestore ID map (for linking topics & questions)
  const subjectIdMap = {};

  // ── 1. Import Subjects ────────────────────────────────────────────────────
  console.log("\n➤  Importing subjects...");
  for (const row of subjectsRaw) {
    const name  = String(row["Название"] || "").trim();
    const emoji = String(row["Эмодзи"]  || "").trim();
    const color = String(row["Цвет (HEX)"] || "#6366f1").trim();
    const order = Number(row["Порядок"] ?? 0);
    if (!name) continue;

    const id = toId(name);
    subjectIdMap[name] = id;

    await setDoc(doc(db, "subjects", id), {
      id,
      name,
      emoji,
      color,
      order,
      backgroundImage: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log(`   ✅ Subject: ${name} (id: ${id})`);
  }

  // Topic name → Firestore doc ID map (for linking questions)
  const topicIdMap = {};

  // ── 2. Import Topics ──────────────────────────────────────────────────────
  console.log("\n➤  Importing topics...");
  for (const row of topicsRaw) {
    const subjectName = String(row["Предмет"] || "").trim();
    const title       = String(row["Тема"]    || "").trim();
    const order       = Number(row["Порядок"] ?? 0);
    if (!subjectName || !title) continue;

    const subjectId = subjectIdMap[subjectName];
    if (!subjectId) {
      console.warn(`   ⚠️  Unknown subject "${subjectName}" for topic "${title}" — skipping`);
      continue;
    }

    const topicRef = await addDoc(collection(db, "topics"), {
      subjectId,
      title,
      order,
      totalQuestions: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    topicIdMap[`${subjectName}__${title}`] = topicRef.id;
    console.log(`   ✅ Topic: ${title} → ${subjectName}`);
  }

  // ── 3. Import Questions ───────────────────────────────────────────────────
  console.log("\n➤  Importing questions...");
  const topicQuestionCount = {};

  for (const row of questionsRaw) {
    const subjectName     = String(row["Предмет"]                     || "").trim();
    const topicTitle      = String(row["Тема"]                        || "").trim();
    const text            = String(row["Текст вопроса"]               || "").trim();
    const optA            = String(row["Вариант A"]                   || "").trim();
    const optB            = String(row["Вариант B"]                   || "").trim();
    const optC            = String(row["Вариант C"]                   || "").trim();
    const optD            = String(row["Вариант D"]                   || "").trim();
    const correctAnswer   = String(row["Правильный ответ (a/b/c/d)"] || "a").trim().toLowerCase();
    const difficulty      = String(row["Сложность"]                   || "medium").trim();
    const explanation     = String(row["Объяснение (необязательно)"]  || "").trim();

    if (!text || !subjectName || !topicTitle) continue;

    const topicId = topicIdMap[`${subjectName}__${topicTitle}`];
    if (!topicId) {
      console.warn(`   ⚠️  Topic "${topicTitle}" not found for question — skipping`);
      continue;
    }

    await addDoc(collection(db, "questions"), {
      topicId,
      text,
      options: { a: optA, b: optB, c: optC, d: optD },
      correctAnswer,
      difficulty,
      explanation: explanation || null,
      type: "mc",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    topicQuestionCount[topicId] = (topicQuestionCount[topicId] || 0) + 1;
    console.log(`   ✅ Question: "${text.slice(0, 50)}..."`);
  }

  // ── 4. Update totalQuestions count on each topic ──────────────────────────
  console.log("\n➤  Updating question counts on topics...");
  const { updateDoc } = require("firebase/firestore");
  for (const [topicId, count] of Object.entries(topicQuestionCount)) {
    await updateDoc(doc(db, "topics", topicId), { totalQuestions: count });
  }

  console.log("\n🎉  Import complete!");
  console.log(`    Subjects : ${subjectsRaw.length}`);
  console.log(`    Topics   : ${topicsRaw.length}`);
  console.log(`    Questions: ${questionsRaw.length}`);
  console.log("\n    Go check your admin panel — everything should be there now.");
  process.exit(0);
}

main().catch(err => {
  console.error("❌  Import failed:", err.message || err);
  process.exit(1);
});
