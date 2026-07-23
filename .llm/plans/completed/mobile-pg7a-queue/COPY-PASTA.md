# COPY-PASTA — mobile-pg7a-queue (Track 10)

Run prompts **1 → 6** in order. Each prompt: read its plan file + listed detail docs, implement,
then mark the master-plan steps + Appendix C + detail headers `done` and check the box here.
**Do not run tests during agent work** — operator verifies at the end (final step: cumulative
commands + archive).

Prerequisite: Track 9b / PG-6.5 completed
(`.llm/plans/completed/mobile-pg6.5-data-layer/`).

Follow **mobile-data-layer**, **mobile-playback**, **mobile-e2e-screenshots**.

## Step 1 — Queue store + hydrate

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg7a-queue/01-queue-store-hydrate.md
Also read details 310–314. Implement master steps 10.1–10.5. Mark done when finished.
Do not run tests during agent work.
```

## Step 2 — Queue mutations

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg7a-queue/02-queue-mutations.md
Also read details 315–316. Implement master steps 10.6–10.7. Mark done when finished.
Do not run tests during agent work.
```

## Step 3 — Auto-queue

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg7a-queue/03-auto-queue.md
Also read details 317–320. Implement master steps 10.8–10.11. Mark done when finished.
Do not run tests during agent work.
```

## Step 4 — Orchestrator + native bridge (audio)

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg7a-queue/04-orchestrator-bridge.md
Also read details 321–326 and playback-core resolvePlaybackLoadDecision. Implement 10.12–10.17;
replace home/clip play stubs. Mark done when finished. Do not run tests during agent work.
```

## Step 5 — Anonymous, stats, native-cache call sites

- [x] done

**Cursor model:** Opus 4.8

```text
Read and execute .llm/plans/active/mobile-pg7a-queue/05-anonymous-stats-cache.md
Also read details 327–331. Implement master steps 10.18–10.22. Mark done when finished.
Do not run tests during agent work.
```

## Step 6 — E2E queue/playback (final)

- [x] done

**Cursor model:** Codex 5.3

```text
Read and execute .llm/plans/active/mobile-pg7a-queue/06-e2e-queue-playback.md
Also read details 332–334. Implement master steps 10.23–10.25. On this final step, archive
this plan set to .llm/plans/completed/mobile-pg7a-queue/ and end with cumulative operator
verification commands for the whole PG-7a set. Do not run tests during agent work.
```
