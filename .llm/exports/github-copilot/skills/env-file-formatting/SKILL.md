---
name: env-file-formatting
description: Env file value formatting (double quotes for non-empty). Use when adding or editing
  .env, .env.example, or any *.env template in the repo.
---


# Env file formatting

## When to use

When adding or editing `.env`, `.env.example`, or any `*.env` template in the repo (including
`infra/config/env-templates/*.env.example` and `dev/env-overrides/local/*.env.example`).

## Rules

- **Non-empty values**: Use double quotes. Example: `DATABASE_HOST="localhost"`, `NODE_ENV="development"`.
- **Empty/unset values**: No value after `=` (no quotes, no empty string). Example: `API_KEY=`.

Scripts that write env content (e.g. `scripts/local-env/setup.sh`) already emit this format;
templates and examples should match so that copied or generated files are consistent.

## Variable order when mixing server and `NEXT_PUBLIC_*`

If a file defines **both** keys that are **not** `NEXT_PUBLIC_*` (e.g. `NODE_ENV`, `RUNTIME_CONFIG_URL`,
`READINESS_*`, `API_PORT`, `METABOOST_*`, `SOCIAL_*` API template URLs) **and** any `NEXT_PUBLIC_*`
keys:

1. Put **every non-`NEXT_PUBLIC_*` assignment first** (preserve sensible grouping with section comments).
2. Then a blank line.
3. Then **all `NEXT_PUBLIC_*`** keys (again grouped by section comments as needed).

Files that contain only `NEXT_PUBLIC_*` or only server keys need no extra ordering rule.

## K8s ConfigMap `source/*.env` (infra)

Templates that become ConfigMap data under `infra/k8s/**/source/*.env` (and GitOps copies) follow the same **value** rules as above. For **comments** that document where a value comes from: use **at most one environment variable name per `#` line**. Do not list several variable names in one line (e.g. comma-separated). If two variables share the same note, repeat the full comment on a second line.

## References

- [.llm/exports/github-copilot/instructions/env-file-formatting.instructions.md](../../.llm/exports/github-copilot/instructions/env-file-formatting.instructions.md) — cursor rule (globs and examples)
- [AGENTS.md](../../AGENTS.md) — "In .env files" / Non-empty values / Empty values
- [scripts/local-env/setup.sh](../../scripts/local-env/setup.sh) — `upsert_var()` writes `VAR="value"` or `VAR=`
