# COPY-PASTA — mobile-pg8-car-native-cache (PG-8 / Track 12.1–12.6)

Run prompts **1 → 4** in order. Each prompt: read its plan file + detail docs, implement, mark
master-plan steps + Appendix C + detail headers `done`, check the box. **Do not run tests during
agent work.**

**Ship bar:** durable native cache + JS write path + read-with-JS-dead spikes. CarPlay /
Android Auto **UI** stays for a follow-on set (12.7–12.21).

Follow **mobile-carplay-android-auto**, **mobile-data-layer**, **mobile-playback**.

Prerequisite: Track 2 spike GO + 2.35 hooks; Track 10.22 + 13.9 projection call sites done.

---

## Step 1 — Schema

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg8-car-native-cache/01-native-cache-schema.md
Also read detail 380. Implement master step 12.1.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 2 — iOS + Android storage

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg8-car-native-cache/02-ios-android-storage.md
Also read details 381–382. Implement master steps 12.2–12.3.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 3 — JS write path

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg8-car-native-cache/03-js-cache-write-path.md
Also read detail 383. Implement master step 12.4.
Mark done when finished. Do not run tests during agent work.
```

---

## Step 4 — Spikes (final)

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg8-car-native-cache/04-spikes-cache-read-no-js.md
Also read details 384–385. Implement master steps 12.5–12.6.
Archive this plan set when finished. Do not run tests during agent work.
```

---

## After all complete (operator)

Follow spike docs on simulator/device. Full car UI is **not** in this set.

```bash
test -f apps/mobile/modules/podverse-media-engine/NATIVE-CACHE-SPIKE-IOS.md
test -f apps/mobile/modules/podverse-media-engine/NATIVE-CACHE-SPIKE-ANDROID.md
rg -n 'schemaVersion' apps/mobile/src/data/nativeCache
```
