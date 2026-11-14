**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Identity command result

`v4SeedAccountIdentity` logs an action and returns nothing. The rehearsal has to tell a written account from a left-out email-case twin and from a bad row. Return the action it already decided. Do not change who is written.

## Rows

R30

## Runs after

none

## Files

- `apps/workers/src/commands/orm/v4Identity/seedAccountIdentity.ts`
- `apps/workers/src/commands/orm/v4Rehearsal/identityOutcome.ts` (create)
- `apps/workers/src/commands/orm/v4Rehearsal/identityOutcome.test.ts` (create)

Do not create `v4Rehearsal/index.ts`. Do not edit `seedAccountIdentityLib.ts`, the registry, the phase-status module, or doc 16.

## Tests

Unit tests in `identityOutcome.test.ts` only. Import `classifyIdentityAction` from `./identityOutcome.js`. That module type-imports the command result, so the test does not need a database. No Playwright, no Maestro. Test names are complete sentences.

Cover every action:

- `create`, `repair`, `unchanged`, and `replace` return `{ kind: 'written', accountId }` using the `accountId` on the result.
- `skip_case_variant` returns `{ kind: 'left_out' }`.
- `bad_email`, `bad_name`, `bad_password`, and `bad_verified` return failed with that same action string.
- `skip_id_taken` returns failed `id_taken`.
- `skip_existing_email` returns failed `email_taken`.
- `skip_library_copied`, `skip_has_grants`, and `conflict` return failed with that same action string.
- `would_create`, `would_repair`, `would_replace`, and `help` return failed `unexpected:dry_run` for the three `would_` actions and failed `unexpected:help` for help.

## Release scratchpad

none

## Return type

Export this from `seedAccountIdentity.ts`. `V4IdentityParseFailure` is already exported from `seedAccountIdentityLib.ts` (`bad_email`, `bad_name`, `bad_password`, `bad_verified`). Import it as a type on its own line.

```typescript
export type V4IdentityCommandResult =
  | { action: 'help' }
  | { action: V4IdentityParseFailure; v4Id: string }
  | {
      action:
        | 'skip_id_taken'
        | 'skip_existing_email'
        | 'skip_case_variant'
        | 'skip_library_copied'
        | 'skip_has_grants'
        | 'conflict'
        | 'would_replace'
        | 'would_create'
        | 'would_repair';
      v4Id: string;
    }
  | {
      action: 'create' | 'repair' | 'unchanged' | 'replace';
      v4Id: string;
      accountId: number;
    };
```

`v4SeedAccountIdentity` returns `Promise<V4IdentityCommandResult>`. Keep every existing log line and every existing branch. After the log in that branch, return the object. Do not add `accountId`, the email, the hash, or `otherV4Id` to the log.

| Branch, found by the logged action | Return |
| --- | --- |
| help, before any log | `{ action: 'help' }` |
| `parsed.ok` false, logged `parsed.reason` | `{ action: parsed.reason, v4Id }` |
| `skip_id_taken` | `{ action: 'skip_id_taken', v4Id }` |
| the inner log that uses action `skip_id_taken` when `idTextAccountId` is set | `{ action: 'skip_id_taken', v4Id }` |
| `skip_case_variant` | `{ action: 'skip_case_variant', v4Id }` |
| `skip_existing_email` | `{ action: 'skip_existing_email', v4Id }` |
| `skip_library_copied` | `{ action: 'skip_library_copied', v4Id }` |
| `skip_has_grants` | `{ action: 'skip_has_grants', v4Id }` |
| `would_replace` | `{ action: 'would_replace', v4Id }` |
| `conflict` on the replace path | `{ action: 'conflict', v4Id }` |
| `replace` | `{ action: 'replace', v4Id, accountId }` |
| `would_create` or `would_repair` | `{ action, v4Id }` |
| `conflict` on the create path | `{ action: 'conflict', v4Id }` |
| `create`, `repair`, or `unchanged` | `{ action, v4Id, accountId: scaffold.accountId }` |

`accountId` on `replace` is `emailAccountId`. That block already throws when it is null. If the type is still `number | null` at the return, throw `Could not write the v5 identity.` when it is null. Do not use a type assertion.

The command map in `commands/index.ts` ignores return values. Do not edit that file.

## Classifier

`identityOutcome.ts` has no `pg` and no logger. `import type { V4IdentityCommandResult }` from `../v4Identity/seedAccountIdentity.js`.

```typescript
export type IdentityPhaseOutcome =
  | { kind: 'written'; accountId: number }
  | { kind: 'left_out' }
  | { kind: 'failed'; className: string };

export function classifyIdentityAction(result: V4IdentityCommandResult): IdentityPhaseOutcome
```

- `create`, `repair`, `unchanged`, and `replace`: `written` with that result's `accountId`.
- `skip_case_variant`: `left_out`.
- `bad_email`, `bad_name`, `bad_password`, `bad_verified`: failed with `result.action`.
- `skip_id_taken`: failed `id_taken`.
- `skip_existing_email`: failed `email_taken`. This is an address owned by an account that is not this v4 id's case twin. A left-out twin is only `skip_case_variant`.
- `skip_library_copied`, `skip_has_grants`, `conflict`: failed with `result.action`.
- `would_create`, `would_repair`, `would_replace`: failed `unexpected:dry_run`.
- `help`: failed `unexpected:help`.

Every `className` above matches `^[a-z][a-z0-9_]*(?::[A-Za-z][A-Za-z0-9_]*)?$` and is at most 80 characters. Plan 84 is the only caller.

## Out of scope

Do not mark phase status, do not call the command in a loop, and do not change `preferV4Identity` or `resolveCaseVariant`.
