---
name: startup-validation-env-order
description: Keep apps/*/lib/startup/validation.ts push order aligned with apps/*/.env.example section order when practical. Use when adding env vars, startup validation entries, or editing validation.ts.
version: 1.0.0
---

# Startup validation order vs env files

## When to use

When adding or reordering entries in `apps/<app>/src/lib/startup/validation.ts` (or workers
equivalent), especially after adding vars to `apps/<app>/.env.example`.

## Rule

**Keep validation `results.push(...)` order aligned with the authoritative env template**
(`apps/<app>/.env.example`) **when practical:**

1. **Section order** — Group validation blocks in the same sequence as env file sections
   (e.g. General → API Configuration → Auth → Database → … → Extensions last).
2. **Within a section** — Push validations for vars in the same order they appear under that
   section header in `.env.example`.
3. **Last section = last block** — Vars in the final env section (e.g. **Extensions
   (forward-looking)**) belong at the **end** of `validateAllEnvironmentVariables`, not
   mixed into an earlier category block (e.g. do not put `EXT_PROMETHEUS_ENABLED` under
   API Configuration in validation when it is last in `.env.example`).
4. **Comments** — Optional short comment tying a validation block to the env section name
   helps future edits stay aligned.

## Exceptions (OK to diverge)

- **Early validation** — Vars that must be read before others (e.g. `ACCOUNT_SIGNUP_MODE`
  before conditional mailer checks) may be validated earlier than their env section.
- **Grouped helpers** — Custom validators (e.g. MetaBoost pair, object-storage bundle) may
  stay together even if env keys are scattered; keep the _block_ near the related env
  section when possible.
- **Display order** — Startup output is grouped by validation `category`, not file order;
  alignment is for **maintainer ergonomics** when editing both files side by side.

## Files to keep in sync

When adding an env var:

- `apps/<app>/.env.example` — authoritative section + key order
- `apps/<app>/src/lib/startup/validation.ts` — matching push order (same app)
- Extension vars: also follow [extensions-env](../extensions-env/SKILL.md) (Extensions
  section last in env files and validation).

## References

- [extensions-env](../extensions-env/SKILL.md) — Extensions section and validation category
- [env-file-formatting](../env-file-formatting/SKILL.md) — env value formatting
- [api](../api/SKILL.md) — API startup validation patterns
