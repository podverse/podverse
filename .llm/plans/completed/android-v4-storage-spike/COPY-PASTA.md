# COPY-PASTA — Android v4 storage spike

Request: [00-REQUEST.md](00-REQUEST.md). Ledger: [00-SUMMARY.md](00-SUMMARY.md). Order:
[00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

Run this set on its own, after the sample rehearsal is finished or while that rehearsal is not
running. One prompt per phase. They share the emulator and `apps/mobile/app.config.ts`.

**Optional — run the set unattended (Root tab):**
`node ../plan-runner/run-plan-set.mjs android-v4-storage-spike`. It stops at the first blocker; see the
plan-runner README to resume.

By hand: one Cursor window, **Opus 5.5**, Fast off, the reasoning on each prompt.

Neither prompt asks for a test command. After prompt 02, read
`FINDINGS.md` in the completed set. Leave doc 08 unchanged until that review.

## Phase 1

- [ ] **01 — v4 Android baseline**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/android-v4-storage-spike/01-v4-android-baseline.md

Follow .llm/plans/active/android-v4-storage-spike/00-EXECUTION-ORDER.md § Rules for every prompt.
Do not install v5. Do not uninstall com.podverse. Do not edit ../podverse-rn. Do not commit.
```

## Phase 2

- [ ] **02 — v5 in-place read**

**Cursor model:** Opus 5.5 · **Reasoning:** high

```
Read and execute .llm/plans/active/android-v4-storage-spike/02-v5-inplace-read.md

Follow .llm/plans/active/android-v4-storage-spike/00-EXECUTION-ORDER.md § Rules for every prompt.
Install over the v4 app. Do not uninstall. Restore android.package to com.podverse.app.next
before you finish. Do not edit doc 08. Do not commit. Move the set to completed after the revert.
```
