# 04 — abcmemory: env-var + local-env conventions

Record the durable guidance so future work stays consistent.

## Tasks

1. Repo-wide principle (prefer env vars via local-env):
   - Add a concise rule (or extend an existing env rule) stating: prefer environment variables over hardcoded values where it makes sense; all apps — including `apps/mobile` — should source local dev env through `make local_env_setup` / `local_env_prepare` / `local_env_link` from a committed `.env.example`, not ad-hoc hardcoded constants or one-off shell exports.
   - Capture the "single source, applied to many files" convention: values shared across apps (e.g. the local API endpoint used by both web and mobile) are defined **once** in a home override (`local_env_prepare` seeds it, `local_env_link` symlinks it) and `setup.sh` applies/derives them into each app's env file via `apply_override` — including platform derivation (mobile Android emulator host `10.0.2.2` vs `localhost`). Do not duplicate a shared value across multiple templates.
   - Keep it short and general; link to [scripts/local-env/setup.sh](/scripts/local-env/setup.sh) and [makefiles/local/Makefile.local.env.mk](/makefiles/local/Makefile.local.env.mk).

2. Update `.cursor/rules/mobile-react-native.mdc`:
   - Mobile env vars must be `EXPO_PUBLIC_*` and referenced as **literals** (`process.env.EXPO_PUBLIC_X`) — never dynamic `process.env[...]` or destructuring (Expo static inlining).
   - `ApiRequestService` base contract: `prefix` no trailing slash + `version` leading slash (`/api` + `/v2` = `/api/v2`).
   - Prefer the base URL env var (with `/api/v2`) as the source of truth; code constants are last-resort fallback only.
   - `@podverse/helpers-config` cannot validate mobile env (dynamic `process.env`); use value-based validators from `@podverse/helpers` + a mobile-local wrapper.

3. Update `.cursor/skills/mobile-expo-monorepo/SKILL.md`:
   - Point to `apps/mobile/.env.example` and `make local_env_setup` as the mobile env source (parity with other apps).
   - Note the shared validation core lives in `@podverse/helpers`.

## Constraints

- Keep abcmemory concise and general (avoid over-specific one-off details); prefer updating existing files over creating many new ones.
- Only edit committed abcmemory source (`.cursor/**`, `.cursorrules`).
- This is the final chunk: after completing, archive the set to `.llm/plans/completed/mobile-env-consistency/` and provide cumulative operator verification commands for the whole set.
