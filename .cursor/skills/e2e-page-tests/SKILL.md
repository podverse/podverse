---
name: e2e-page-tests
description: When layout, functionality, or conditions change in apps/web or apps/management-web, add or update the corresponding E2E (Playwright) test so page behavior stays covered.
version: 1.0.0
---

# E2E Page Tests (Web and Management-Web)

Testing requirement policy lives in **feature-implementation-testing**. This skill focuses on **how** to add or update E2E coverage for web and management-web changes.

Current E2E bar: **Confident**. Use this skill when you change **layout**, **functionality**, or **conditions** in `apps/web` or `apps/management-web`. Always add or update an E2E test so the change is covered. **Updating E2E tests is required for functional changes to web or management-web; it must not be treated or listed as optional.**

## When to add or update a test

- **Layout changes** — New or moved sections, nav, headings, or structure.
- **Functionality changes** — New or changed forms, buttons, links, or user flows.
- **Condition changes** — New or changed redirects, auth guards, visibility rules, or error/empty states.
- **Membership-state changes** — New or changed membership-gated features, trial restrictions, or premium-only behavior.

For CRUD flows, also apply **e2e-crud-state-matrix**. For membership-gated pages, apply **e2e-membership-state-matrix** and **e2e-authz-matrix**. For query-param state, apply **e2e-url-state-contracts**. For test readability, apply **e2e-readability**.

**End your response with exact E2E verification commands.** See **response-ending-make-verify**.

## Membership-state testing

Many Podverse features behave differently based on membership state. When testing membership-gated features:

- Use the seed accounts for each membership state (unauthenticated, expired/none, active trial, active basic).
- Assert the correct behavior per state: redirect to login (unauthenticated), upsell/blocked (expired/none), available with trial restrictions (active trial), full access (active basic).
- See **e2e-membership-state-matrix** for the full process and matrix template.

## Deterministic outcome policy (required)

- Each E2E test must have **one deterministic expected outcome**.
- **No dual-condition tests.** Do not write a test that accepts "either outcome A or outcome B."
- A test should fail when the non-target behavior appears.

## Where tests live

| App                 | Specs directory            | Config                                     |
| ------------------- | -------------------------- | ------------------------------------------ |
| apps/web            | `apps/web/e2e/`            | `apps/web/playwright.config.ts`            |
| apps/management-web | `apps/management-web/e2e/` | `apps/management-web/playwright.config.ts` |

- **Ports:** Web E2E uses API 4030, sidecar 4031, web 4032. Management-web uses management-api 4130, sidecar 4131, web 4132. No overlap with Metaboost (401x/411x) or dev ports.
- **Seed data:** Use deterministic E2E seed (`make e2e_seed`). See `tools/web/seed-e2e.mjs` and `tools/management-web/seed-e2e.mjs`.

## Timeout increases are almost never the fix

Do not resolve failing tests by increasing timeouts. Fix root cause first: add explicit destination-load verification, assert specific success/error states, use deterministic setup data.

## Quick reference

- **Run E2E (web only):** `make e2e_test_web`
- **Run E2E (management-web only):** `make e2e_test_management_web`
- **Run E2E (both):** `make e2e_test`
- **Scoped web report:** `make e2e_test_web_report_spec SPEC=e2e/<spec>.spec.ts`
- **Scoped management-web report:** `make e2e_test_management_web_report_spec SPEC=e2e/<spec>.spec.ts`
- **Full report suite:** `make e2e_test_report`
- **Prerequisites:** `make test_deps` (DB + Valkey), apps must be built.
