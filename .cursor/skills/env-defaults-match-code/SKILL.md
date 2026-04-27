---
name: env-defaults-match-code
description: Env vars with code fallbacks must show the default in .env.example and K8s env files. Use when adding or editing env vars that have fallback values in code.
---

# Env defaults match code

## When to use

When adding or editing environment variables that have fallback defaults in code (e.g. `process.env.FOO || '168'` or `process.env.FOO === 'true'`).

## Rules

- **Non-empty defaults**: If code has a fallback value, the `.env.example` and K8s `*.env` source files must include that default value -- not an empty string.
  - Example: `process.env.MANAGEMENT_API_SET_PASSWORD_TTL_HOURS || '168'` means the .env.example should have `MANAGEMENT_API_SET_PASSWORD_TTL_HOURS="168"`.
  - Example: `process.env.DB_SSL_CONNECTION === 'true'` (defaulting to false) means the .env.example should have `DB_SSL_CONNECTION="false"`.

- **Empty is intentional**: Only leave an env var empty (`KEY=`) when the "unset" state IS the intended default (e.g. `LOG_DIR=` means "console-only", `BRAND_LOGO_DARK=` means "use bundled asset").

- **Conflicts -- fix the right side**: When the code fallback differs from what's already consistently set in env files, determine which is correct based on context:
  - If all env files agree on a value and the code fallback is different, fix the code.
  - If the code fallback is the established behavior and env files are inconsistent, fix the env files.
  - Use the env-file-formatting skill for formatting rules (double quotes for non-empty values).

## Applies to

- `apps/*/.env.example` files
- `infra/k8s/base/*/source/*.env` files
- `dev/env-overrides/local/*.env.example` files

## References

- [env-file-formatting](../env-file-formatting/SKILL.md) -- double-quote rules for env values
- [AGENTS.md](../../AGENTS.md) -- project-wide conventions
