const fs = require("fs");
const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const t = line.trim(); if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("="); if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs, doc, updateDoc } = require("firebase/firestore");
const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);
(async () => {
  const snap = await getDocs(collection(db, "subjects"));
  for (const d of snap.docs) {
    const name = String(d.data().name || "").toLowerCase();
    // Языковые предметы (русский / родной язык) — не переводим автоматически
    const isLanguageSubject =
      name.includes("русск") || name.includes("родн") ||
      name.includes("ona til") || name.includes("o‘zbek til") || name.includes("узбекск");
    const translatable = !isLanguageSubject;
    await updateDoc(doc(db, "subjects", d.id), { translatable });
    console.log(`${d.data().name}  →  translatable: ${translatable}`);
  }
  console.log("done");
  process.exit(0);
})().catch((e) => { console.error(e.message || e); process.exit(1); });
