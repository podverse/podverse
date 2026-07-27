# COPY-PASTA — mobile-pg8-car-android-auto (PG-8 / Track 12 Android Auto)

Run prompts **1 → 4** in order. Each prompt: read its plan file + author/read its detail docs,
implement, mark master-plan steps + Appendix C + detail headers `done`, check the box. **Do not run
tests during agent work.**

**Ship bar:** Android Auto browses the native cache (Library + Downloads) and plays through the
shared engine with the app force-stopped (DHU-proven). iOS CarPlay (12.7–12.10 / 12.18) is a later
slice — the CarPlay entitlement is not provisioned yet.

Follow **mobile-carplay-android-auto**, **mobile-playback**, **mobile-data-layer**.

Prerequisite: native cache foundation 12.1–12.6 (`mobile-pg8-car-native-cache`, archived).

---

## Step 1 — MediaLibraryService config + app-closed root

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg8-car-android-auto/01-media-library-service-config.md
Author/read details 390 + 392. Implement master steps 12.11 and 12.13.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 2 — Browse tree from cache (Library + Downloads)

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg8-car-android-auto/02-browse-tree-from-cache.md
Author/read details 391 + 393. Implement master steps 12.12 and 12.14.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 3 — Car play action + URL resolution

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg8-car-android-auto/03-car-play-url-resolution.md
Author/read detail 394. Implement master step 12.15.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 4 — DHU checklist + declaration + QA gate + abcmemory (final)

- [x] done

**Cursor model:** Auto (docs) / Codex 5.3 (abcmemory)

```text
Read and execute .llm/plans/active/mobile-pg8-car-android-auto/04-dhu-checklist-docs-abcmemory.md
Author/read details 395 (Android) + 396 + 398 (Android) + 399. Implement master steps 12.16 (Android),
12.17, 12.19 (Android), 12.20. Archive this plan set when finished. Do not run tests during agent work.
```

---

## After all complete (operator)

Native rebuild + DHU acceptance (see plan step 4). Car UI for iOS is **not** in this slice.

```bash
npm run mobile:prebuild
npm run mobile:android -- --device Pixel_6_Pro_API_33
# Then follow ANDROID-AUTO-DHU-CHECKLIST.md on the Android Auto DHU with the app force-stopped.
```
