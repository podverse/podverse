# Rate-limit env tunable — Copy-Pasta Prompts

## Execution rules

- Order is **01 → 02 → 03 → 04** (see `00-EXECUTION-ORDER.md`). Do not start 02 until 01 is done.
- Paste a prompt = execute it immediately.
- Do **not** run tests during implementation; each plan lists operator verify commands. The final
  prompt ends with cumulative verification for the whole set.
- Keep product defaults identical to today’s hardcoded maxima (see `00-SUMMARY.md` table).
- Allowed suffixes only: `_PER_MINUTE`, `_PER_10_MINUTES`, `_PER_HOUR`, `_PER_DAY`.
- If Vitest fails with a missing darwin native binary, do not run `npm install` autonomously —
  surface it and have the operator run `npm install`.

| Model | Use when |
| ----- | -------- |
| Codex 5.3 | Helper + unit tests; API/workers wiring; local_env scripts/docs |

---

### Prompt 01

```
Read and execute .llm/plans/active/rate-limit-env-tunable/01-parse-helper.md
Add the shared count-per-window env parse helper and unit tests in @podverse/helpers.
```

**Cursor model:** Codex 5.3 — [x] complete

### Prompt 02

```
Read and execute .llm/plans/active/rate-limit-env-tunable/02-api-wire-config.md
Wire all API HTTP rate limiters to env/config using the helper; update .env.example, validation, and K8s api.env.
```

**Cursor model:** Codex 5.3 — [x] complete

### Prompt 03

```
Read and execute .llm/plans/active/rate-limit-env-tunable/03-workers-opml-soft-cap.md
Align workers OPML soft-cap parsing with the shared helper/config pattern (API+workers shared key only).
```

**Cursor model:** Codex 5.3 — [x] complete

### Prompt 04 (last — end with cumulative verification for the whole set)

```
Read and execute .llm/plans/active/rate-limit-env-tunable/04-local-env-override.md
Add rate-limit.env.example, wire apply_override in local_env setup, update docs, then archive this plan set to completed/.
```

**Cursor model:** Codex 5.3 — [x] complete

---

## Cumulative verification (run after the last prompt)

```bash
npm run build:packages
npm run build -w apps/api
npm run build -w apps/workers
npm run test -w @podverse/helpers
make test_deps
npm run test:e2e:api
make local_env_prepare
```
