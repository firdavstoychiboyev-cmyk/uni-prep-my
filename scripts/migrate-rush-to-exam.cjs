#!/usr/bin/env node
/**
 * One-time migration: COPY rushSessions -> examSessions and
 * rushAttempts -> examAttempts.
 *
 * SAFETY GUARANTEES
 *  - Copy-forward ONLY. The source collections (rushSessions / rushAttempts)
 *    are never modified or deleted by this script — it only .get()s them.
 *  - Original document IDs are preserved.
 *  - All fields are copied verbatim, and any subcollections are copied
 *    recursively (rush docs are currently flat, but this is future-proof).
 *  - --dry-run makes ZERO writes; it only reads, counts, and prints samples.
 *  - Re-running the LIVE copy is idempotent (set() with the same ID overwrites
 *    the destination with the same data).
 *
 * USAGE
 *   1) npm i firebase-admin           (if not already installed)
 *   2) Provide a service account key, either:
 *        - export GOOGLE_APPLICATION_CREDENTIALS=/abs/path/serviceAccountKey.json
 *        - OR drop serviceAccountKey.json in the project root
 *      (Get it from Firebase Console -> Project settings -> Service accounts ->
 *       Generate new private key. Do NOT commit this file.)
 *   3) Dry run first:   node scripts/migrate-rush-to-exam.cjs --dry-run
 *   4) Real copy:       node scripts/migrate-rush-to-exam.cjs
 *
 * Deleting the old collections is a SEPARATE manual step you do later, after
 * verifying the new collections in production. This script never deletes.
 */

const admin = require("firebase-admin");
const path = require("path");
const fs = require("fs");

const DRY_RUN = process.argv.includes("--dry-run");

// src collection -> dest collection
const COLLECTION_MAP = {
    rushSessions: "examSessions",
    rushAttempts: "examAttempts",
};

function initAdmin() {
    if (admin.apps.length) return;
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({ credential: admin.credential.applicationDefault() });
        console.log("Auth: GOOGLE_APPLICATION_CREDENTIALS");
        return;
    }
    const keyPath = path.resolve(process.cwd(), "serviceAccountKey.json");
    if (!fs.existsSync(keyPath)) {
        console.error(
            "\nNo credentials found.\n" +
            "  Set GOOGLE_APPLICATION_CREDENTIALS to your service account JSON,\n" +
            "  or place serviceAccountKey.json in the project root.\n"
        );
        process.exit(1);
    }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const serviceAccount = require(keyPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log(`Auth: ${keyPath}`);
}

/**
 * Copy one source doc to the destination ref, then recurse into any
 * subcollections. Reads only from source; writes only to destination.
 */
async function copyDocRecursive(srcRef, destRef, stats) {
    const snap = await srcRef.get();
    if (snap.exists) {
        if (DRY_RUN) {
            stats.wouldCopy += 1;
        } else {
            await destRef.set(snap.data()); // same ID, verbatim fields
            stats.copied += 1;
        }
    }
    const subcollections = await srcRef.listCollections();
    for (const sub of subcollections) {
        const subSnap = await sub.get();
        for (const subDoc of subSnap.docs) {
            await copyDocRecursive(subDoc.ref, destRef.collection(sub.id).doc(subDoc.id), stats);
        }
    }
}

async function migrateCollection(db, srcName, destName) {
    const stats = { copied: 0, wouldCopy: 0, errors: 0 };
    console.log(`\n=== ${srcName} -> ${destName} ===`);

    const srcSnap = await db.collection(srcName).get();
    console.log(`Found ${srcSnap.size} document(s) in ${srcName}`);

    if (srcSnap.size === 0) {
        console.log("(nothing to copy)");
        return { srcName, destName, total: 0, ...stats };
    }

    if (DRY_RUN) {
        const sample = srcSnap.docs[0];
        console.log(`Sample id:     ${sample.id}`);
        console.log(`Sample fields: ${Object.keys(sample.data()).join(", ")}`);
    }

    let i = 0;
    for (const d of srcSnap.docs) {
        i += 1;
        try {
            await copyDocRecursive(d.ref, db.collection(destName).doc(d.id), stats);
        } catch (e) {
            stats.errors += 1;
            console.error(`  ERROR on ${srcName}/${d.id}: ${e.message}`);
        }
        if (i % 25 === 0 || i === srcSnap.size) {
            console.log(`  processed ${i}/${srcSnap.size}`);
        }
    }
    return { srcName, destName, total: srcSnap.size, ...stats };
}

(async () => {
    console.log(
        DRY_RUN
            ? "=== DRY RUN — no writes will be made ===\n"
            : "=== LIVE RUN — copying documents (source left untouched) ===\n"
    );
    initAdmin();
    const db = admin.firestore();

    const results = [];
    for (const [src, dest] of Object.entries(COLLECTION_MAP)) {
        results.push(await migrateCollection(db, src, dest));
    }

    console.log("\n===== SUMMARY =====");
    let totalErrors = 0;
    for (const r of results) {
        const n = DRY_RUN ? r.wouldCopy : r.copied;
        const verb = DRY_RUN ? "would be copied" : "copied";
        console.log(`${r.srcName} -> ${r.destName}: ${r.total} found, ${n} ${verb}, ${r.errors} error(s)`);
        totalErrors += r.errors;
    }
    console.log(
        DRY_RUN
            ? "\nDry run complete. Re-run WITHOUT --dry-run to perform the copy."
            : `\nMigration complete${totalErrors ? ` with ${totalErrors} error(s) — review the log above.` : "."}`
    );
    process.exit(totalErrors ? 1 : 0);
})().catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
});
