# COPY-PASTA — mobile-pg8-car-carplay (PG-8 / Track 12 CarPlay AA parity)

Run prompts **1 → 4** in order. Each prompt: read its plan file + author/read its detail docs,
implement, mark master-plan steps + Appendix C + detail headers `done`, check the box. **Do not run
tests during agent work.**

**Ship bar:** CarPlay browses the native cache (**Library** + **Downloads**) and plays through
`PodverseAudioEngine.shared` with the phone app force-quit (Simulator-proven). Match today’s
Android Auto scaffold — **not** Podcasts/Music/Queue/History UX-parity.

**Portal prerequisite (operator — done):** App ID `com.podverse.app.next`, CarPlay Audio
capabilities, App Group `group.com.podverse.app.next`.

Follow **mobile-carplay-android-auto**, **mobile-playback**, **mobile-data-layer**,
**mobile-expo-monorepo**.

Prerequisite code: native cache 12.1–12.6; Android Auto slice archived under
`mobile-pg8-car-android-auto`.

---

## Step 1 — Scene + App Group + entitlements

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg8-car-carplay/01-carplay-scene-app-group.md
Author/read details 386 + 395 (iOS). Implement master steps 12.7 and 12.16 iOS code wiring.
Use App Group group.com.podverse.app.next. Mark done when finished. Do not run tests during agent work.
```

---

## Step 2 — Browse Library + Downloads

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg8-car-carplay/02-carplay-browse-library-downloads.md
Author/read detail 387. Implement master step 12.8 (AA-parity Library + Downloads from native cache).
Mark done when finished. Do not run tests during agent work.
```

---

## Step 3 — Now playing + remotes + play

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg8-car-carplay/03-carplay-now-playing-remotes-play.md
Author/read details 388 + 389. Implement master steps 12.9 and 12.10 (shared AVPlayer + one remote command center).
Mark done when finished. Do not run tests during agent work.
```

---

## Step 4 — Simulator checklist + QA gate (final)

- [x] done

**Cursor model:** Auto

```text
Read and execute .llm/plans/active/mobile-pg8-car-carplay/04-carplay-simulator-checklist-qa.md
Author/read details 397 + 398 (iOS). Implement master steps 12.18 and 12.19 iOS. Archive this plan set when finished. Do not run tests during agent work.
```

---

## After all complete (operator)

```bash
npm run mobile:prebuild
npm run mobile:ios -- --device "iPhone 17 Pro"
# Simulator: I/O ▸ External Displays ▸ CarPlay
# Follow apps/mobile/modules/podverse-media-engine/CARPLAY-SIMULATOR-CHECKLIST.md
```
