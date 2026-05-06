### Metadata

- Started: 2026-05-05
- Author: Agent
- Context: npm audit moderate — ip-address / express-rate-limit (GHSA-v2v4-37r5-5v8g)

### Session 1 - 2026-05-05

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/10.txt:27-44 upgrade and fix

#### Key Decisions

- Did **not** use `npm audit fix --force` (per npm-audit skill).
- Bumped `express-rate-limit` to `^8.5.0` in `apps/api` and `apps/management-api`.
- Added root override `"ip-address": "10.2.0"`; aligned `package-lock.json` hoisted `node_modules/ip-address` and `express-rate-limit` dependency edge (npm 11.9 did not bump hoisted `ip-address` from nested override alone).
- `npm audit` and `npm audit --omit=dev --audit-level=moderate` report 0 vulnerabilities; api + management-api build OK.

#### Files Created/Modified

- `package.json`
- `package-lock.json`
- `apps/api/package.json`
- `apps/management-api/package.json`
- `docs/development/security/NPM-AUDIT-ALLOWLIST.md`

### Session 2 - 2026-05-05

#### Prompt (Agent)

Recovery after `scripts/development/update-lockfile-linux.sh` partially clobbered `package.json` overrides and `package-lock.json` during the ip-address audit fix.

#### Key Decisions

- `scripts/development/update-lockfile-linux.sh` **deleted** root `package-lock.json` and rewrote `package.json` overrides incompletely (lost UUID nested overrides); script failed mid-container `npm install`.
- Restored full `overrides` from `HEAD` plus `"ip-address": "10.2.0"`; re-aligned lockfile `express-rate-limit` → `ip-address` and hoisted `node_modules/ip-address` metadata to **10.2.0**; removed corrupted trees with `chmod -R u+w` + `rm -rf` then fresh `npm install`.
- Did not re-run Linux lockfile regenerator in-agent after failure; recommend maintainer run `./scripts/development/update-lockfile-linux.sh` when Docker is healthy for CI optional-deps parity.
