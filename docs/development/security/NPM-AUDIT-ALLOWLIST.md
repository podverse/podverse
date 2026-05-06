# NPM Audit Allowlist

## Overview

Release and promote scripts call [scripts/lib/check-audit-gate.sh](../../../scripts/lib/check-audit-gate.sh),
which fails on **moderate and higher** npm audit findings unless an advisory ID allowlist is passed.

**Current state:** The gate runs with **no** allowlisted advisory IDs (empty allowlist = strict). Root
`package.json` overrides plus dependency updates resolved the former transitive issues below without
needing audit exceptions.

The root **`ip-address`** override is kept because **express-rate-limit** still declares a dependency on
**10.1.x** (moderate GHSA while **<=10.1.0**); npm resolves the hoisted package to **10.2.0** under that
override.

## When to Add an Allowlist Entry

Use allowlisting only when:

- No safe upgrade path exists without regressions, **and**
- The finding is documented here with chain, rationale, risk, and revisit triggers.

Pass comma-separated npm advisory `source` IDs as the first argument to `check-audit-gate.sh` in:

- [scripts/publish/bump-version.sh](../../../scripts/publish/bump-version.sh)
- [scripts/publish/sync-develop-to-staging.sh](../../../scripts/publish/sync-develop-to-staging.sh)
- [scripts/publish/sync-staging-to-main.sh](../../../scripts/publish/sync-staging-to-main.sh)

Keep the three call sites **in sync**.

Also update [.cursor/skills/npm-audit/SKILL.md](../../../.cursor/skills/npm-audit/SKILL.md) examples.

## Previously Allowlisted (resolved)

These were allowlisted until overrides and dependency layout cleared `npm audit --omit=dev`:

| Advisory    | Topic                      | Former chain (summary)                                                          |
| ----------- | -------------------------- | ------------------------------------------------------------------------------- |
| **1113977** | `uuid` \< 14.0.0 (High)    | firebase-admin / Google Cloud stack → older `uuid`                              |
| **1116970** | `@tootallnate/once` (High) | Old proxy-agent chain (lifted via `http-proxy-agent` override on teeny-request) |

## References

- npm docs: [Dependency overrides](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides)
- npm docs: [Optional dependencies](https://docs.npmjs.com/cli/v10/using-npm/configuring-npm/package-json#optionaldependencies)
