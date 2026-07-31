# OPML Test Hardening — Copy-Pasta Prompts

## Execution rules

- Plans are independent; recommended order is 03 → 01 → 02 (see `00-EXECUTION-ORDER.md`).
- Paste a prompt = execute it immediately.
- Do **not** run tests during implementation; each plan lists operator verify commands. The final
  prompt ends with cumulative verification for the whole set.
- If Vitest fails with a missing darwin native binary (e.g. `@rolldown/binding-darwin-arm64`), do
  not run `npm install` autonomously — surface it and have the operator run `npm install`.

| Model | Use when |
| ----- | -------- |
| Codex 5.3 | API/E2E test additions mirroring existing patterns (01, 03) |
| Opus 4.8 | Broker harness + worker integration + dedupe regression (02) |

---

### Prompt 03

```
Read and execute .llm/plans/active/opml-test-hardening/03-opml-counter-reset-e2e-determinism.md
Add a scoped Valkey reset of the OPML hourly counter to the E2E seed and restore a realistic cap.
```

**Cursor model:** Codex 5.3 — [x] complete

### Prompt 01

```
Read and execute .llm/plans/active/opml-test-hardening/01-http-429-burn-in.md
Add API integration coverage for the enqueue rate limiters returning HTTP 429.
```

**Cursor model:** Codex 5.3 — [x] complete

### Prompt 02 (last — end with cumulative verification for the whole set)

```
Read and execute .llm/plans/active/opml-test-hardening/02-artemis-worker-integration.md
Add a broker-backed OPML worker integration test including the requestId dedupe regression, then archive this plan set to completed/.
```

**Cursor model:** Opus 4.8 — [x] complete

---

## Cumulative verification (run after the last prompt)

```bash
make test_deps
make test_deps_mq
npm run test:unit
PODVERSE_RUN_MQ_INTEGRATION=1 npm run test -w apps/workers -- runOpmlImport.integration.test.ts
npm run test:e2e:api
make e2e_test_web_report_spec SPEC=e2e/settings-opml-export.spec.ts
# Mobile Metro / Mobile E2E API up first (apps/mobile/e2e/HOW-TO-RUN.md):
npm run mobile:e2e:test -- opml
```
