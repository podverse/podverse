# Rate-limit env tunable

Make API (and OPML soft-cap) rate limits configurable via env vars with the window baked into
the name (`_PER_MINUTE`, `_PER_10_MINUTES`, `_PER_HOUR`, `_PER_DAY`). Keep today’s numeric
defaults; spell them in `.env.example` even when redundant. Fan shared knobs through
`local_env` overrides so API + workers stay consistent.

## Decisions (recorded)

1. **One env var per action** — value is the max count; window comes from the suffix. No separate
   `*_WINDOW_MS` vars.
2. **Allowed suffixes (fixed set):** `_PER_MINUTE`, `_PER_10_MINUTES`, `_PER_HOUR`, `_PER_DAY`.
   Do not invent free-form durations.
3. **Do not normalize windows** — keep existing 10‑minute and 24‑hour product limits; use
   `_PER_10_MINUTES` / `_PER_DAY` instead of converting to hour/minute.
4. **Defaults in code + examples** — parse helper falls back to a documented default when unset or
   invalid; every knobs appears with that default in `.env.example` / K8s env for clarity.
5. **Soft OPML feed cap stays separate** from HTTP enqueue limits:
   - `OPML_IMPORT_MAX_FEEDS_PER_HOUR` (already exists; soft `rate_limited` outcomes inside a job)
   - `ACCOUNT_OPML_IMPORT_ENQUEUE_MAX_PER_HOUR` (new; HTTP 429 on `POST /account/opml/import`)
6. **local override file:** `dev/env-overrides/local/rate-limit.env.example` → home prepare/link →
   `apply_override` to API env files; OPML soft cap also to workers (same pattern as add-by-rss /
   podcast-index shared keys).
7. **Out of scope:** changing express-rate-limit storage (still in-memory per process); management-api
   (no matching limiters today); web proxy rate limiter (`apps/web` constants).

## Proposed env names (defaults = current hardcoded max)

| Env var | Default | Window |
| ------- | ------- | ------ |
| `AUTH_LOGIN_MAX_PER_MINUTE` | `5` | 1 min (test profile may still raise) |
| `ACCOUNT_CREATE_MAX_PER_10_MINUTES` | `3` | 10 min |
| `ACCOUNT_SEND_VERIFICATION_EMAIL_MAX_PER_10_MINUTES` | `4` | 10 min |
| `ACCOUNT_VERIFY_EMAIL_MAX_PER_10_MINUTES` | `10` | 10 min |
| `ACCOUNT_SEND_CHANGE_EMAIL_MAX_PER_10_MINUTES` | `4` | 10 min |
| `ACCOUNT_VERIFY_EMAIL_CHANGE_MAX_PER_10_MINUTES` | `10` | 10 min |
| `ACCOUNT_SEND_RESET_PASSWORD_EMAIL_MAX_PER_10_MINUTES` | `4` | 10 min |
| `ACCOUNT_RESET_PASSWORD_MAX_PER_10_MINUTES` | `4` | 10 min |
| `ACCOUNT_SET_PASSWORD_MAX_PER_10_MINUTES` | `4` | 10 min |
| `ACCOUNT_DOWNLOAD_DATA_MAX_PER_DAY` | `3` | 1 day |
| `ACCOUNT_OPML_EXPORT_MAX_PER_HOUR` | `10` | 1 hour |
| `ACCOUNT_OPML_IMPORT_ENQUEUE_MAX_PER_HOUR` | `10` | 1 hour |
| `ACCOUNT_ADD_BY_RSS_PARSE_ENQUEUE_MAX_PER_HOUR` | `20` | 1 hour |
| `ACCOUNT_ADD_BY_RSS_CHAPTERS_TRANSCRIPT_MAX_PER_MINUTE` | `30` | 1 min |
| `MQ_RSS_ON_DEMAND_MAX_PER_HOUR` | `20` | 1 hour |
| `OPML_IMPORT_MAX_FEEDS_PER_HOUR` | `50` | already present (API + workers) |

## Plan files

| # | File | Focus |
| - | ---- | ----- |
| 01 | `01-parse-helper.md` | Shared suffix→window parser + unit tests |
| 02 | `02-api-wire-config.md` | API config, routes/controllers, `.env.example`, validation, K8s api.env |
| 03 | `03-workers-opml-soft-cap.md` | Workers config alignment for soft OPML cap; K8s workers.env check |
| 04 | `04-local-env-override.md` | `rate-limit.env.example` + `setup.sh` apply_override + docs |

## Related

- Soft OPML cap + HTTP enqueue already diverge (see `docs/features/OPML.md`).
- Deferred burn-in tests: `.llm/plans/completed/opml-test-hardening/01-http-429-burn-in.md` (will
  benefit once enqueue max is env-tunable).
