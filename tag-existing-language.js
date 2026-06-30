// UniPrep — One-time migration: tag all existing content as Russian ('ru').
//
// Adds  language: "ru"  to every document in the subjects, topics and questions
// collections that does not already have a `language` field.
//
// USAGE:
//   node tag-existing-language.js
//
// Reads Firebase config from .env.local (same as import-to-firebase.js).

const fs = require("fs");
const path = require("path");

// ── Read .env.local ──────────────────────────────────────────────────────────
function loadEnv(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    console.error("❌  .env.local not found at", abs);
    process.exit(1);
  }
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

const env = loadEnv(".env.local");

const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
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

const DEFAULT_LANGUAGE = "ru";

async function tagCollection(name) {
  const snap = await getDocs(collection(db, name));
  let toUpdate = snap.docs.filter((d) => !d.data().language);
  console.log(`\n➤  ${name}: ${snap.size} docs, ${toUpdate.length} missing language`);

  // Firestore batches are limited to 500 writes
  let updated = 0;
  for (let i = 0; i < toUpdate.length; i += 450) {
    const chunk = toUpdate.slice(i, i + 450);
    const batch = writeBatch(db);
    chunk.forEach((d) => batch.update(doc(db, name, d.id), { language: DEFAULT_LANGUAGE }));
    await batch.commit();
    updated += chunk.length;
    console.log(`   ✅ updated ${updated}/${toUpdate.length}`);
  }
  return updated;
}

async function main() {
  console.log(`🌐  Tagging all existing content as "${DEFAULT_LANGUAGE}"...`);
  const s = await tagCollection("subjects");
  const t = await tagCollection("topics");
  const q = await tagCollection("questions");

  console.log("\n🎉  Migration complete!");
  console.log(`    Subjects tagged : ${s}`);
  console.log(`    Topics tagged   : ${t}`);
  console.log(`    Questions tagged: ${q}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌  Migration failed:", err.message || err);
  process.exit(1);
});
