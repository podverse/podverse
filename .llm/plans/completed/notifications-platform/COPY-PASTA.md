# COPY-PASTA — notifications-platform

Run prompts **01 → 08** in order. Each prompt: read its plan file, implement, check the box. **Do not
run tests during agent work** unless the plan step says otherwise.

**Ship bar:** In-app notification feed with global unseen state, generic scheduling, membership-expiry
reminder (7 days), admin compose/schedule, web bell + page, mobile Notifications tab (RSS folded into
Library), expanded per-category prefs.

**Locked:** Per-user `account_notification` rows; 1-month retention; daily purge also removes terminal
`scheduled_job` rows (`completed`/`cancelled`/`failed`, `updated_at` older than 1 month); `notifications_last_seen_at`
global seen; `scheduled_job` + CronJob; push when pref + valid membership + `allow_notifications`.
Dual env: local = on-demand worker CLI; K8s = base CronJobs (see `00-SUMMARY.md` matrix + step 08).

Follow **linear-sql-greenfield-only**, **api-testing**, **e2e-page-tests**, **mobile-e2e-screenshots**,
**feature-implementation-testing**.

| Step | Cursor model | Reasoning |
| ---- | ------------ | --------- |
| 01 Foundation DB | Codex 5.3 | high |
| 02 Scheduling | Codex 5.3 | high |
| 03 API | Codex 5.3 | medium |
| 04 Send integration | Codex 5.3 | high |
| 05 Management admin | Codex 5.3 | medium |
| 06 Web UI | Codex 5.3 | medium |
| 07 Mobile | Codex 5.3 | medium |
| 08 Ops local + K8s | Codex 5.3 | medium |

---

## Step 01 — Foundation DB/domain

- [x] done

**Cursor model:** Codex 5.3
**Reasoning:** high

```text
Read and execute .llm/plans/active/notifications-platform/01-foundation-db-domain.md
Implement phase 01 only. Mark COPY-PASTA step 01 done when finished. Do not run tests during agent work.
```

---

## Step 02 — Scheduling system (workers)

- [x] done

**Cursor model:** Codex 5.3
**Reasoning:** high

```text
Read and execute .llm/plans/active/notifications-platform/02-scheduling-system-workers.md
Prerequisite: step 01 complete. Mark COPY-PASTA step 02 done when finished. Do not run tests during agent work.
```

---

## Step 03 — API notifications & preferences

- [x] done

**Cursor model:** Codex 5.3
**Reasoning:** medium

```text
Read and execute .llm/plans/active/notifications-platform/03-api-notifications-and-prefs.md
Prerequisites: steps 01–02 complete. Mark COPY-PASTA step 03 done when finished. Do not run tests during agent work.
```

---

## Step 04 — Send integration (parser & push)

- [x] done

**Cursor model:** Codex 5.3
**Reasoning:** high

```text
Read and execute .llm/plans/active/notifications-platform/04-send-integration-parser-push.md
Prerequisites: steps 01 and 03 complete. Mark COPY-PASTA step 04 done when finished. Do not run tests during agent work.
```

---

## Step 05 — Management admin notifications

- [x] done

**Cursor model:** Codex 5.3
**Reasoning:** medium

```text
Read and execute .llm/plans/active/notifications-platform/05-management-admin-notifications.md
Prerequisites: steps 01–03 complete (02 for job handler). Mark COPY-PASTA step 05 done when finished. Do not run tests during agent work.
```

---

## Step 06 — Web notifications UI

- [x] done

**Cursor model:** Codex 5.3
**Reasoning:** medium

```text
Read and execute .llm/plans/active/notifications-platform/06-web-notifications-ui.md
Prerequisite: step 03 complete. Mark COPY-PASTA step 06 done when finished. Do not run tests during agent work.
```

---

## Step 07 — Mobile tabs & notifications inbox

- [x] done

**Cursor model:** Codex 5.3
**Reasoning:** medium

```text
Read and execute .llm/plans/active/notifications-platform/07-mobile-tabs-and-notifications.md
Prerequisite: step 03 complete. Mark COPY-PASTA step 07 done when finished. Do not run tests during agent work.
```

---

## Step 08 — Ops: local + K8s dual environments (final)

- [x] done

**Cursor model:** Codex 5.3
**Reasoning:** medium

```text
Read and execute .llm/plans/active/notifications-platform/08-ops-local-and-k8s.md
Prerequisites: steps 01–02 complete (prefer after 05 for admin schedule notes). Mark COPY-PASTA step 08 done when finished.
Then archive this plan set per 00-EXECUTION-ORDER.md. Do not run tests during agent work.
```

---

## After all complete (operator)

**Root:**

```bash
npm run build:packages
npm run lint
npm run test:unit
make test_deps
npm run test:e2e:api
```

**Workers** (local scheduling smoke):

```bash
npm run build -w apps/workers
npm run scheduled_jobs_run_due -w apps/workers -- -dry-run
npm run notifications_platform_purge -w apps/workers
```

**Web** (Dev or one-shot):

```bash
make e2e_test_web_report_spec SPEC=e2e/notifications-inbox.spec.ts
open .artifacts/e2e-reports/latest/web/index.html
```

**Management-web:**

```bash
make e2e_test_management_web_report_spec SPEC=e2e/admin-notifications.spec.ts
open .artifacts/e2e-reports/latest/management-web/index.html
```

**Mobile** — leave-running **Mobile Metro** (`npm run mobile:dev:e2e`), **Mobile E2E API**, **Mobile
iOS** / **Mobile Android** per HOW-TO-RUN.

**Mobile Maestro:**

```bash
npm run mobile:e2e:test -- notifications-inbox
npm run mobile:e2e:test -- settings-select
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

**Database baseline** (if step 01 requested linear SQL):

```bash
make db_regen_linear_baseline
make db_verify_linear_baseline
```

Commit regenerated `0004_app_linear_baseline.sql.gz` with the PR.
