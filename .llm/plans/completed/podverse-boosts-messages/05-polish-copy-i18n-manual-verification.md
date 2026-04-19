# 05 - Polish, Copy, i18n, and Manual Verification

## Scope

Finalize UX copy, i18n keys, and manual cross-flow checks after core implementation is complete.

## Target Files

- `/Users/mitcheldowney/repos/pv/podverse/apps/web/i18n/originals/en-US.json`
- Any new/updated component style modules and message-section components under:
  - `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/`
  - `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/`
- Optional Metaboost docs updates if public schema fields changed:
  - `/Users/mitcheldowney/repos/pv/metaboost/docs/MBRSS-V1-SPEC-CONTRACT.md`

## Implementation Steps

1. Ensure user-facing copy exists for:
   - section title(s)
   - loading state
   - empty state
   - error fallback text (exact message requested by product)
   - anonymous sender fallback (`Anonymous`)
2. Validate date display formatting consistency with Podverse conventions.
3. Confirm no interactive dropdown controls were added to Podverse Boost messages (non-goal).
4. Review accessibility:
   - semantic heading level in section
   - link labels readable for breadcrumb navigation
   - pagination controls keyboard-usable.
5. Run manual smoke checklist on donate/channel/item.
6. Run contract spot-checks against Metaboost public endpoints:
   - `senderGuid` absent in each list variant response.
   - breadcrumb fields shape present/absent exactly as documented.

## Verification

From Podverse repo root:

```bash
./scripts/nix/with-env npm run lint -w apps/web
./scripts/nix/with-env npm run dev:web
```

From Metaboost repo root (if API contract/docs changed in the final pass):

```bash
./scripts/nix/with-env npm run lint -w apps/api
./scripts/nix/with-env npm run test -w apps/api -- src/test/mbrss-v1-spec-contract.test.ts
./scripts/nix/with-env npm run test -w apps/api -- src/test/mb-v1-spec-contract.test.ts
```

## Exit Criteria

- UX copy and fallback behavior match requirements.
- Breadcrumb and pagination interactions are stable and accessible.
- Final implementation ready for review/next execution step.
- Public contract checks confirm no `senderGuid` leakage across all standard list variants.
