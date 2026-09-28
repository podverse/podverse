# v4 membership expiry import — COPY-PASTA

**Parked.** Do not paste these prompts until the v4 to v5 account migration is underway
and v5 already has the migrated emails. This set loads membership expiry only.

How to use, once that migration has started:

1. Select **Cursor model** and **Reasoning** in the Cursor UI (line above each fence).
2. Copy the fenced block only → paste → agent executes.
3. Tick the checkbox when that prompt is done; move the numbered plan to `completed/`.
4. Prompt 01 pauses for the export path. Reply with the path (or `skip`). The same prompt
   continues. The path is not saved.
5. Prompt 02 starts only after you accept the dry-run report.

Locked decisions: [00-master-plan.md](./00-master-plan.md). Order:
[00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md).

## Model per prompt

| Prompt | Cursor model | Reasoning | Why this tier |
| ------ | ------------ | --------- | ------------- |
| 01 | Cursor Grok 4.7 | high | Production export; counts only, no emails in the reply |
| 02 | Cursor Grok 4.7 | high | Gives the write command and does not run it |

If a **Cursor Grok 4.7** prompt stalls or makes the same mistake twice, rerun it on
**Codex 5.3**.

## Prompts

- [ ] **01 — Export and dry-run** — **Asks for a value:** export file path (not persisted)

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-membership-expiry-import/01-export-and-dry-run.md
Follow 00-EXECUTION-ORDER.md. If the v4 to v5 account migration is not underway, stop.
Explain the export, ask for the file path, and stop that turn. Do not persist the path.
Do not run the import. Do not print emails.
Do not run tests during agent work; end with the plan's operator commands.
```

- [ ] **02 — Apply the import** (after 01, and only after the dry-run report is accepted)

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

```
Read and execute .llm/plans/active/v4-membership-expiry-import/02-apply-import.md
Follow 00-EXECUTION-ORDER.md. Do not run the import. Give the operator the write
command and stop. Do not print emails. Do not create accounts or payment rows.
Do not run tests during agent work; end with the plan's operator commands.
When this prompt is done, archive the whole v4-membership-expiry-import directory
to completed/.
```
