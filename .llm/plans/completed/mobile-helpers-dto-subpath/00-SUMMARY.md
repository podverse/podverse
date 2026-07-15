# Mobile helpers DTO subpath

**Status:** completed
**Trigger:** Leftover TODO in AuthProvider after mobile-auth-nav-tech-debt/03 deferred
`DTOAccount` off a helpers subpath because none existed yet.

## Goal

Add a mobile-safe `@podverse/helpers/dto` package export and switch mobile `DTOAccount`
imports off the helpers barrel. Remove the TODO — no deferral comments left on this branch.

## Locked decisions

| Item | Decision |
| ---- | -------- |
| Export name | `@podverse/helpers/dto` → `dist/dtos/index.{js,d.ts}` |
| Source | Existing `packages/helpers/src/dtos/index.ts` barrel (no new package / no deep `src/` imports) |
| Call sites | AuthProvider + LoginScreen only (current barrel DTOAccount users) |
| Docs | Note in APPS-MOBILE.md Metro/helpers section |

## Out of scope

- Migrating every helpers consumer off the barrel
- Refactoring DTO folder layout
- Value imports of Node-only helpers modules on mobile
