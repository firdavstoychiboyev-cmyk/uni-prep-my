# UNI-PREP Codebase Audit Report

**Date:** 2026-06-29  
**Scope:** Full `/src` directory + `firestore.rules` + `firestore.indexes.json`  
**Auditor:** Claude Sonnet 4.6 (automated + manual analysis)

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 5 |
| 🟡 Medium | 15 |
| 🟢 Minor | 10 |

---

## 🔴 CRITICAL

---

### C-1 — Auth loading spinner fires on every navigation

**File:** `src/components/auth-provider.tsx:27-59`  
**Category:** Bug / Performance

`pathname` is in the `useEffect` dependency array that registers `onAuthStateChanged`. Every route change tears down and re-registers the Firebase listener, which calls `setLoading(true)` at line 29 before re-resolving the user. This causes the full loading skeleton to flash on every client-side navigation.

```ts
// BUG — pathname in deps causes re-subscription on every route change
}, [setUser, setLoading, router, pathname]);
```

**Fix:** Store the current pathname in a ref. The auth listener reads the ref value at call time without being in the dependency array.

**Priority:** 🔴 Critical — affects every page transition for all users.

---

### C-2 — Sniper & Expert achievements can never be awarded

**File:** `src/app/(dashboard)/test/[id]/page.tsx:440-446`  
**Category:** Bug (Logic)

`checkAndAwardAchievements` is called with both `subjectAccuracies` and `hardQuestionsCompletedBySubject` hardcoded to `[]`. The Sniper series (95%+ accuracy per subject) and Expert series (hard questions per subject) can therefore never be triggered.

```ts
awarded = await checkAndAwardAchievements(user.id, {
    subjectAccuracies: [],           // ← always empty
    streakDays,
    totalCorrect,
    correctStreak: maxStreak,
    hardQuestionsCompletedBySubject: [], // ← always empty
});
```

**Fix:** Build `subjectAccuracies` by grouping the already-fetched `allProgSnap` by subject (using `allTopics` to get each topic's `subjectId`), then computing average accuracy per subject. Same for hard-question counts.

**Priority:** 🔴 Critical — entire achievement categories silently broken.

---

### C-3 — Achievement popup is always in Russian, ignores Uzbek

**File:** `src/app/(dashboard)/test/[id]/page.tsx:1148-1170`  
**Category:** i18n Bug

The achievement popup uses three hardcoded Russian strings instead of `t()` keys. Uzbek users see Russian text.

```tsx
<h2>…{newlyAwarded.length === 1 ? "Новое достижение!" : `${newlyAwarded.length} новых достижения!`}</h2>
<p>Вы разблокировали:</p>
<button>Продолжить</button>
```

**Fix:** Add translation keys `ach.newTitle`, `ach.newTitlePlural`, `ach.unlocked`, `ach.continue` to `translations.ts` and use `t()` in the popup. Also add Uzbek translations.

**Priority:** 🔴 Critical — product is bilingual; ~50% of users see broken UI strings.

---

### C-4 — Textbook page stays permanently loading on any fetch error

**File:** `src/app/(dashboard)/textbook/[id]/page.tsx:22-40`  
**Category:** Bug (Error Handling)

`load()` is an async function with no `try/catch`. If `fetchTextbookById` or `fetchTopicsByTextbook` rejects (network error, Firestore permission error), `setIsLoading(false)` is never called. The page displays the loading skeleton forever with no error message.

```ts
const load = async () => {
    const [textbookData, topicsData] = await Promise.all([...]);
    // ... if anything above throws, setIsLoading(false) never runs
    setIsLoading(false);
};
```

**Fix:** Wrap the entire body in `try/catch/finally`, call `setIsLoading(false)` in `finally`, and show an error state.

**Priority:** 🔴 Critical — silent permanent loading spinner with no recovery path.

---

### C-5 — Missing Firestore composite index for mocks query

**File:** `src/app/(dashboard)/mocks/page.tsx:28-33` / `firestore.indexes.json`  
**Category:** Firebase / Runtime Error

The mocks list queries two fields simultaneously:
```ts
query(collection(db, "mocks"), where("language", "==", language), where("active", "==", true))
```
`firestore.indexes.json` is completely empty (`"indexes": []`). Firestore requires a composite index for any query combining two or more `where` filters on different fields. In production this throws:

```
FirebaseError: The query requires an index. You can create it here: ...
```

**Fix:** Add the composite index to `firestore.indexes.json`.

**Priority:** 🔴 Critical — the entire Mocks section is broken in production.

---

## 🟡 MEDIUM

---

### M-1 — Direct Firestore read on home page bypasses cache

**File:** `src/app/(dashboard)/home/page.tsx:109`  
**Category:** Bug / Performance

`getDoc(doc(db, "users", user.id))` is called directly instead of `getUserProfile(user.id)` from `auth-utils.ts`, which caches for 5 minutes. This fires an extra uncached read on every home page load.

**Fix:** Replace the raw `getDoc` with `getUserProfile(user.id)`.

---

### M-2 — `doDelete` leaves all user subcollections orphaned

**File:** `src/app/(dashboard)/settings/page.tsx:157-170`  
**Category:** Bug / Data Integrity

Account deletion deletes only `users/{uid}` and the Firebase Auth user. The subcollections `userProgress`, `badges`, `testResults`, `ratings` are never deleted — Firestore does not cascade-delete subcollections. These documents remain permanently in the database.

**Fix:** Before calling `deleteUser`, delete all subcollection documents via `getDocs` + `deleteDoc` on each, or use a Cloud Function with the Firebase Admin SDK's `recursiveDelete`.

---

### M-3 — Variable `t` shadows translation function in multiple files

**Files:**  
- `src/app/(dashboard)/statistics/page.tsx:84`  
- `src/app/(dashboard)/test/[id]/page.tsx:~68`  
**Category:** TypeScript / Bug Risk

In `statistics/page.tsx`, inside a `.forEach((t) => ...)` callback, the iteration variable `t` shadows the `t` translation function from `useTranslation`. This works today only because `t` (the function) is not used inside that specific callback, but it is a latent bug — any future use of `t` inside the loop will silently call `forEach`'s argument instead.

**Fix:** Rename the iteration variable: `.forEach((topic) => ...)`.

---

### M-4 — `pathname` on home page computed at module level

**File:** `src/app/(dashboard)/home/page.tsx:30-31`  
**Category:** Bug (Stale Data)

`dayOfYear` is computed once when the module first loads, not on each render. If the app stays open past midnight, the quote selector will not refresh until the page fully reloads.

**Fix:** Move `dayOfYear` computation inside the component function body.

---

### M-5 — Streak data missing from statistics page

**File:** `src/app/(dashboard)/statistics/page.tsx:128`  
**Category:** UI Bug

The streak card displays a hardcoded `"—"` dash. The streak is tracked in `users/{uid}.streakDays` and updated after each test, but `statistics/page.tsx` never fetches the user document to read it.

**Fix:** Fetch `getUserProfile(user.id)` or read `useAuthStore`'s `user.streakDays` field (it's set by the test page on `setDoc(userDocRef, { streakDays, … }, { merge: true })`). Note that `streakDays` is not currently in the TypeScript `User` type (see M-8).

---

### M-6 — `doc` variable shadows Firestore `doc()` import in admin-utils

**File:** `src/lib/admin-utils.ts:117`  
**Category:** TypeScript / Naming

`snapshot.docs.map(doc => ...)` — the iteration variable `doc` shadows the `doc` function imported from `firebase/firestore` at line 6. If any code inside the `.map` tries to call `doc(db, …)`, it will fail at runtime.

**Fix:** Rename: `.map((docSnap) => ...)`.

---

### M-7 — Admin overview uses `<a>` tags instead of `<Link>`

**File:** `src/app/(dashboard)/admin/page.tsx:80-131`  
**Category:** Performance / Navigation

All navigation on the admin overview page uses `<a href="...">` HTML elements, which trigger full browser navigations (including full JS parse and re-initialization) instead of Next.js client-side transitions.

**Fix:** Replace all `<a href="...">` with `<Link href="...">` from `next/link`.

---

### M-8 — `streakDays` and `totalCorrect` missing from `User` TypeScript type

**File:** `src/lib/firestore-schema.ts` / `src/app/(dashboard)/home/page.tsx`  
**Category:** TypeScript

`streakDays` and `totalCorrect` are written to `users/{uid}` by the test completion flow (`setDoc(userDocRef, { streakDays, lastActiveDate }, { merge: true })`) and read by the home page via `data?.streakDays`. However, neither field is declared in the `User` interface in `firestore-schema.ts`. TypeScript silently accepts this because the raw `data()` result is cast to `any`.

**Fix:** Add `streakDays?: number`, `lastActiveDate?: string`, and `totalCorrect?: number` to the `User` interface.

---

### M-9 — `onboarding/page.tsx` uses `auth.currentUser!` non-null assertion

**File:** `src/app/onboarding/page.tsx:59`  
**Category:** Bug / TypeScript

`createUserProfile(auth.currentUser!, ...)` — if the Firebase auth state hasn't resolved by the time `handleFinish` runs (e.g., slow network), `auth.currentUser` is `null` and the assertion will throw a runtime error. The `useAuthStore` already holds the resolved user from `onAuthStateChanged`.

**Fix:** Use `auth.currentUser ?? null` and guard against null, or use `useAuthStore`'s `user` instead of `auth.currentUser!`.

---

### M-10 — `fetchClassStudents` is an N+1 Firestore read loop

**File:** `src/lib/class-utils.ts:91-108`  
**Category:** Performance / Firebase

Students are fetched one-by-one in a `for` loop, each triggering a separate Firestore read:
```ts
for (const id of studentIds) {
    const userSnap = await getDoc(doc(db, "users", id));
    ...
}
```
With 20 students, this is 20 sequential round-trips.

**Fix:** Use `Promise.all()` to parallelize reads. For larger classes, batch with Firestore's `in` operator (up to 30 IDs in Firebase v9+).

---

### M-11 — Classes page has no error handling on data fetch

**File:** `src/app/(dashboard)/classes/page.tsx:21-26`  
**Category:** Bug (Error Handling)

`fetchTeacherClasses(user.id).then((data) => { setClasses(data); setIsLoading(false); })` — if `fetchTeacherClasses` rejects, the `.then` is never called, `setIsLoading(false)` is never called, and the page stays in its loading skeleton state forever.

**Fix:** Add `.catch(() => setIsLoading(false))` or use `async/await` with `try/finally`.

---

### M-12 — `MathText` always sets `container.innerHTML = content` (XSS risk)

**File:** `src/components/MathText.tsx:41`  
**Category:** Security

Question text from Firestore is directly assigned to `innerHTML` without sanitization. If an admin account is compromised or question content is malformed, arbitrary HTML/script could execute in users' browsers.

**Fix:** Sanitize with `DOMPurify.sanitize(content)` before assigning to `innerHTML`, or switch to a pure-React KaTeX renderer that avoids `innerHTML` entirely.

---

### M-13 — `useState` used as constants (no setter) in subject page

**File:** `src/app/(dashboard)/subject/[id]/page.tsx:204-205`  
**Category:** Dead Code / TypeScript

```ts
const [multiSelect] = useState(true);
const [randomize] = useState(false);
```
These are effectively constants. They consume React state slots needlessly and mislead readers into thinking they're configurable.

**Fix:** Replace with `const multiSelect = true;` and `const randomize = false;` (or remove if unused).

---

### M-14 — `updateUserProfile` / `updateUserLanguage` do an extra Firestore read after every write

**File:** `src/lib/auth-utils.ts`  
**Category:** Performance / Firebase

Both functions call `updateDoc(ref, data)` then immediately `getDoc(ref)` to return the updated document. This is a wasted read — the updated data is already known from the write payload.

**Fix:** Merge the update payload with the existing cached profile and return without a `getDoc` call.

---

### M-15 — Subject page fetches all userProgress instead of using cache

**Files:** `src/app/(dashboard)/subject/[id]/page.tsx:294`, `src/app/(dashboard)/test/[id]/page.tsx:434`  
**Category:** Performance / Firebase

Both pages call `getDocs(collection(db, "users", user.id, "userProgress"))` inline instead of using `fetchRawProgress` from `stats-utils.ts`, which uses the `pageCache` with TTL. This bypasses the in-memory cache and fires redundant Firestore reads.

**Fix:** Use `fetchRawProgress(user.id)` from `stats-utils.ts`.

---

## 🟢 MINOR

---

### N-1 — Duplicate favicon link tags in root layout

**File:** `src/app/layout.tsx:66-73`  
**Category:** Dead Code / HTML

Favicon `<link>` tags are declared manually in `<head>` AND exported via the `metadata.icons` object. Next.js 14 generates `<link>` tags from `metadata.icons` automatically, so the manual tags duplicate them in the rendered HTML.

**Fix:** Remove the manual `<link rel="icon">` tags from `<head>` and rely solely on `metadata.icons`.

---

### N-2 — `<html lang="en">` hardcoded for a Russian/Uzbek app

**File:** `src/app/layout.tsx:64`  
**Category:** Accessibility / SEO

The root `<html>` element declares `lang="en"`. The app's default language is Russian (`"ru"`). This causes accessibility tools (screen readers) and search engines to use incorrect language hints.

**Fix:** Set `lang="ru"` as the default, or dynamically set it via a client component that reads `useLanguageStore`.

---

### N-3 — Module-level `<style>` injection in `MathText`

**File:** `src/components/MathText.tsx:76-98`  
**Category:** Code Quality / SSR Risk

The module executes `document.createElement("style")` at import time (outside any component or hook). This is a side effect that runs during module initialization, breaks during SSR, and may cause issues with testing.

**Fix:** Move this into a `useEffect` inside the component (or a global CSS file).

---

### N-4 — `getSubjectIcon` duplicated in sidebar vs. `subject-icons.ts`

**File:** `src/components/sidebar.tsx:40-56`  
**Category:** Dead Code / Maintainability

The sidebar has its own `getSubjectIcon` function matching Russian subject names. `src/lib/subject-icons.ts` already exports `getSubjectMeta` for the same purpose (used in profile and statistics pages). The sidebar's version also won't match Uzbek-language subject names since it only matches Russian substrings.

**Fix:** Import `getSubjectMeta` from `subject-icons.ts` in the sidebar instead of maintaining a duplicate.

---

### N-5 — `mocks/[id]/page.tsx` is entirely in raw Russian/Uzbek, no i18n

**File:** `src/app/(dashboard)/mocks/[id]/page.tsx`  
**Category:** i18n / Maintainability

The entire mock test page contains ~30 hardcoded string pairs like `language === "uz" ? "Yuklanmoqda..." : "Загрузка..."` instead of using the `t()` function. This is inconsistent with every other page in the app.

**Fix:** Add translation keys to `translations.ts` and use `t()` throughout.

---

### N-6 — Mocks intro shows hardcoded `|| 55` question count fallback

**File:** `src/app/(dashboard)/mocks/[id]/page.tsx:155`  
**Category:** UI Bug

The question counter shows `{questions.length || 55}` — the `55` is displayed while questions are still loading, implying there are 55 questions even if there are 0.

**Fix:** Show a loading skeleton or `"—"` while questions are not yet loaded.

---

### N-7 — `SUBJECTS` constant used for subject lookup may diverge from Firestore

**Files:** `src/app/(dashboard)/classes/page.tsx:92`, `src/app/(dashboard)/profile/page.tsx:185`  
**Category:** Data Consistency

Classes and profile pages find subject info via `SUBJECTS.find(s => s.id === cls.subjectId)` where `SUBJECTS` is a hardcoded constant in `src/lib/constants.ts`. Actual subjects come from Firestore. If Firestore subject IDs change, or a teacher's subject assignment uses a different ID, the lookup returns `undefined` and the subject emoji/name is missing.

**Fix:** Use the `useSubjectsStore` (already loaded by the sidebar) for subject lookups instead of the hardcoded constant.

---

### N-8 — Test page `<img>` instead of `next/image` for question images

**File:** `src/app/(dashboard)/test/[id]/page.tsx:703-710`, `src/app/(dashboard)/mocks/[id]/page.tsx:288-293`  
**Category:** Performance

Raw `<img>` elements are used for question images with eslint-disable comments. Next.js `<Image>` provides automatic lazy loading, format optimization, and size hints that are particularly valuable for content-heavy pages.

**Fix:** Replace raw `<img>` with `next/image`'s `<Image unoptimized>` (for external URLs) or properly sized `<Image>` for known dimensions.

---

### N-9 — `firestore.indexes.json` is empty

**File:** `firestore.indexes.json`  
**Category:** Firebase / Deployment

The file is `{"indexes": [], "fieldOverrides": []}`. Multiple queries in the app require composite indexes. The mocks query (C-5) is already critical, but topics queries (by `textbookId` + `language`) may also fail depending on Firestore's single-field index optimization.

**Fix:** Deploy all required composite indexes and maintain them in this file.

---

### N-10 — `shortId` collision risk on user creation

**File:** `src/lib/auth-utils.ts`  
**Category:** Data Integrity

`createUserProfile` generates a random `shortId` (6-char alphanumeric) without checking for collisions. With ~36^6 ≈ 2 billion possibilities, collisions are rare but not impossible at scale. The teacher-to-student lookup in `class-utils.ts` relies on `shortId` uniqueness.

**Fix:** After generating `shortId`, query Firestore to check for existing users with that ID and regenerate if a collision is found.

---

## Fixes Applied

See git diff for exact changes. The following 🔴 Critical issues were fixed immediately after this report was generated:

- **C-1** `auth-provider.tsx` — removed `pathname` from `onAuthStateChanged` deps, moved navigation logic into a `pathnameRef`
- **C-2** `test/[id]/page.tsx` — compute `subjectAccuracies` from `allProgSnap` + topic metadata
- **C-3** `test/[id]/page.tsx` — replaced hardcoded Russian strings with `t()` calls
- **C-4** `textbook/[id]/page.tsx` — added `try/catch/finally` to `load()`
- **C-5** `firestore.indexes.json` — added composite index for mocks query
