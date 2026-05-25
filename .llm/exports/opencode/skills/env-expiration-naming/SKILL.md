---
name: env-expiration-naming
description: >-
  Naming for env keys and TypeScript symbols that represent time-until-expiration or duration until
  expiry. Use when adding or renaming MEMBERSHIP_FREE_TRIAL_EXPIRATION, AUTH_*_EXPIRATION, or similar.
---


# Env and code: `*_EXPIRATION` naming

## Rule

- **Env keys** and **exported JS/TS constant names** that represent an expiration-related duration end with **`_EXPIRATION`** — not `_EXPIRATION_SECONDS`, `_SECONDS`, or other unit suffixes after `_EXPIRATION`.
- For these names, **values are always in seconds**. Do not encode “seconds” again in the identifier; `_EXPIRATION` implies the unit.

## Do

- Env: `MEMBERSHIP_FREE_TRIAL_EXPIRATION`, `AUTH_JWT_EXPIRATION` (when the value is seconds).
- Constants: `DEFAULT_FREE_TRIAL_EXPIRATION` (number of seconds when unset).

## Don’t

- `DEFAULT_FREE_TRIAL_EXPIRATION_SECONDS`
- `MEMBERSHIP_FREE_TRIAL_EXPIRATION_SECONDS` as an env key (unless a documented compatibility exception applies elsewhere).

## Related

- `@podverse/helpers` documents this in `packages/helpers/src/lib/parseEnvExpiration.ts` for expiration env parsing.
