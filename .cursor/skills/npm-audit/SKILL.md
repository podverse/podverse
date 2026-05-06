---
name: npm-audit
description: Investigate and decide on npm audit vulnerabilities—fix vs. allowlist pattern with shared gate utility
version: 1.0.0
---

# Handling NPM Audit Vulnerabilities

## When to Use This Skill

Use this skill when:

- `npm audit --omit=dev --audit-level=moderate` is failing in the release gate (`scripts/publish/bump-version.sh`)
- You need to investigate why an npm override is not resolving a transitive dependency
- You need to decide between fixing a vulnerability vs. allowlisting it
- A PR proposes changes to `package.json` overrides or audit allowlists

## ⚠️ CRITICAL: Allowlist Consistency Across All Release Scripts

Advisory IDs are passed as the **first argument** to `scripts/lib/check-audit-gate.sh`. An empty string
means **strict** mode (no advisories allowed).

**Keep all call sites in sync** when adding or removing IDs:

- `scripts/publish/bump-version.sh`
- `scripts/publish/sync-develop-to-staging.sh`
- `scripts/publish/sync-staging-to-main.sh`

Document rationale in `docs/development/security/NPM-AUDIT-ALLOWLIST.md` whenever the allowlist is
non-empty.

## Investigation Process

### Step 1: Understand the Vulnerability

```bash
npm audit --omit=dev --json > temp/audit-report.json
node --input-type=module -e "
  import fs from 'fs';
  const audit = JSON.parse(fs.readFileSync('temp/audit-report.json', 'utf8'));
  for (const [pkg, data] of Object.entries(audit.vulnerabilities || {})) {
    if (Array.isArray(data.via)) {
      for (const adv of data.via) {
        if (typeof adv === 'object') {
          console.log(\`\${pkg}: \${adv.severity} - \${adv.title} (Advisory \${adv.source})\`);
          console.log(\`  URL: \${adv.url}\`);
          console.log(\`  Via: \${data.via}\`);
        }
      }
    }
  }
"
```

This shows:

- Affected package name
- Severity level
- Advisory ID (source)
- Direct URL to vulnerability details
- **Via:** The chain of how this vulnerability reaches your code

### Step 2: Trace the Dependency Chain

For each vulnerability, understand the full path:

```bash
npm ls <vulnerable-package> --all
```

Example output for uuid@9.0.1:

```
podverse@5.4.12
└── (transitive)
    └── firebase-admin@13.8.0
        └── @google-cloud/storage@7.19.0
            └── teeny-request@9.0.0
                └── uuid@9.0.1 (vulnerable)
```

### Step 3: Determine Root Cause

**Root cause types:**

1. **Direct dependency outdated**
   - Package in your `package.json` is not at latest
   - **Fix:** `npm upgrade <package>`

2. **Transitive dependency in resolvable chain**
   - Intermediate package has a recent version that upgrades the vulnerable dep
   - **Fix:** Upgrade the intermediate package, then re-audit
   - **Example:** firebase-admin@14.x might pull @google-cloud/storage@8.x which uses teeny-request@11.x

3. **Transitive dependency in constrained chain** (most common)
   - Latest version of intermediate packages still pin the vulnerable dep
   - **Fix:** Evaluate if npm overrides can force a newer version
   - **Check:**
     ```bash
     # In package.json, try an override like:
     "overrides": {
       "uuid": "14.0.0",
       "teeny-request": {
         "uuid": "14.0.0"
       }
     }
     ```
   - **Then:** `npm install` and re-audit

4. **Nested optional dependency bug** (hardest case)
   - npm's resolver installs optional dependencies into their own node_modules folder
   - Overrides don't cascade into these nested folders in certain cases
   - **Symptom:** `package-lock.json` shows `node_modules/teeny-request/node_modules/uuid@9.0.1` even though you have `"uuid": "14.0.0"` in overrides
   - **Fix:** Either upgrade the parent package OR allowlist the advisory

### Step 4: Decide Fix vs. Allowlist

**Fix if:**

- Direct dependency upgrade resolves it
- A recent major version of an intermediate package resolves it

- npm overrides can successfully force the resolution (verify in `package-lock.json`)
- The vulnerability is directly exploitable in Podverse's usage

**Allowlist if:**

- Latest mainstream versions of all upstream packages still carry the vulnerability
- Fixing requires downgrading other critical packages (causes regressions)
- The vulnerability is transitive-only and low-risk in Podverse's deployment model
- A clear path exists to remove the allowlist when upstream packages release fixes

### Step 5: Document the Rationale

If allowlisting, always document **why** in `docs/development/security/NPM-AUDIT-ALLOWLIST.md`:

```markdown
### Advisory XXXXX: <vulnerability name>

**Affected chain:** pkg1 → pkg2 → pkg3 → vulnerable-pkg

**Why it's allowlisted:**
- Latest pkg3@X.Y still pins vulnerable-pkg@<14
- Downgrading pkg1 causes regressions (list them)
- Replacing pkg1 would require major refactor (explain scope)

**Risk level:** Transitive-only; not directly exploitable because [reason].

### When to revisit:
- When pkg1 releases X+1.0.0 with upgraded dependencies
- When pkg3 releases Y+1.0.0 that drops the vulnerable dep
```

Then pass the same comma-separated IDs from **each** publish script that invokes `check-audit-gate.sh`,
for example:

```bash
"$SCRIPT_DIR/../lib/check-audit-gate.sh" "1113977" "release"
```

### Step 6: Track revisit criteria

Note upstream upgrades or override removals in `docs/development/security/NPM-AUDIT-ALLOWLIST.md` so the
allowlist can shrink again later.

## Common Patterns

### Pattern: npm Overrides Not Cascading

**Symptom:** Root `package.json` has `"uuid": "14.0.0"` override, but `npm audit` still reports uuid@9.0.1 in the output.

**Why:** Optional dependencies get their own node_modules folder, and npm doesn't always apply overrides there.

**Verification:**

```bash
# Check the lockfile for nested node_modules

grep -A2 'node_modules/teeny-request/node_modules/uuid' package-lock.json
```

If you see a nested uuid entry with version < 14, the override didn't work.

**Options:**

1. Try pinning the parent package instead: `"teeny-request": "11.x"`
2. Force a major version of the upstream: `"@google-cloud/storage": "8.0.0"`
3. Accept the allowlist if neither works

### Pattern: npm audit fix --force Causes Regressions

**Symptom:** Running `npm audit fix --force` downgrades critical packages like firebase-admin@10.1.0.

**Why:** `--force` prioritizes clearing vulnerabilities over semver compatibility.

**Solution:** **Never use `--force` in monorepos.** Instead, carefully upgrade intermediate packages one at a time and check side effects.

## Checklist Before Committing

- [ ] Investigation documented: vulnerability chain traced and root cause identified
- [ ] Attempted a fix: either package upgrade or npm override tested in package-lock.json
- [ ] Verified no regression: `npm run build:packages && npm run build` succeeds
- [ ] If allowlisting: documented rationale in `docs/development/security/NPM-AUDIT-ALLOWLIST.md`
- [ ] If allowlisting: passed the same advisory IDs to all three publish scripts that call
      `check-audit-gate.sh`
- [ ] LLM history updated with investigation results

## See Also

- `docs/development/security/NPM-AUDIT-ALLOWLIST.md` — Allowlist policy and history
- `scripts/lib/check-audit-gate.sh` — Shared moderate+ audit gate
- `scripts/publish/bump-version.sh` — Release audit invocation
