# Notifications inbox display — COPY-PASTA

How to use:

1. Select **Cursor model** and **Reasoning** in the Cursor UI (the line above each fence).
1. Copy the fenced block only, paste, and the agent runs it.
1. Tick the box when that prompt is done.

Request and settled review answers: [00-REQUEST.md](./00-REQUEST.md). Ledger, decisions, and the
choices still open (D10–D12): [00-SUMMARY.md](./00-SUMMARY.md). Order and file ownership:
[00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md). The direct-open rows (R10–R13, R23, R24) are a
record with no prompt: [00-DIRECT-OPEN-AUDIT.md](./00-DIRECT-OPEN-AUDIT.md).

**Optional — run the set unattended (Root tab, in this worktree):**
`./scripts/abcplan/run.sh run notifications-inbox-display`. It runs one fresh agent per prompt on
that prompt's model, stops at the first blocker, and resumes with
`./scripts/abcplan/run.sh run notifications-inbox-display --resume 'Your answer.'`. The script
passes `--parallel`, but every phase here holds one prompt, so the prompts run one after another.

Phases run in order; each phase is one prompt.

| Phase | Prompt | Model and reasoning | Why |
| --- | --- | --- | --- |
| 1 | 20 | Cursor Grok 4.7 extra high | Visit state both inboxes and later prompts build on |
| 2 | 21 | Cursor Grok 4.7 medium | Catalog key rename and delete, one guidance rule |
| 3 | 11 | Cursor Grok 4.7 extra high | Shared formatter, Hermes polyfill, new mobile deps, screens 20 and 21 already changed |
| 4 | 10 | Cursor Grok 4.7 extra high | Load-time plural converter every mobile string passes through; closes the set |

Every prompt follows a plan that settles its choices, so none needs Opus 5.5. Fast stays off. If a
Cursor Grok 4.7 prompt stalls or makes the same mistake twice, rerun it one reasoning level higher
(after extra high, **Codex 5.3 · high**), and record the change on the prompt here.

Prompt 11 runs `npm run mobile:install`, which needs the network.

## Phase 1

- [x] **20 — Inbox rows keep their unseen dot for the whole visit (web and mobile)**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/notifications-inbox-display/20-inbox-visit-unread-indicator.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D4, D5).
Opening the inbox still marks every notification seen, and a row that arrives while the inbox is
open is still marked on arrival; keep both. Add no Unread / Earlier groups.
Do not run tests. Append the plan's release scratchpad entry to release-notes/scratchpad.md.
When the plan is done, move 20-inbox-visit-unread-indicator.md to
.llm/plans/completed/notifications-inbox-display/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 2

- [x] **21 — Drop the Unread / Earlier group keys and record the flat-list rule**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

```
Read and execute .llm/plans/active/notifications-inbox-display/21-inbox-drop-group-catalog-keys.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D3, D6).
Plan 20 already edited both inbox screens; anchor edits by symbol, not line number. The catalogs
are large: search the key prefix and edit in place, never rewrite a catalog file. Change
overrides only through npm run i18n:compile.
Do not run tests. The plan has no release scratchpad entry.
When the plan is done, move 21-inbox-drop-group-catalog-keys.md to
.llm/plans/completed/notifications-inbox-display/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 3

- [x] **11 — Notification time line uses Intl.RelativeTimeFormat on mobile, as on web**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/notifications-inbox-display/11-relative-time-intl-formatter.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D1). The plan's
polyfill, key removal, and locale choices (D10–D12 in 00-SUMMARY.md) stand as written.
Plans 20 and 21 already edited both inbox screens and the consumer catalogs; anchor edits by
symbol (InboxNotificationRow, NotificationRow, getRelativeTimeLabel), and search key prefixes in
the catalogs instead of rewriting them. Change overrides only through npm run i18n:compile.
Run npm run mobile:install for the two new mobile dependencies; if it fails for lack of network,
stop and report BLOCKED.
Do not run tests. Append the plan's release scratchpad entry to release-notes/scratchpad.md.
When the plan is done, move 11-relative-time-intl-formatter.md to
.llm/plans/completed/notifications-inbox-display/.
End without a verification block: report what changed, self-check results, any blocker, and
anything a later prompt needs.
```

## Phase 4

- [x] **10 — Mobile renders the shared catalog's ICU plural strings; then archive the set**

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

```
Read and execute .llm/plans/active/notifications-inbox-display/10-mobile-icu-plural-expansion.md
Follow 00-EXECUTION-ORDER.md and the settled answers in 00-REQUEST.md (D2).
Plan 21 already edited the mobile catalogs and plan 11 already edited apps/mobile/vitest.config.ts
and the release scratchpad; edit in place and keep their changes. Search key prefixes in the
catalogs instead of rewriting them. Change overrides only through npm run i18n:compile.
Do not run tests. Append the plan's release scratchpad entry to release-notes/scratchpad.md.

Then close the set. Move 10-mobile-icu-plural-expansion.md to
.llm/plans/completed/notifications-inbox-display/ and confirm plans 11, 20, and 21 are there.
Move 00-REQUEST.md, 00-SUMMARY.md, 00-EXECUTION-ORDER.md, 00-DIRECT-OPEN-AUDIT.md, and
COPY-PASTA.md there, and remove the empty active directory.

End with the cumulative verification for the whole set, assuming no earlier prompt was tested.
One fenced bash block per tab, fish-safe, labeled with the tab name. Tell the operator that
Docker must be running for the web report, and that for the Mobile Maestro block Mobile E2E API
and Mobile E2E iOS or Mobile E2E Android must be running, and Mobile E2E Metro must be restarted
because prompt 11 added two JavaScript dependencies (no native rebuild). Do not put leave-running
commands in the blocks. Note that the root lockfile did not change; only apps/mobile's lockfile
did.

Root:
npm run i18n:validate
npm run build:packages
npm run lint
npm run type-check
npm run type-check:mobile
npm run test -w packages/helpers
npm run test -w apps/web
npm --prefix apps/mobile run test
make e2e_test_web_report_spec SPEC=e2e/notifications-inbox.spec.ts
open .artifacts/e2e-reports/latest/index.html

Mobile Maestro:
npm run mobile:e2e:test -- notifications-inbox,banner-notification,removed-content-log,opml
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

- [ ] **abcaicast** (optional)

After this set, do you want an abcaicast for this work?
