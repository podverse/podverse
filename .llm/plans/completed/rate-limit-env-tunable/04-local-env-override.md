# 04 — local_env rate-limit override + docs

## Goal

Add a home-override file so rate-limit knobs can be defined once and applied to the right app
env files via `make local_env_prepare` / `local_env_setup`, matching add-by-rss / podcast-index
patterns.

## Steps

1. Create `dev/env-overrides/local/rate-limit.env.example` containing **all** keys from
   `00-SUMMARY.md` with the documented defaults (quoted). Short header comment: window is encoded
   in the suffix; do not add separate window vars; raising auth limits in production is
   intentional-only.
2. In `scripts/local-env/setup.sh`:
   - After other override blocks, `apply_override` each HTTP rate-limit var to
     `${API_ENV_FILES[@]}` (app + infra API).
   - `apply_override "OPML_IMPORT_MAX_FEEDS_PER_HOUR"` to `${API_AND_WORKERS_ENV_FILES[@]}`
     (shared soft cap).
   - Ensure `load_overrides` picks up `rate-limit.env` (same glob/load path as sibling override
     files — prepare already copies any `*.env.example`).
3. Document in `docs/development/env/LOCAL-ENV-OVERRIDES.md` (or ENV reference if that is the
   index): new `rate-limit.env` purpose and that prepare merges missing keys into home copies.
4. Optional one-liner in `docs/features/OPML.md` pointing operators at
   `ACCOUNT_OPML_IMPORT_ENQUEUE_MAX_PER_HOUR` vs `OPML_IMPORT_MAX_FEEDS_PER_HOUR`.
5. Archive this plan set to `.llm/plans/completed/rate-limit-env-tunable/` when done; mark
   COPY-PASTA complete; update `.llm/plans/active/LLM-PLANS-ACTIVE.md`.

## Key files

- `dev/env-overrides/local/rate-limit.env.example` (new)
- `scripts/local-env/setup.sh`
- `docs/development/env/LOCAL-ENV-OVERRIDES.md`
- `docs/features/OPML.md` (optional cross-link)
- `.llm/plans/active/LLM-PLANS-ACTIVE.md`

## Out of scope

- Implementing burn-in tests (separate `opml-test-hardening` set)
- Changing default numeric values

## Operator verification

```bash
# Root — prepare merges new example keys into ~/.config/podverse/local-env-overrides/
make local_env_prepare
# After link (if needed):
make local_env_setup
# Spot-check generated apps/api/.env and apps/workers/.env contain the rate-limit keys
grep -E 'AUTH_LOGIN_MAX_PER_MINUTE|OPML_IMPORT_MAX_FEEDS_PER_HOUR|ACCOUNT_OPML_IMPORT_ENQUEUE' \
  apps/api/.env apps/workers/.env
```
