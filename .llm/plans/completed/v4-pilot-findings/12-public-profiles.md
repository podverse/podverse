# 12 — v4 public profiles stay public

**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

## Rows

R12

## Runs after

01 (shares `seedAccountIdentity.ts`). Runs in phase 3 beside 03 and 09; it does not touch
`verifyAccount.ts` or `copyAccountLibraryApply.ts`.

## Why

1,381 v4 users have `users.isPublic = true`, and v4's `getPublicUser` serves those profiles to
anyone. `createIdentity` in `seedAccountIdentity.ts` sets every new account to
`SharableStatusEnum.Private`, so those profile links return 404 after migration, and follows of
those users (13 of the 14 v4 user follows) point at profiles the follower cannot open
(00-FINDINGS F2, 00-SUMMARY Q2). The operator chose to copy the flag.

## Decision

v4 `users.isPublic = true` → v5 account `public`. Anything else (`false`, null) → `private`.
Only accounts the seed creates or replaces take the value; an existing account the seed skips is
not changed.

## Files

- `apps/workers/src/commands/orm/v4Identity/seedAccountIdentity.ts`
- `apps/workers/src/commands/orm/v4Identity/seedAccountIdentityLib.ts` and its test
- `docs/proposals/v4-to-v5-migration/` doc that lists identity fields (`rg -n "sharable|private" docs/proposals/v4-to-v5-migration`)
- `release-notes/scratchpad.md` (only through the final message)

## 1. Read the flag

Add `"isPublic" AS is_public` to `SOURCE_SQL` and `is_public: boolean | null` to its row type and
to the parsed source (`parsed.source.isPublic`).

## 2. Map it

In `seedAccountIdentityLib.ts`:

```ts
/** v4 serves a profile to anyone only when `users.isPublic` is true. */
export function v5AccountSharableStatusForV4(isPublic: boolean | null): SharableStatusEnum {
  return isPublic === true ? SharableStatusEnum.Public : SharableStatusEnum.Private;
}
```

Use it in `createIdentity` in place of `SharableStatusEnum.Private`, and on the `replace` path
wherever the replaced account's fields are rewritten (find where `replace` updates the account;
if it keeps the old `sharable_status_id`, set it from the incoming row too).

## 3. Doc

State the mapping in the identity doc beside the other identity fields.

## Tests

- `seedAccountIdentityLib.test.ts`: `true` → Public; `false` and null → Private.

## Release scratchpad

This prompt shares its phase with another, so put this entry in the final message under
"Release notes entry" instead of writing the file:

```markdown
## v4 public profiles stay public

- Surfaces: workers (v4 migration)
- Change: a v4 account whose profile was public is created public in v5; every other migrated account stays private.
- Who notices: about 1,381 v4 users with public profiles, and people who follow them or have their profile links
- Operator steps: none
```
