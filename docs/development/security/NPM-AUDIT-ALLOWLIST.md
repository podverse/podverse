# NPM Audit Allowlist

## Overview

Release and promote scripts call [scripts/lib/check-audit-gate.sh](/scripts/lib/check-audit-gate.sh),
which fails on **moderate and higher** npm audit findings unless an advisory ID allowlist is passed.

**Current state:** Advisory **1117015** (`postcss` via `next`) is allowlisted in all release/promote
scripts and Publish (staging) validate. Root `package.json` overrides hoist `postcss@8.5.10` for most
consumers, but npm does not replace `next`'s nested `node_modules/postcss@8.4.31` despite
`"next": { "postcss": "8.5.10" }`.

### Mobile isolation

`apps/mobile` is **outside** the root npm workspace. It has its own [`apps/mobile/package-lock.json`](/apps/mobile/package-lock.json)
and [`apps/mobile/.npmrc`](/apps/mobile/.npmrc). Root `npm ci` / server publish audit never install or
audit Expo / React Native. Mobile shares marketing version `X.Y.Z` via `bump-version.sh` but has a
**separate store release track**. See
[DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md)
and **mobile-expo-monorepo** skill.

Root overrides also pin **`@xmldom/xmldom@0.9.10`** so video.js / mpd-parser transitive chains clear
those HIGH findings without allowlisting.

The root **`ip-address`** override is kept because **express-rate-limit** still declares a dependency on
**10.1.x** (moderate GHSA while **<=10.1.0**); npm resolves the hoisted package to **10.2.0** under that
override.

## Active allowlist

### Advisory 1117015: PostCSS XSS via unescaped `</style>` (moderate)

**Affected chain:** `next@16.2.x` → nested `postcss@8.4.31` (`node_modules/next/node_modules/postcss`)

**Why it's allowlisted:**

- `next@16.2.x` (latest stable) pins `postcss@8.4.31` as an exact dependency in its own `node_modules`.
- Root overrides (`postcss@8.5.10`, `next.postcss@8.5.10`) do not update the nested lockfile entry after
  `npm install`.
- `npm audit fix --force` proposes downgrading to `next@9.3.3`, which is not acceptable.

**Risk level:** Transitive-only; PostCSS stringify XSS in Next's bundled toolchain. Podverse does not
invoke PostCSS stringify on untrusted CSS input outside Next's build pipeline.

**When to revisit:**

- When `next` releases a version that depends on `postcss@>=8.5.10` natively (remove override attempt
  and allowlist entry).
- Re-test with `bash scripts/lib/check-audit-gate.sh "" "release"` after upgrading `next`.

## When to Add an Allowlist Entry

Use allowlisting only when:

- No safe upgrade path exists without regressions, **and**
- The finding is on the **server publish surface** (root lockfile — not `apps/mobile`), **and**
- The finding is documented here with chain, rationale, risk, and revisit triggers.

Pass comma-separated npm advisory `source` IDs as the first argument to `check-audit-gate.sh` in:

- [scripts/publish/bump-version.sh](/scripts/publish/bump-version.sh)
- [scripts/publish/sync-develop-to-staging.sh](/scripts/publish/sync-develop-to-staging.sh)
- [scripts/publish/sync-staging-to-main.sh](/scripts/publish/sync-staging-to-main.sh)
- [.github/workflows/publish-staging.yml](/.github/workflows/publish-staging.yml) (validate → Security audit)

Keep those call sites **in sync**. Do **not** use raw `npm audit --audit-level=moderate` in publish
CI — it ignores the allowlist and fails on documented transitive findings.

Also update [.cursor/skills/npm-audit/SKILL.md](/.cursor/skills/npm-audit/SKILL.md) examples.

## Previously Allowlisted (resolved)

These were allowlisted until overrides and dependency layout cleared `npm audit --omit=dev`:

| Advisory    | Topic                      | Former chain (summary)                                                          |
| ----------- | -------------------------- | ------------------------------------------------------------------------------- |
| **1113977** | `uuid` \< 14.0.0 (High)    | firebase-admin / Google Cloud stack → older `uuid`                              |
| **1116970** | `@tootallnate/once` (High) | Old proxy-agent chain (lifted via `http-proxy-agent` override on teeny-request) |
| **1113715** | `ajv` ReDoS (`$data`)      | Was under `expo-dev-launcher`; resolved by moving mobile off the root lockfile  |

## References

- npm docs: [Dependency overrides](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides)
- npm docs: [Optional dependencies](https://docs.npmjs.com/cli/v10/using-npm/configuring-npm/package-json#optionaldependencies)
- Mobile vs server publish:
  [DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md)
