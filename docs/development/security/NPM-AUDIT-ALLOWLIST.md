# NPM Audit Allowlist

## Overview

Release and promote scripts call [scripts/lib/check-audit-gate.sh](/scripts/lib/check-audit-gate.sh),
which fails on **moderate and higher** npm audit findings unless an advisory ID allowlist is passed.

**Current state:** Allowlist is **empty** (strict). Root `package.json` uses dependency + `$`-reference
overrides so nested installs (including `next` optional/`postcss`) resolve to patched versions:

| Override (via root dep + `$`) | Pinned version | Clears                                       |
| ----------------------------- | -------------- | -------------------------------------------- |
| `postcss` / `next.postcss`    | `8.5.23`       | PostCSS XSS / sourceMappingURL HIGH+moderate |
| `sharp` / `next.sharp`        | `0.35.3`       | libvips HIGH via nested Next sharp           |
| `uuid` (direct app use)       | `14.0.2`       | Direct UUID use; Firebase chain listed below |
| `fast-xml-parser`             | `5.10.1`       | DOCTYPE entity-expansion HIGH                |
| `brace-expansion`             | `5.0.9`        | unbounded expansion DoS HIGH                 |

After changing overrides, regenerate the lockfile cleanly (`rm package-lock.json` then `npm install`,
or `./scripts/development/update-lockfile-linux.sh`) so nested `next/node_modules/*` entries are not
left stale. Incremental `npm install` alone often fails to replace those nested paths.

### Mobile isolation

`apps/mobile` is **outside** the root npm workspace. It has its own [`apps/mobile/package-lock.json`](/apps/mobile/package-lock.json)
and [`apps/mobile/.npmrc`](/apps/mobile/.npmrc). Root `npm ci` / server publish audit never install or
audit Expo / React Native. Mobile shares marketing version `X.Y.Z` via `bump-version.sh` but has a
**separate store release track**. See
[DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md)
and **mobile-expo-monorepo** skill.

Root overrides also pin **`@xmldom/xmldom@0.9.10`** so video.js / mpd-parser transitive chains clear
those HIGH findings without allowlisting. Mobile pins **`@xmldom/xmldom@0.8.10`** instead: Expo SDK 52
`@expo/plist` calls `DOMParser.parseFromString(xml)` without a mimeType, which throws on xmldom
**0.9.x** (`mimeType "undefined" is not valid`) and breaks `expo run:ios --device` usbmux listing.

Mobile's remaining audit findings are in Expo CLI, Metro, prebuild, and development-client tooling;
they are not included in the shipped application bundle. The Expo SDK 52 dependency set requires a
coordinated SDK upgrade to replace those packages. The React Navigation `nanoid` resolution is
patched independently at `3.3.18`.

The root **`ip-address`** override is kept because **express-rate-limit** declares a dependency on
`^10.2.0`; the scoped override pins the hoisted package to **10.7.0**, which includes the current
SSRF classification fixes.

### Remaining root audit finding

`npm audit --omit=dev` still reports six moderate UUID advisories through the optional
`firebase-admin` → `@google-cloud/storage` → `gaxios` / `teeny-request` chain. The current Firebase
Admin release does not provide a non-breaking upgrade that removes this chain; npm's proposed fix
downgrades `firebase-admin` to `10.3.0`. No allowlist entry has been added. Revisit this when Firebase
Admin or its Google Cloud dependencies provide a compatible patched chain.

## Active allowlist

None. Call sites pass an empty string to `check-audit-gate.sh`.

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
| **1117015** | `postcss` XSS (`</style>`) | `next` nested `postcss@8.4.31`; cleared via root `postcss@8.5.23` + `$postcss`  |
| **1113977** | `uuid` \< 14.0.0 (High)    | firebase-admin / Google Cloud stack → older `uuid`                              |
| **1116970** | `@tootallnate/once` (High) | Old proxy-agent chain (lifted via `http-proxy-agent` override on teeny-request) |
| **1113715** | `ajv` ReDoS (`$data`)      | Was under `expo-dev-launcher`; resolved by moving mobile off the root lockfile  |

## References

- npm docs: [Dependency overrides](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides)
- npm docs: [Optional dependencies](https://docs.npmjs.com/cli/v10/using-npm/configuring-npm/package-json#optionaldependencies)
- Mobile vs server publish:
  [DOCS-MOBILE-VERSIONING-RELEASE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-VERSIONING-RELEASE.md)
