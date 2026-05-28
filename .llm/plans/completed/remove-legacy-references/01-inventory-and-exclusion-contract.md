# Plan 01 — Inventory and exclusion contract

## Objective

Produce a **complete baseline** of `\blegacy\b` matches and a **binding exclusion list** so later plans do not debate third-party or immutable identifiers.

## Baseline inventory

From repo root:

```bash
rg -i '\blegacy\b' \
  --glob '!**/.llm/**' \
  --glob '!package-lock.json' \
  --glob '!tools/web-perf/lighthouse/reports/**' \
  > /tmp/podverse-legacy-baseline.txt
wc -l /tmp/podverse-legacy-baseline.txt
```

Paste a **summary table** (file count by top-level area) into this plan’s completion note or a short comment in the PR — not the full dump.

Known areas at plan authoring time (~35 files outside `.llm/`):

| Area | Examples |
| ---- | -------- |
| Docs | `REBRANDING-CDN.md`, `LOCAL-ENV-OVERRIDES.md`, `BRANCH-PROTECTION.md`, `apps/*/ENV.md` |
| Cursor | `documentation-conventions`, `linear-sql-greenfield-only`, `orm` skills |
| Apps | `addByRSS/storage.ts`, `modalForMembership403.tsx`, `next.config.mjs`, `rateLimiter.ts` |
| Packages | `credentialsEncryption.ts`, `apiRequestService.ts`, UI variables, image-candidates |
| Infra/scripts | `prometheus-worker-scrape` comment, `create_argocd_github_repo_secret.sh`, `generate-linear-baseline.sh` |
| Tooling | `flake.nix`, `nodemon.json` |

## Permanent exclusions (do not change)

These are **not** “prior Podverse deployments”; they are external APIs, package names, or immutable migration artifacts.

| Location | Token | Reason |
| -------- | ----- | ------ |
| `package-lock.json` | `legacy-javascript`, `character-entities-legacy` | npm package names |
| `apps/api/src/lib/rateLimiter.ts` | `legacyHeaders` | `express-rate-limit` option |
| `apps/web/nodemon.json` | `legacyWatch` | nodemon option |
| `flake.nix` | `legacyPackages` | Nixpkgs flake API |
| `infra/k8s/base/ops/kustomization.yaml` | `0027_feed_legacy_flag_drop.sql` | Committed linear migration filename |
| `tools/web-perf/lighthouse/reports/**/*.json` | `legacy-javascript` audit | Lighthouse vendor output |
| Any future `node_modules/` | — | Never edit |

## In-scope (must fix in plans 02–04)

Everything else in the baseline that is **repo-authored** prose or **renameable** identifiers.

## Replacement vocabulary (use in later plans)

| Instead of | Use |
| ---------- | --- |
| legacy env key | alternate env key, also accepted: |
| legacy browsers | older browsers |
| legacy plaintext | unencrypted plaintext (no `enc:` prefix) |
| legacy DTO paths | older request shape / prior field paths |
| legacy store names | prior IndexedDB store names (v4 schema) |
| legacy URLs | prior route prefix `/dashboard/` |
| legacy aliases (CSS) | compatibility aliases |
| legacy TypeORM migration paths | removed TypeORM migration paths (historical note only if needed) |
| legacy prometheus.io annotations | `prometheus.io` pod annotations |
| legacy structure (docs) | older directory layout |
| legacy minimum_message_amount_minor | deprecated field name (in tests) |

## Optional: contributor guard script (plan 05)

If the team wants enforcement, plan 05 may add `scripts/development/check-no-legacy-wording.sh` that runs `rg` with the same globs/excludes. **Not required in this plan.**

## Deliverables

- [x] Baseline command run; summary recorded (see **Completion note** below)
- [x] Exclusion table agreed (this file is the contract)
- [x] No code changes in plan 01 unless a stray match is clearly wrong (prefer plan 02–04)

## Completion note (2026-05-25)

**Baseline file:** `/tmp/podverse-legacy-baseline.txt` (regenerated with plan globs plus `!infra/data/**` so feed CSV URLs are not counted as in-scope prose).

| Metric | Value |
| ------ | ----- |
| Match lines (`\blegacy\b`, case-insensitive) | 28 |
| Unique files | 22 |

**Summary by area (unique files):**

| Area | Files | In-scope for 02–04 |
| ---- | ----- | ------------------ |
| `docs/` | 4 | yes |
| `apps/` | 5 | yes (ENV, storage, SCSS, next.config; see camelCase addendum) |
| `packages/` | 7 | yes |
| `.cursor/` | 3 | yes |
| `scripts/` | 2 | yes |
| `infra/` | 1 | yes (`create_argocd_github_repo_secret.sh` comment only) |

**Supplemental exclusion (not in original table):**

| Location | Reason |
| -------- | ------ |
| `infra/data/**` (e.g. `podcastindex_feeds.csv`) | Third-party feed URLs containing the substring `legacy`; not repo-authored wording |

**CamelCase / vendor tokens** (matched by `[Ll]egacy` but not always by `\blegacy\b`; plan 04 must still handle identifiers):

| Location | Token | Treatment |
| -------- | ----- | --------- |
| `apps/web/.../modalForMembership403.tsx` | `getLegacyMembership403ModalProps` | rename (plan 04) |
| `apps/web/.../storage.ts` | `LEGACY_*` store constants | rename (plan 04) |
| `packages/management-api-requests/.../apiRequestService.ts` | `isLegacyJwt` | rename (plan 04) |
| Permanent exclusions table above | `legacyHeaders`, `legacyWatch`, `legacyPackages` | no change |
| `infra/k8s/base/ops/kustomization.yaml` | `0027_feed_legacy_flag_drop.sql` path | no change (filename) |

## Verification

```bash
test -f /tmp/podverse-legacy-baseline.txt
rg -i '\blegacy\b' --glob '!**/.llm/**' --glob '!package-lock.json' --glob '!tools/web-perf/lighthouse/reports/**' -c | head
```
