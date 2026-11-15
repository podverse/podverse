# COPY-PASTA — Add by RSS directory match

Request: [00-REQUEST.md](00-REQUEST.md). Ledger: [00-SUMMARY.md](00-SUMMARY.md). Phase order and
the cumulative verification: [00-EXECUTION-ORDER.md](00-EXECUTION-ORDER.md).

## How to use

**Run the set unattended (Root tab):** `./scripts/abcplan/run.sh run add-by-rss-directory-match`.
It runs one prompt per phase, in order, and stops at the first blocker; resume with
`./scripts/abcplan/run.sh run add-by-rss-directory-match --resume 'Your answer.'` (`/abcresume`
gives the ready-made commands).

To run by hand instead: one Cursor window on this checkout, **Cursor Grok 4.7**, Fast off, the
reasoning shown on each prompt. Paste a prompt, wait until it finishes, then the next.

Prompts do not run tests. The operator runs the cumulative verification after prompt 06.

## Phase 1

- [x] **01 — Public Add by RSS directory match route**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/add-by-rss-directory-match/01-match-route.md

Follow .llm/plans/active/add-by-rss-directory-match/00-EXECUTION-ORDER.md § Rules for every prompt.
Append your scratchpad entry. Do not run tests. Do not commit.
```

## Phase 2

- [x] **02 — Convert an account's Add by RSS follow**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/add-by-rss-directory-match/02-account-conversion.md

Follow .llm/plans/active/add-by-rss-directory-match/00-EXECUTION-ORDER.md § Rules for every prompt.
The conversion is one transaction; queue and owned playlist rows move by guid, then enclosure URL.
Append your scratchpad entry. Do not run tests. Do not commit.
```

## Phase 3

- [x] **03 — Mobile signed-out promotion**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/add-by-rss-directory-match/03-mobile-signed-out-promotion.md

Follow .llm/plans/active/add-by-rss-directory-match/00-EXECUTION-ORDER.md § Rules for every prompt.
Confirm the table list in section 1 against schema.ts before writing the remap. A failed match
request must never stop the device parse. Append your scratchpad entry. Do not run tests.
```

## Phase 4

- [x] **04 — Mobile signed-in promotion**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/add-by-rss-directory-match/04-mobile-signed-in-promotion.md

Follow .llm/plans/active/add-by-rss-directory-match/00-EXECUTION-ORDER.md § Rules for every prompt.
Conversion runs before the membership check. Append your scratchpad entry. Do not run tests.
```

## Phase 5

- [x] **05 — Web add and refresh**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/add-by-rss-directory-match/05-web-promotion.md

Follow .llm/plans/active/add-by-rss-directory-match/00-EXECUTION-ORDER.md § Rules for every prompt.
Append your scratchpad entry. Do not run tests. Do not commit.
```

## Phase 6

- [x] **06 — Docs and close (last)**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/add-by-rss-directory-match/06-docs-and-close.md

Follow .llm/plans/active/add-by-rss-directory-match/00-EXECUTION-ORDER.md § Rules for every prompt.
Archive the set, then end with the cumulative verification from 00-EXECUTION-ORDER.md exactly as
written, with its tab labels.
```
