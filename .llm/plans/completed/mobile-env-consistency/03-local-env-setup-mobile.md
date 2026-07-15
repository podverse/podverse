# 03 — Wire mobile into `make local_env_setup`

Generate `apps/mobile/.env` from `apps/mobile/.env.example` via the existing local-env pipeline, consistent with other apps.

## Extension points (confirmed)

The pipeline is a fixed manifest (no `apps/*` discovery): [makefiles/local/Makefile.local.env.mk](/makefiles/local/Makefile.local.env.mk) + [scripts/local-env/setup.sh](/scripts/local-env/setup.sh).

## Tasks

1. `makefiles/local/Makefile.local.env.mk`:
   - Add `apps/mobile/.env` to the `local_env_setup:` prerequisite list.
   - Add a copy rule:
     ```makefile
     apps/mobile/.env:
     	@echo "Missing: $@"
     	@echo "Copying from example file"
     	cp ./apps/mobile/.env.example ./$@
     ```
   - Add `apps/mobile/.env` to the `local_env_clean` `rm -f` list.

2. `scripts/local-env/setup.sh`:
   - Add `MOBILE_APP_ENV="apps/mobile/.env"` near the other app env path vars.
   - Fill the mobile API base URL(s) using the same host/port helpers used for other apps (Docker vs localhost), producing values that include `/api/v2`. Use `upsert_var` so quoting matches (`KEY="value"`).
   - Keep mobile values sensible defaults for local dev; do not require secrets.

3. Shared API endpoint via a single home override (primary path — supports `local_env_prepare` / `local_env_link`):
   - Web and mobile reach the same logical local API, so define it once and derive both. Add/extend a home override (e.g. `dev/env-overrides/local/api.env.example` with `LOCAL_API_PROTOCOL`, `LOCAL_API_HOST`, `LOCAL_API_PORT`, `LOCAL_API_PREFIX`, `LOCAL_API_VERSION`) so `local_env_prepare` seeds it in `~/.config/podverse/local-env-overrides/` and `local_env_link` symlinks it.
   - In `setup.sh`, source that override and use `apply_override` (and platform derivation) to write:
     - web sidecar: `NEXT_PUBLIC_API_HOST` / `_PORT` / `_PROTOCOL` / `_PREFIX` / `_VERSION`
     - mobile: `EXPO_PUBLIC_MOBILE_API_BASE_URL_IOS` (host as-is / `localhost`) and `_ANDROID` (host rewritten to `10.0.2.2` for the emulator), each including `/api/v2`.
   - This is the "set once, applied consistently to many files" convention. Keep defaults working with no override present (fallback to current localhost:4230 dev values).
   - Register the new override in `prepare-overrides.sh` / `link-overrides.sh` lists if those enumerate override files explicitly.

4. Verify Expo picks it up: with `apps/mobile/.env` present, `npm run mobile:dev` should read `EXPO_PUBLIC_MOBILE_*` without shell exports. `dev-e2e.sh` exports remain as E2E overrides.

5. Update `apps/mobile/e2e/TEST-ENV.md` and `APPS-MOBILE.md` briefly: mobile env now comes from `make local_env_setup` (like other apps), with `dev-e2e.sh` overriding for E2E.

## Constraints

- `.env.example` must exist first (from chunk 2). Copy rules skip if `apps/mobile/.env` already exists.
- Follow env-file-formatting (double-quoted non-empty; bare `KEY=` for empty).
- Do not run tests during agent work; end with operator verification commands (e.g. `make local_env_setup` then confirm `apps/mobile/.env`).
