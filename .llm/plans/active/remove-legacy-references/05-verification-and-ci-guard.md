# Plan 05 — Verification and CI guard

## Objective

Confirm the monorepo is free of confusing **legacy** wording per plan 01 exclusions, and optionally add a lightweight guard for regressions.

## Full-repo grep (authoritative)

```bash
rg -i '\blegacy\b' \
  --glob '!**/.llm/**' \
  --glob '!package-lock.json' \
  --glob '!tools/web-perf/lighthouse/reports/**' \
  --glob '!**/node_modules/**'
```

**Allowed remaining matches** (must be subset of plan 01 exclusions only):

- `apps/api/src/lib/rateLimiter.ts` — `legacyHeaders`
- `apps/web/nodemon.json` — `legacyWatch`
- `flake.nix` — `legacyPackages`
- `infra/k8s/base/ops/kustomization.yaml` — `0027_feed_legacy_flag_drop.sql`
- `package-lock.json` (if not globbed)

If any **other** file matches, return to plans 02–04.

## Build and lint

```bash
./scripts/nix/with-env npm run lint
./scripts/nix/with-env npm run build:packages
```

## Optional: regression script

Add `scripts/development/check-no-legacy-wording.sh`:

- Runs `rg` with same globs/excludes as above
- Exits non-zero if unexpected matches
- Document one line in `docs/development/DEVELOPMENT.md` or `AGENTS.md` (optional; skip if team prefers manual grep only)

Do **not** wire into CI unless requested — keep optional.

## Plan completion

Per [plan-completion skill](../../../.cursor/skills/plan-completion/SKILL.md):

1. Mark all COPY-PASTA steps ✅
2. Move `.llm/plans/active/remove-legacy-references/` → `.llm/plans/completed/remove-legacy-references/`

## Deliverables

- [ ] Full grep shows only exclusion list
- [ ] Lint (and build:packages) pass
- [ ] Plan set archived to `completed/`
