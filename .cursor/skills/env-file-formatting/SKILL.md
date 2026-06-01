---
name: env-file-formatting
description: Env file value formatting — double quotes for Node/Docker .env; unquoted values for
  K8s source/*.env. Use when adding or editing .env, .env.example, or env templates.
---

# Env file formatting

## When to use

When adding or editing env var files. **Which rules apply depends on the file path** (see below).

## Node / Docker env files

Applies to app `.env` / `.env.example`, `infra/config/env-templates/*.env.example`,
`infra/config/local/*.env`, `dev/env-overrides/local/*.env.example`, and Docker Compose env files.

- **Non-empty values**: Use double quotes. Example: `DATABASE_HOST="localhost"`, `API_PORT="3000"`.
- **Empty/unset values**: No value after `=` (no quotes, no empty string). Example: `API_KEY=`.

Scripts that write env content (e.g. `scripts/local-env/setup.sh`) already emit this format;
templates and examples should match so that copied or generated files are consistent.

## K8s ConfigMap `source/*.env`

Applies to `infra/k8s/**/source/*.env` (and GitOps overlay copies) consumed by `configMapGenerator`.

- **Values are unquoted** (kustomize env-file semantics — quoted values would embed stray `"` in
  ConfigMap data).
- **Numbers are unquoted**: `DB_PORT=5432`, not `DB_PORT="5432"`.
- **Empty/unset**: `KEY=` (same as Node/Docker).
- **Comments**: at most **one environment variable name per `#` line**. Do not list several names in
  one line. If two variables share the same note, repeat the full comment on a second line.

Keep keys aligned with `infra/config/env-templates/*.env.example`; only values and K8s-specific
hostnames differ.

For **K8s YAML manifest** value types (string vs numeric OpenAPI fields), see **k8s** skill and
**infra-k8s** rule — not this skill.

## Variable order when mixing server and `NEXT_PUBLIC_*`

If a file defines **both** keys that are **not** `NEXT_PUBLIC_*` (e.g. `NODE_ENV`, `RUNTIME_CONFIG_URL`,
`READINESS_*`, `API_PORT`, `METABOOST_*`, `SOCIAL_*` API template URLs) **and** any `NEXT_PUBLIC_*`
keys:

1. Put **every non-`NEXT_PUBLIC_*` assignment first** (preserve sensible grouping with section comments).
2. Then a blank line.
3. Then **all `NEXT_PUBLIC_*`** keys (again grouped by section comments as needed).

Files that contain only `NEXT_PUBLIC_*` or only server keys need no extra ordering rule.

## References

- [.cursor/rules/env-file-formatting.mdc](/.cursor/rules/env-file-formatting.mdc) — cursor rule (globs and examples)
- [.cursor/rules/infra-k8s.mdc](/.cursor/rules/infra-k8s.mdc) — K8s YAML string vs numeric typing
- [AGENTS.md](/AGENTS.md) — "In .env files" / Non-empty values / Empty values
- [scripts/local-env/setup.sh](/scripts/local-env/setup.sh) — `upsert_var()` writes `VAR="value"` or `VAR=`
