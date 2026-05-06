# npm-overrides-trim

**Started:** 2026-05-06  
**Author:** Agent  
**Context:** Trim redundant root `package.json` npm overrides; align strict audit gate and docs.

## Session 1 - 2026-05-06

#### Prompt (Developer)

Assess and trim Podverse `package.json` overrides

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Removed **`@tootallnate/once`** override (no longer in the dependency tree).
- Removed redundant nested **`uuid`** overrides under `@google-cloud/storage`, `google-gax`, `gaxios`,
  `typeorm`, `firebase-admin`, and `teeny-request`; kept root **`uuid": "14.0.0"`**.
- Kept **`postcss@8.4.31`**, **`glob`**, **`ip-address`**, **`@google-cloud/storage` → teeny-request**, and
  **`teeny-request` → http-proxy-agent** overrides per plan.
- Release scripts now invoke **`check-audit-gate.sh`** with an empty allowlist argument (strict audit);
  advisory IDs **`1113977`** and **`1116970`** removed from bump/sync flows.
- **`NPM-AUDIT-ALLOWLIST.md`** and **`npm-audit`** skill updated for empty allowlist + sync guidance.
- Verified **`npm audit --omit=dev`** clean and **`npm run build:packages`** after **`npm install`**;
  lockfile resolves hoisted **`ip-address@10.2.0`** for **express-rate-limit**.

#### Files Created/Modified

- `package.json`
- `package-lock.json`
- `scripts/publish/bump-version.sh`
- `scripts/publish/sync-develop-to-staging.sh`
- `scripts/publish/sync-staging-to-main.sh`
- `scripts/lib/check-audit-gate.sh`
- `docs/development/security/NPM-AUDIT-ALLOWLIST.md`
- `.cursor/skills/npm-audit/SKILL.md`
- `.llm/history/active/npm-overrides-trim/npm-overrides-trim-part-01.md`
