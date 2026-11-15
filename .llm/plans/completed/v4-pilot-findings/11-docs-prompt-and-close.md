# 11 — Rehearsal prompt, docs, release entries, and close

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

## Rows

R11, and the release entries of every prompt that shared a phase

## Runs after

01–10, 12, 13. Runs alone, last.

## Files

- `.cursor/prompts/v4-full-local-migration-rehearsal.md`
- `docs/proposals/v4-to-v5-migration/16-full-local-migration-rehearsal.md`
- `docs/proposals/v4-to-v5-migration/15-near-term-rehearsal-checklist.md` (only the job-loop and replay steps)
- `release-notes/scratchpad.md`
- `.llm/plans/active/v4-pilot-findings/` → `.llm/plans/completed/v4-pilot-findings/` (**plan-completion**)

## 1. Rehearsal prompt

In `.cursor/prompts/v4-full-local-migration-rehearsal.md`, the bullet "Do not start
`scheduled_jobs_run_due`. Do not add a timeout. The catalog wait is allowed to run for days." is
wrong: migration feed retries run only through that loop. Replace it with:

- Start the scheduled job loop in the background (**Workers**) beside the parsers, after
  `rehearsal restore=finished`, and record its pid. Restart it on the same rule as the parsers.
  It claims at most 100 due jobs per pass, so run it in a loop. In the agent's shell:
  `while true; do npm run scheduled_jobs_run_due -w apps/workers -- -limit 100; sleep 60; done`.
  When handing it to the operator, give the fish form:
  `while true; npm run scheduled_jobs_run_due -w apps/workers -- -limit 100; sleep 60; end`.
- The catalog wait ends when nothing is waiting or after `--catalog-wait-hours` (default 24).
  Pass a smaller value for pilot when the operator asks. Do not add any other timeout.
- After the run, keep the job loop running and rerun `v4_replay_legacy_rows` for the run's
  accounts until no `waiting_parse` rows remain or the retries have all settled.

Also add `TZ=UTC` to the reasons a rehearsal refuses to start (plan 01), and the catalog summary's
"parse failures by reason" table to what the agent reads.

## 2. Doc 16

Add a section "Pilot `20261114T034901Z`" with counts only: the phase results, F1–F13 in a
sentence each with the plan that closed it, the outlier profiles from 00-FINDINGS F12 without
ids, and the full-scale numbers in F13. Name the decisions from 00-SUMMARY § Settled decisions,
including Q1 (merge twins) and Q2 (copy the public profile flag). Never copy an id other than
`eFv5NFx`, an email, a feed URL, or any feed or page text.

## 3. Release entries

Append, in plan order, every "Release notes entry" from the final messages of prompts that shared
a phase (01, 02, 03, 07, 08, 09, 10, 12), read from `.artifacts/plan-runner/v4-pilot-findings/`.
Keep entries 04, 05, 06, and 13 that those prompts already wrote. Do not edit another entry.

## 4. Close

Move the set to `.llm/plans/completed/v4-pilot-findings/` per **plan-completion**. Leave
`00-FINDINGS.md` in the moved folder.

## Tests

None. This prompt gives the cumulative verification from `00-EXECUTION-ORDER.md` in its final
message.

## Release scratchpad

None for docs and prompts.
