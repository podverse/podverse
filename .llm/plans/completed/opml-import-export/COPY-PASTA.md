# OPML Import/Export — Copy-Pasta Prompts

## Execution rules

- **Phases are SEQUENTIAL.** Finish a phase before starting the next.
- **Within a phase, agents marked parallel run simultaneously.**
- Paste a prompt = execute it immediately.
- Do **not** run tests during implementation; each plan lists operator verify commands. The final
  prompt ends with cumulative verification for the whole set.

| Model | Use when |
| ----- | -------- |
| Auto | Docs/status sync, mechanical edits |
| Codex 5.3 | Standard web/mobile/API feature work mirroring existing patterns |
| Opus 4.8 | Schema/migration, MQ job + worker orchestration, cross-cutting resolution logic |

---

## PHASE 1 — Export

### Prompt 01 (foundation)

```
Read and execute .llm/plans/active/opml-import-export/01-export-server.md
Build the server OPML export endpoint + generation lib + shared req helper.
```

**Cursor model:** Codex 5.3 — [x] complete

Then run 02 and 03 in parallel:

### Prompt 02

```
Read and execute .llm/plans/active/opml-import-export/02-export-web.md
Add the web Settings OPML tab with Export.
```

**Cursor model:** Codex 5.3 — [x] complete

### Prompt 03

```
Read and execute .llm/plans/active/opml-import-export/03-export-mobile.md
Consolidate the mobile More OPML row into one screen with Export.
```

**Cursor model:** Codex 5.3 — [x] complete

---

## PHASE 2 — Import foundation (server)

Run 04 and 05 in parallel, then 06.

### Prompt 04

```
Read and execute .llm/plans/active/opml-import-export/04-podcast-index-byfeedurl.md
Add podcastGetByFeedUrl to @podverse/external-services-podcast-index.
```

**Cursor model:** Codex 5.3 — [x] complete

### Prompt 05

```
Read and execute .llm/plans/active/opml-import-export/05-pending-follow-infra.md
Add the pending-follow table, service, and parser resolution hook. Read the linear-migration skills first.
```

**Cursor model:** Opus 4.8 — [x] complete

### Prompt 06 (after 04 + 05)

```
Read and execute .llm/plans/active/opml-import-export/06-import-server-job.md
Build the async OPML import MQ job: OPML parse, 3-tier resolution, Valkey report, endpoints, 50/hr limit.
```

**Cursor model:** Opus 4.8 — [x] complete

---

## PHASE 3 — Import UI (parallel)

### Prompt 07

```
Read and execute .llm/plans/active/opml-import-export/07-import-web.md
Add web OPML import: file picker, upload, poll, report, rate-limit modal.
```

**Cursor model:** Codex 5.3 — [x] complete

### Prompt 08

```
Read and execute .llm/plans/active/opml-import-export/08-import-mobile.md
Add mobile OPML import: expo-document-picker, upload, poll, report, rate-limit modal.
```

**Cursor model:** Codex 5.3 — [x] complete

---

## PHASE 4 — Docs sync

### Prompt 09 (last — end with cumulative verification for the whole set)

```
Read and execute .llm/plans/active/opml-import-export/09-docs-masterplan-sync.md
Update master plan Track 16, web docs, parity table; then archive the plan set to completed/.
```

**Cursor model:** Auto — [x] complete
