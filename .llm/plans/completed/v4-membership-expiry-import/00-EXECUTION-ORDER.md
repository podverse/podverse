# Execution order — v4 membership expiry import

Do not paste a prompt from this set until the v5 database it targets already
has the accounts to match. The rehearsal target is the local database, after
that one account is seeded. Do not point it at alpha. If a prompt is pasted
early, ask that question and stop on "no".

Narrative: [00-master-plan.md](./00-master-plan.md). Prompts: [COPY-PASTA.md](./COPY-PASTA.md).

## Order

| # | File | What the operator does |
| - | ---- | ---------------------- |
| 01 | [01-export-and-dry-run.md](../../completed/v4-membership-expiry-import/01-export-and-dry-run.md) | Build the file, then dry-run. No writes. Done. The file is built. The dry-run command was handed over and has not been run. |
| 02 | [02-apply-import.md](./02-apply-import.md) | Apply, after the dry-run report is accepted. Done at `2026-11-12T05:09:48Z`: created 1, skipped past 1563, unmatched 1373, other counts 0. |

01 finishes before 02 starts. 02 does not start on an unreviewed report.
02 rebuilds the file in that sitting so the five-year cap is not taken from
an older file.

## Rules for the executing agent

1. Read [00-master-plan.md](./00-master-plan.md) and the whole milestone file before acting.
2. Confirm the target v5 accounts already exist. If they do not, stop. Do not
   create them. Do not use alpha.
3. If `billingImportLegacyMembershipExpiry` is missing from `apps/workers`, stop. Do not
   rebuild the command in this set.
4. Do not run the import command. Give the operator the exact command and stop.
5. Do not print email addresses from the export or the report. Counts only.
6. Do not persist the file path. Do not commit the export or the report.
7. Do not create accounts, payment rows, processor records, or `trial` grants.
   Do not set the membership tier. Do not send email.
8. No `any`. No `as` except `as const`. `===` / `!==` only. `import type` on its own line.
   Named exports. Comments describe the code as it stands.
9. Do not run tests, lint, type-check, or builds. Do not run git commands that write.
10. When a milestone is done: tick it in COPY-PASTA.md and move that file to
    `.llm/plans/completed/v4-membership-expiry-import/`. Leave `00-*` and `COPY-PASTA.md`
    in `active/` until 02 is done, then archive the directory.

## Stop rules

- The target v5 accounts do not exist yet, or the target would be alpha.
- The operator has not accepted the dry-run report, and the next step would write.
- The command, the v4 columns, or the grant rules differ from
  [v4 membership carryover](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover)
  or from [00-master-plan.md](./00-master-plan.md).
  Report the difference. Do not invent a second importer.
