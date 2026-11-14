# COPY-PASTA — v4 pilot findings

Request: [00-REQUEST.md](00-REQUEST.md). Findings: [00-FINDINGS.md](00-FINDINGS.md). Ledger:
[00-SUMMARY.md](00-SUMMARY.md). Phase order and the cumulative verification:
[00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

Run in the `podverse_feature_v4_migration_followups` worktree window, with its `dev:main:all`
watchers stopped or pointed at this worktree.

**Run the set unattended (Root tab):** `./scripts/abcplan/run.sh run v4-pilot-findings`. Every
pending prompt under the first pending heading runs at once.

By hand: one Cursor window per prompt, the model and reasoning on each prompt, Fast off.

Prompts do not run tests. The operator runs the cumulative verification after prompt 11.

## Phase 1

- [ ] **01 — v4 timestamps are UTC regardless of the host timezone**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-pilot-findings/01-utc-timestamps.md

Follow .llm/plans/active/v4-pilot-findings/00-EXECUTION-ORDER.md § Rules for every prompt.
This prompt shares its phase: put the release entry in the final message. Do not run tests. Do not commit.
```

- [ ] **07 — A failed feed parse records why, and the log never prints a page body**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-pilot-findings/07-parse-failure-reasons.md

Follow .llm/plans/active/v4-pilot-findings/00-EXECUTION-ORDER.md § Rules for every prompt.
Migration number 0013. Run make db_regen_linear_baseline after the SQL. This prompt shares its phase: put the release entry in the final message. Do not run tests. Do not commit.
```

- [ ] **10 — An out-of-range time in a feed no longer fails the whole parse**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/v4-pilot-findings/10-duration-overflow.md

Follow .llm/plans/active/v4-pilot-findings/00-EXECUTION-ORDER.md § Rules for every prompt.
This prompt shares its phase: put the release entry in the final message. Do not run tests. Do not commit.
```

## Phase 2

- [ ] **02 — v4 "Only with link" playlists and clips become v5 unlisted**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-pilot-findings/02-unlisted-visibility.md

Follow .llm/plans/active/v4-pilot-findings/00-EXECUTION-ORDER.md § Rules for every prompt.
The copy and replay never write private for a playlist or clip. This prompt shares its phase: put the release entry in the final message. Do not run tests. Do not commit.
```

- [ ] **08 — Permanent feed failures stop early, and the catalog wait has a deadline**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-pilot-findings/08-retry-settle-and-deadline.md

Follow .llm/plans/active/v4-pilot-findings/00-EXECUTION-ORDER.md § Rules for every prompt.
This prompt shares its phase: put the release entry in the final message. Do not run tests. Do not commit.
```

## Phase 3

- [ ] **03 — Add by RSS values that are not feed URLs are skipped, not fatal**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-pilot-findings/03-add-by-rss-non-feed-values.md

Follow .llm/plans/active/v4-pilot-findings/00-EXECUTION-ORDER.md § Rules for every prompt.
Copy, dry run, and verify must count the same feeds. Never log the values. This prompt shares its phase: put the release entry in the final message. Do not run tests. Do not commit.
```

- [ ] **09 — Large v4-subscribed feeds get the higher body limit once**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-pilot-findings/09-oversized-migration-feeds.md

Follow .llm/plans/active/v4-pilot-findings/00-EXECUTION-ORDER.md § Rules for every prompt.
Ordinary v5 parsing stays unchanged. This prompt shares its phase: put the release entry in the final message. Do not run tests. Do not commit.
```

- [ ] **12 — v4 public profiles stay public**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-pilot-findings/12-public-profiles.md

Follow .llm/plans/active/v4-pilot-findings/00-EXECUTION-ORDER.md § Rules for every prompt.
Do not touch verifyAccount.ts or copyAccountLibraryApply.ts. This prompt shares its phase: put the release entry in the final message. Do not run tests. Do not commit.
```

## Phase 4

- [ ] **04 — A playlist follow waits for its playlist instead of being dropped**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-pilot-findings/04-playlist-follow-pending.md

Follow .llm/plans/active/v4-pilot-findings/00-EXECUTION-ORDER.md § Rules for every prompt.
Migration number 0014. Run make db_regen_linear_baseline after the SQL. Append the release entry to release-notes/scratchpad.md. Do not run tests. Do not commit.
```

## Phase 5

- [ ] **05 — Playback rows that point at a clip keep the clip or say why not**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-pilot-findings/05-clip-pointer-playback.md

Follow .llm/plans/active/v4-pilot-findings/00-EXECUTION-ORDER.md § Rules for every prompt.
One clip lookup per account, not per row. Append the release entry to release-notes/scratchpad.md. Do not run tests. Do not commit.
```

## Phase 6

- [ ] **06 — Per-account queue size tier so large v4 histories are kept**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/v4-pilot-findings/06-history-cap-tier.md

Follow .llm/plans/active/v4-pilot-findings/00-EXECUTION-ORDER.md § Rules for every prompt.
Migration number 0015. Run make db_regen_linear_baseline after the SQL. Report the § 6 reader check in the final message. Append the release entry to release-notes/scratchpad.md. Do not run tests. Do not commit.
```

## Phase 7

- [ ] **13 — The left-out email twin's library merges into the kept account**

**Cursor model:** Cursor Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-pilot-findings/13-email-twin-library-merge.md

Follow .llm/plans/active/v4-pilot-findings/00-EXECUTION-ORDER.md § Rules for every prompt.
The merge always lands after the kept account's own copy. Append the release entry to release-notes/scratchpad.md. Do not run tests. Do not commit.
```

## Phase 8

- [ ] **11 — Rehearsal prompt, docs, release entries, and close**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/v4-pilot-findings/11-docs-prompt-and-close.md

Follow .llm/plans/active/v4-pilot-findings/00-EXECUTION-ORDER.md § Rules for every prompt.
Collect every phase-shared release entry. End with the cumulative verification from 00-EXECUTION-ORDER.md. Do not run tests. Do not commit.
```
