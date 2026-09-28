# Execution order — v4 membership expiry import

Parked. Do not paste a prompt from this set until the operator says the v4 to v5 account
migration is underway. If a prompt is pasted early, ask that question and stop on "no".

Narrative: [00-master-plan.md](./00-master-plan.md). Prompts: [COPY-PASTA.md](./COPY-PASTA.md).

## Order

| # | File | What the operator does |
| - | ---- | ---------------------- |
| 01 | [01-export-and-dry-run.md](./01-export-and-dry-run.md) | Export, then dry-run. No writes. |
| 02 | [02-apply-import.md](./02-apply-import.md) | Apply, after the dry-run report is accepted. |

01 finishes before 02 starts. 02 does not start on an unreviewed report.

## Rules for the executing agent

1. Read [00-master-plan.md](./00-master-plan.md) and the whole milestone file before acting.
2. Confirm v5 accounts already exist for the migrated emails. If they do not, stop.
3. If `billingImportLegacyMembershipExpiry` is missing from `apps/workers`, stop. Do not
   rebuild the command in this set.
4. Do not run the import command. Give the operator the exact command and stop.
5. Do not print email addresses from the export or the report. Counts only.
6. Do not persist the file path. Do not commit the export or the report.
7. Do not create accounts, payment rows, or processor subscriptions. Do not send email.
8. No `any`. No `as` except `as const`. `===` / `!==` only. `import type` on its own line.
   Named exports. Comments describe the code as it stands.
9. Do not run tests, lint, type-check, or builds. Do not run git commands that write.
10. When a milestone is done: tick it in COPY-PASTA.md and move that file to
    `.llm/plans/completed/v4-membership-expiry-import/`. Leave `00-*` and `COPY-PASTA.md`
    in `active/` until 02 is done, then archive the directory.

## Stop rules

- The account migration is not underway.
- The operator has not accepted the dry-run report, and the next step would write.
- The command, the v4 columns, or the grant rules differ from
  [v4 membership carryover](/docs/billing/BILLING-OPERATIONS.md#v4-membership-carryover).
  Report the difference. Do not invent a second importer.
