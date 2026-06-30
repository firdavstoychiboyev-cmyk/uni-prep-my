/**
 * Import questions from Excel into Firestore.
 * Usage: node scripts/import-questions.mjs <path-to-xlsx> <lang>
 *
 * Excel sheets expected:
 *   Предметы  — subjects  (Название, Эмодзи, Цвет (HEX), Порядок, Язык)
 *   Темы      — topics    (Предмет, Тема, Порядок, Язык)
 *   Вопросы   — questions (Предмет, Тема, Текст вопроса, Вариант A/B/C/D,
 *                          Правильный ответ (a/b/c/d), Сложность, Объяснение, Язык)
 */

import XLSX from 'xlsx';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env.local ──────────────────────────────────────────────────────────
function loadEnv(envPath) {
  const content = readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\\n/g, '\n');
    env[key] = value;
  }
  return env;
}

const env = loadEnv(join(__dirname, '../.env.local'));

const clientEmail = env.FIREBASE_CLIENT_EMAIL;
const privateKey  = env.FIREBASE_PRIVATE_KEY;

if (!clientEmail || !privateKey) {
  console.error('❌  FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY missing from .env.local');
  process.exit(1);
}

// Derive project ID from service account email: xxx@<project-id>.iam.gserviceaccount.com
const projectId = clientEmail.split('@')[1].split('.iam')[0];
console.log(`🔥  Firebase project: ${projectId}`);

// ── Init Admin SDK ────────────────────────────────────────────────────────────
initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
});
const db = getFirestore();

// ── Args ──────────────────────────────────────────────────────────────────────
const [,, filePath, langArg = 'uz'] = process.argv;
if (!filePath) {
  console.error('Usage: node scripts/import-questions.mjs <path.xlsx> <lang>');
  process.exit(1);
}
const LANG = langArg;
console.log(`📂  File : ${filePath}`);
console.log(`🌐  Lang : ${LANG}\n`);

// ── Read Excel ────────────────────────────────────────────────────────────────
const wb = XLSX.readFile(filePath);
const sheet = (name) => XLSX.utils.sheet_to_json(wb.Sheets[name] ?? {}, { defval: '' });

const subjectRows  = sheet('Предметы');
const topicRows    = sheet('Темы');
const questionRows = sheet('Вопросы');

console.log(`📊  Subjects : ${subjectRows.length}`);
console.log(`📊  Topics   : ${topicRows.length}`);
console.log(`📊  Questions: ${questionRows.length}\n`);

// ── Helpers ───────────────────────────────────────────────────────────────────
const col = (row, ...keys) => {
  for (const k of keys) if (row[k] !== undefined && row[k] !== '') return String(row[k]).trim();
  return '';
};

async function upsertDoc(collectionName, queryFn, data, label) {
  const snap = await queryFn();
  if (!snap.empty) {
    const ref = snap.docs[0].ref;
    await ref.update(data);
    return { id: ref.id, created: false };
  }
  const ref = await db.collection(collectionName).add(data);
  console.log(`  ✅ Created ${label} [${ref.id}]`);
  return { id: ref.id, created: true };
}

// ── 1. Subjects ───────────────────────────────────────────────────────────────
console.log('── Importing subjects ──');
const subjectNameToId = {};

for (const row of subjectRows) {
  const name  = col(row, 'Название');
  const lang  = col(row, 'Язык') || LANG;
  if (!name) continue;

  const data = {
    name,
    emoji:           col(row, 'Эмодзи'),
    color:           col(row, 'Цвет (HEX)') || '#6366f1',
    order:           Number(col(row, 'Порядок')) || 0,
    language:        lang,
    backgroundImage: '',
    translatable:    true,
  };

  const { id } = await upsertDoc(
    'subjects',
    () => db.collection('subjects')
            .where('name', '==', name)
            .where('language', '==', lang)
            .get(),
    data,
    `Subject "${name}"`
  );
  subjectNameToId[name] = id;
}
console.log(`  → ${Object.keys(subjectNameToId).length} subjects ready\n`);

// ── 2. Topics ─────────────────────────────────────────────────────────────────
console.log('── Importing topics ──');
const topicKeyToId = {}; // "SubjectName|TopicTitle" → id

for (const row of topicRows) {
  const subjectName = col(row, 'Предмет');
  const title       = col(row, 'Тема');
  const lang        = col(row, 'Язык') || LANG;
  if (!subjectName || !title) continue;

  const subjectId = subjectNameToId[subjectName];
  if (!subjectId) {
    console.warn(`  ⚠️  Subject "${subjectName}" not found for topic "${title}" — skipping`);
    continue;
  }

  const data = {
    subjectId,
    title,
    order:          Number(col(row, 'Порядок')) || 0,
    language:       lang,
    totalQuestions: 0,
  };

  const { id } = await upsertDoc(
    'topics',
    () => db.collection('topics')
            .where('subjectId', '==', subjectId)
            .where('title', '==', title)
            .get(),
    data,
    `Topic "${title}"`
  );
  topicKeyToId[`${subjectName}|${title}`] = id;
}
console.log(`  → ${Object.keys(topicKeyToId).length} topics ready\n`);

// ── 3. Questions ──────────────────────────────────────────────────────────────
console.log('── Importing questions ──');
const topicQuestionCount = {}; // topicId → count
let qCreated = 0;
let qSkipped = 0;

for (const row of questionRows) {
  const subjectName = col(row, 'Предмет');
  const topicTitle  = col(row, 'Тема');
  const text        = col(row, 'Текст вопроса');
  const lang        = col(row, 'Язык') || LANG;
  if (!text) continue;

  const topicId = topicKeyToId[`${subjectName}|${topicTitle}`];
  if (!topicId) {
    console.warn(`  ⚠️  Topic "${topicTitle}" not found for question — skipping`);
    qSkipped++;
    continue;
  }

  // Deduplicate: skip if identical question text already exists in this topic
  const existing = await db.collection('questions')
    .where('topicId', '==', topicId)
    .where('text', '==', text)
    .get();

  if (!existing.empty) {
    qSkipped++;
    continue;
  }

  const correctRaw = col(row, 'Правильный ответ (a/b/c/d)').toLowerCase();
  const correct    = ['a','b','c','d'].includes(correctRaw) ? correctRaw : 'a';

  const difficulty = col(row, 'Сложность').toLowerCase();
  const diffValid  = ['easy','medium','hard'].includes(difficulty) ? difficulty : 'easy';

  const explanation = col(row, 'Объяснение (необязательно)', 'Объяснение');

  const data = {
    topicId,
    text,
    options: {
      a: col(row, 'Вариант A'),
      b: col(row, 'Вариант B'),
      c: col(row, 'Вариант C'),
      d: col(row, 'Вариант D'),
    },
    correctAnswer: correct,
    difficulty:    diffValid,
    language:      lang,
    type:          'mc',
    ...(explanation ? { explanation } : {}),
  };

  await db.collection('questions').add(data);
  topicQuestionCount[topicId] = (topicQuestionCount[topicId] || 0) + 1;
  qCreated++;
}
console.log(`  ✅ Created ${qCreated} questions, skipped ${qSkipped} duplicates\n`);

// ── 4. Update totalQuestions on topics ───────────────────────────────────────
console.log('── Updating topic question counts ──');
for (const [topicId, count] of Object.entries(topicQuestionCount)) {
  const snap = await db.collection('topics').doc(topicId).get();
  const prev = snap.data()?.totalQuestions || 0;
  await db.collection('topics').doc(topicId).update({ totalQuestions: prev + count });
  console.log(`  Topic [${topicId}] totalQuestions: ${prev} → ${prev + count}`);
}

// ── 5. Update questionCount / topicCount on subjects ─────────────────────────
console.log('\n── Updating subject counts ──');
for (const [subjectName, subjectId] of Object.entries(subjectNameToId)) {
  const topicsSnap    = await db.collection('topics').where('subjectId', '==', subjectId).get();
  const topicIds      = topicsSnap.docs.map(d => d.id);
  let totalQuestions  = 0;
  for (const tid of topicIds) {
    const tData = topicsSnap.docs.find(d => d.id === tid)?.data();
    totalQuestions += tData?.totalQuestions || 0;
  }
  await db.collection('subjects').doc(subjectId).update({
    topicCount:    topicIds.length,
    questionCount: totalQuestions,
  });
  console.log(`  Subject "${subjectName}": ${topicIds.length} topics, ${totalQuestions} questions`);
}

console.log('\n🎉  Import complete!');
process.exit(0);
