# NPM Audit Allowlist

## Overview

The `scripts/publish/bump-version.sh` script includes a security allowlist for specific npm audit advisories that cannot be resolved through normal package upgrades or npm overrides. This document explains why and when to revisit them.

## Current Allowlisted Advisories

### Advisory 1113977: UUID < 14.0.0 (High)

**Affected chain:** firebase-admin → @google-cloud/storage → teeny-request → uuid

**Why it's allowlisted:**

- Root-level npm overrides (`"uuid": "14.0.0"`) do not cascade into optional dependencies' nested node_modules
- @google-cloud/storage@7.19.0 (latest in 7-series) explicitly pins `teeny-request^9.0.0`
- teeny-request@9.0.0 pins `uuid^9.0.0`, which is vulnerable
- No safe upgrade path exists:
  - Downgrading firebase-admin to 10.x causes regressions and introduces other vulnerabilities
  - Replacing firebase-admin would require major app refactoring (out of scope)
  - Monkey-patching in postinstall adds maintenance burden

**Risk level:** Transitive-only; not directly exploitable in typical usage patterns. UUID is used for ID generation and does not process untrusted input in this context.

### Advisory 1116970: @tootallnate/once < 3.0.1 (High)

**Affected chain:** firebase-admin → @google-cloud/storage → teeny-request → http-proxy-agent → @tootallnate/once

**Why it's allowlisted:**

- Same upstream constraint as 1113977
- Depends on teeny-request being resolved to 9.x
- No alternative version line of @google-cloud/storage avoids this chain

**Risk level:** Transitive-only; affects proxy agent initialization, not runtime behavior in normal Podverse deployment scenarios.

## When to Revisit

Check these advisories for removal when:

1. **firebase-admin** releases a major version (e.g., 14.x+) that upgrades its Google Cloud dependencies
2. **@google-cloud/storage** releases a version that upgrades teeny-request to 10.x or 11.x
3. **teeny-request** is removed from the dependency chain (e.g., Google Cloud SDK moves to a different HTTP client)

### How to Revisit

1. Update `packages/external-services-firebase/package.json` to pin a newer firebase-admin version
2. Run: `npm install` and `npm audit --omit=dev --json | jq '.vulnerabilities'`
3. If advisories 1113977 and 1116970 no longer appear, they can be removed from `ALLOWED_AUDIT_IDS` in `scripts/publish/bump-version.sh`
4. Also remove the corresponding npm overrides from root `package.json` if they're no longer needed

## Historical Context

- **2026-04-23**: Investigated and implemented allowlist. Attempted npm audit fix, root-level overrides, and major version downgrades; all caused regressions or failed to resolve the chain due to npm's nested optional dependency behavior.

## References

- npm docs: [Dependency overrides](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#overrides)
- npm docs: [Optional dependencies](https://docs.npmjs.com/cli/v10/configuring-npm/package-json#optionaldependencies)
- GitHub: [firebase-admin releases](https://github.com/firebase/firebase-admin-node/releases)
- GitHub: [@google-cloud/storage releases](https://github.com/googleapis/nodejs-storage/releases)
