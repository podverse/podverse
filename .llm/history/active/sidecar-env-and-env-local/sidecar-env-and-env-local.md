# Sidecar .env and .env.local only RUNTIME_CONFIG_URL

**Started**: 2026-03-17  
**Context**: Plan: sidecar_own_env_and_env.local_only_runtime_config_url. Restrict .env.local to
only RUNTIME_CONFIG_URL; give sidecars their own .env in sidecar dir; update Make, setup.sh,
package.json.

---

### Session 1 - 2026-03-17

#### Prompt (Developer)

Implement the plan as specified... Do NOT edit the plan file itself. To-do's from the plan have
already been created. Do not create them again. Mark them as in_progress as you work... Don't stop
until you have completed all the to-dos.

#### Key Decisions

- WEB_ENV_FILES_APP_AND_SIDECAR and MANAGEMENT_WEB_ENV_FILES_APP_AND_SIDECAR now contain only
  sidecar infra env paths (no .env.local), so all overrides (brand, locale, lightning, VAPID,
  socials, signup mode) go only to infra sidecar env files.
- Brand block: removed upsert_var to WEB_APP_ENV for NEXT_PUBLIC_BRAND_NAME and
  NEXT_PUBLIC_PROXY_USER_AGENT; VAPID block: removed upsert to WEB_APP_ENV for
  NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY.
- End of setup.sh: overwrite .env.local with only RUNTIME_CONFIG_URL (comment + var) via printf;
  then cp infra sidecar env to apps/web/sidecar/.env and apps/management-web/sidecar/.env so npm
  run dev:sidecar loads sidecar/.env.
- Makefile: added apps/web/sidecar/.env and apps/management-web/sidecar/.env to local_env_clean
  and local_env_setup deps; added two targets that create them from sidecar/.env.example when
  missing.
- package.json dev:sidecar: DOTENV_CONFIG_PATH changed from .env.local to sidecar/.env for both
  web and management-web.
- management-web .env.example: fixed comment to reference apps/management-web/sidecar/.env.example.

#### Files Created/Modified

- scripts/local-env/setup.sh
- makefiles/local/Makefile.local.env.mk
- apps/web/package.json
- apps/management-web/package.json
- apps/management-web/.env.example

### Session 2 - 2026-03-17

#### Prompt (Developer)

check if any documentation or skills or rules or agents need to be updated due to your env related changes

#### Key Decisions

- QUICKSTART.md: clarified .env.local vs sidecar/.env in intro, Pre-configured Files table, and Infrastructure Config (web.env/management-web.env = main container RUNTIME_CONFIG_URL only; added web-sidecar.env and management-web-sidecar.env); fixed sidecar deploy-time reference from apps/web/env/ to apps/web/sidecar/.env.example and apps/management-web/sidecar/.env.example.
- LOCAL-ENV-OVERRIDES.md: added "Web and Management Web env file split" subsection describing setup writing only RUNTIME_CONFIG_URL to .env.local and copying full sidecar env to sidecar/.env.
- AGENTS.md: added bullet under Environment File Formatting for web/management-web .env.local (only RUNTIME_CONFIG_URL) and sidecar/.env.
- Skills (lighthouse-env-alignment, env-file-formatting): no changes needed; they do not assume combined vars in .env.local or sidecar loading .env.local.

#### Files Created/Modified

- docs/QUICKSTART.md
- docs/development/LOCAL-ENV-OVERRIDES.md
- AGENTS.md
- .cursor/skills/web/04-configuration.md (note that .env.local is only RUNTIME_CONFIG_URL and sidecar uses sidecar/.env)

### Session 3 - 2026-03-17

#### Prompt (Developer)

all the .env and .env.local files that do NOT appear in infra/config/local/ should NOT use docker container names for host env vars because those files are intended to only be used with the npm run dev commands

#### Key Decisions

- App-level .env and .env.local (and sidecar .env) are for npm run dev only; they must use localhost for host vars, not Docker container names (e.g. podverse_local_api).
- Sidecar .env.example and app sidecar .env: NEXT_PUBLIC_SSR_API_HOST set to "localhost". Infra config/local sidecar env files keep Docker hostnames for Compose.
- Setup script: no longer copies infra sidecar env into apps/web/sidecar/.env and apps/management-web/sidecar/.env. App sidecar is created from .env.example (localhost) and receives same overrides (brand, locale, VAPID, etc.) as infra; setup explicitly upserts localhost for NEXT_PUBLIC_SSR_API_HOST in app sidecar only.
- WEB_APP_SIDECAR_ENV and MANAGEMENT_WEB_APP_SIDECAR_ENV added; WEB_ENV_FILES_APP_AND_SIDECAR and MANAGEMENT_WEB_ENV_FILES_APP_AND_SIDECAR now include app sidecar so overrides apply to both infra and app sidecar. Brand and VAPID blocks updated to write to both via the arrays.

#### Files Created/Modified

- apps/web/sidecar/.env.example
- apps/management-web/sidecar/.env.example
- apps/web/sidecar/.env
- apps/management-web/sidecar/.env
- scripts/local-env/setup.sh
- docs/development/LOCAL-ENV-OVERRIDES.md
