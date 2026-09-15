# mobile-p2-playback-reconciliation — COPY-PASTA

Paste one prompt at a time, in order. Select the **Cursor model** and **Reasoning** shown above each
block before pasting — those lines are for you, not for the agent.

Run order and which prompts may overlap: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).
Locked decisions: [00-SUMMARY.md](00-SUMMARY.md).

Agents do not run tests during implementation. Each response ends with commands for you to run; the
cumulative set for the whole plan arrives with prompt 09.

This set covers **both** master steps: P2.4.11 (prompts 01–07) and P2.4.12 (prompt 08).

---

## [x] 01 — Shared contract and helpers

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-playback-reconciliation/01-shared-contract-and-helpers.md

Follow the locked decisions in 00-SUMMARY.md and detail 743. Pure types and functions in
@podverse/helpers only — do not wire any consumer. Do not run tests or lint; end with the
commands for me to run.
```

---

## [x] 02 — SQL migration and ORM

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-playback-reconciliation/02-sql-and-orm.md

Follow the locked decisions in 00-SUMMARY.md and detail 743. The backfill preserving existing
history ordering is the deliverable, not cleanup. Do not hand-edit the generated baseline .gz
files. Do not run tests or lint; end with the commands for me to run, including the baseline
regeneration step.
```

---

## [x] 03 — API endpoints

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-playback-reconciliation/03-api-endpoints.md

Follow the locked decisions in 00-SUMMARY.md and detail 743. No clamping logic in apps/api — that
lives in the ORM boundary from prompt 02. Keep OpenAPI in sync. Do not run tests or lint; end with
the commands for me to run.
```

---

## [x] 04 — Web timestamped writes

**Cursor model:** Codex 5.3 · **Reasoning:** medium

May run in parallel with 05.

```text
Read and execute .llm/plans/active/mobile-p2-playback-reconciliation/04-web-timestamped-writes.md

Follow the locked decisions in 00-SUMMARY.md and detail 743. Use isMeaningfulPlaybackEvent from
@podverse/helpers rather than a local check. No visual change is intended. Do not run tests or
lint; end with the commands for me to run.
```

---

## [x] 05 — Mobile playback outbox

**Cursor model:** Opus 5 · **Reasoning:** high

May run in parallel with 04.

```text
Read and execute .llm/plans/active/mobile-p2-playback-reconciliation/05-mobile-playback-outbox.md

Follow the locked decisions in 00-SUMMARY.md and detail 743. Storage and repository only — do not
touch PlaybackProvider, which is prompt 06. A zone move must never emit a removal tombstone. Do
not run tests or lint; end with the commands for me to run.
```

---

## [x] 06 — Mobile position writes

**Cursor model:** Opus 5 · **Reasoning:** high

```text
Read and execute .llm/plans/active/mobile-p2-playback-reconciliation/06-mobile-position-writes.md

Follow the locked decisions in 00-SUMMARY.md and detail 743. Keep event classification in a pure
module; do not grow PlaybackProvider effects. The durable outbox write happens before any network
attempt, never conditionally on failure. Do not run tests or lint; end with the commands for me
to run.
```

---

## [x] 07 — Mobile reconnect merge

**Cursor model:** Opus 5 · **Reasoning:** extra high

```text
Read and execute .llm/plans/active/mobile-p2-playback-reconciliation/07-mobile-reconciliation-merge.md

Follow the locked decisions in 00-SUMMARY.md and detail 743. Write the merge as a pure function
with the 06:00 / 07:00 / 08:00 scenario as a table-driven test before wiring anything. This prompt
resolves data only — return a different-item now-playing conflict as data and change nothing the
user sees; prompt 08 owns the choice. Never load a different item while playback is active. Do not
run tests or lint; end with the commands for me to run.
```

---

## [x] 08 — Multi-device handoff prompt

**Cursor model:** Opus 5 · **Reasoning:** high

This is master step **P2.4.12**. Needs 04 and 07 both done.

```text
Read and execute .llm/plans/active/mobile-p2-playback-reconciliation/08-mobile-multi-device-handoff.md

Follow detail 744 and the locked decisions in 00-SUMMARY.md. Prompt only when the item differs —
the same item at a different position adopts the newer position silently, with no threshold and no
dedicated code path. The comparison lives once in @podverse/helpers and both clients call it. Ship
web and mobile together. Do not run tests or lint; end with the commands for me to run.
```

---

## [x] 09 — Tests, E2E, abcmemory, and status

**Cursor model:** Codex 5.3 · **Reasoning:** medium

```text
Read and execute .llm/plans/active/mobile-p2-playback-reconciliation/09-tests-e2e-and-abcmemory.md

Follow the locked decisions in 00-SUMMARY.md and details 743 and 744. This is the last prompt: flip
both P2.4.11 and P2.4.12 to done, and move this plan set to .llm/plans/completed/ rather than
deleting it. Do not run tests or lint; end with the cumulative verification commands for the whole
plan set.
```
