# COPY-PASTA — mobile-pg7b-player (Track 11 audio-first)

Run prompts **1 → 6** in order **after** PG-7a (Track 10) play path is in place. Each prompt: read
its plan file + detail docs, implement, mark master-plan steps + Appendix C + detail headers
`done`, check the box. **Do not implement deferred video steps** (11.3, 11.6–11.8, 11.15–11.17).
**Do not run tests during agent work.**

Prerequisite: `.llm/plans/active/mobile-pg7a-queue/` completed (or archived under `completed/`).

Follow **mobile-playback**, **mobile-theme-parity**, **mobile-e2e-screenshots**.

## Step 1 — Mini player UI + layout

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg7b-player/01-mini-player.md
Also read details 340–341. Implement master steps 11.1–11.2. Do not implement 11.3.
Mark done when finished. Do not run tests during agent work.
```

## Step 2 — Expand without reload

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg7b-player/02-expand-without-reload.md
Also read detail 343. Implement master step 11.4 (audio). Mark done when finished.
Do not run tests during agent work.
```

## Step 3 — Full player UI

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg7b-player/03-full-player-ui.md
Also read detail 350. Implement master step 11.5. Mark done when finished.
Do not run tests during agent work.
```

## Step 4 — Up-next, segments, speed

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg7b-player/04-up-next-segments-speed.md
Also read details 354–356. Implement master steps 11.9–11.11. Mark done when finished.
Do not run tests during agent work.
```

## Step 5 — Sleep, share, V4V stub

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg7b-player/05-sleep-share-v4v.md
Also read details 357–359. Implement master steps 11.12–11.14. Mark done when finished.
Do not run tests during agent work.
```

## Step 6 — Anti-pattern doc (final)

- [x] done

**Cursor model:** Auto

```text
Read and execute .llm/plans/active/mobile-pg7b-player/06-anti-pattern-doc.md
Also read detail 363. Implement master step 11.18. Leave video steps 11.3/11.6–11.8/11.15–11.17
planned. Archive this plan set to .llm/plans/completed/mobile-pg7b-player/ and end with
cumulative operator verification commands. Do not run tests during agent work.
```
