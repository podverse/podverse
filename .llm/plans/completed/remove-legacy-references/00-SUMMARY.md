# Remove “legacy” references — summary

Created: 2026-05-23  
Scope: **Podverse** monorepo (committed source, docs, skills, scripts — not `.llm/plans/completed/` history).

## Goal

Eliminate **confusing “legacy” wording** from operator docs, contributor docs, comments, and **repo-owned identifiers**. Podverse has **not** been deployed by operators; “legacy” implies a prior production era that does not exist for this audience.

## Outcomes

- `rg -i '\blegacy\b'` clean under agreed paths (see [01-inventory-and-exclusion-contract.md](./01-inventory-and-exclusion-contract.md)) except documented **exclusions** (third-party APIs, lockfile package names, committed SQL migration filenames, generated Lighthouse JSON).
- Docs describe current contracts only (e.g. alternate env key `BRAND_COLOR_BACKGROUND` without “legacy:”).
- Renamed functions/constants where names are ours (`getLegacyMembership403ModalProps`, `LEGACY_*` IndexedDB store constants, `isLegacyJwt`, etc.).

## Non-goals

- Renaming **committed** linear SQL files (e.g. `0027_feed_legacy_flag_drop.sql`) — breaks migration identity.
- Editing **vendor** option names (`legacyHeaders`, `legacyWatch`, `legacyPackages`, Lighthouse `legacy-javascript` audit IDs).
- Rewriting **package-lock.json** or npm package names (`character-entities-legacy`, `legacy-javascript`).
- Editing archived Lighthouse report JSON under `tools/web-perf/lighthouse/reports/` (vendor output snapshots).

## Plan files

| File | Focus |
| ---- | ----- |
| [01-inventory-and-exclusion-contract.md](./01-inventory-and-exclusion-contract.md) | Baseline inventory; permanent exclusion list; grep scope |
| [02-operator-docs-and-env-wording.md](./02-operator-docs-and-env-wording.md) | `docs/`, `apps/*/ENV.md`, env templates, `scripts/local-env/setup.sh` |
| [03-cursor-skills-and-internal-docs.md](./03-cursor-skills-and-internal-docs.md) | `.cursor/skills`, `.cursor/rules`, `docs/repo-management`, dev docs |
| [04-typescript-identifiers-and-comments.md](./04-typescript-identifiers-and-comments.md) | Apps + packages: renames, comments, tests |
| [05-verification-and-ci-guard.md](./05-verification-and-ci-guard.md) | Final grep gate; optional lint script / CI note |

Execute via [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md) and [COPY-PASTA.md](./COPY-PASTA.md).

## Authoring rule (same as platform docs)

- Present-tense, authoritative voice for docs.
- Do **not** add “formerly”, “renamed from”, or migration narrative when replacing “legacy”.
- Prefer precise terms: `alternate env key`, `prior IndexedDB store`, `unencrypted plaintext`, `older browsers`, `prometheus.io annotations`.
