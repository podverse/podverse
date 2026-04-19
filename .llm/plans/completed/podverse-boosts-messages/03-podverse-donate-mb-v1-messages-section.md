# 03 - Podverse Donate mb-v1 Messages Section

## Scope

Integrate shared Boost messages section under the donate form, using `mb-v1` public list endpoint semantics.

## Target Files (Podverse)

- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/donate/page.tsx`
- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/BoostAppDonateForm.tsx`
- `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/components/Boost/donateMbrssV1RssContext.ts` (reference only)
- Donate styles:
  - `/Users/mitcheldowney/repos/pv/podverse/apps/web/src/styles/app/donate/Donate.module.scss`
  - or a new dedicated Boost messages section style module.

## Implementation Steps

1. Resolve donate metaboost config from app-level metadata (`getAppValueMetaBoost` source already used in donate form).
2. Determine if donate context is `mb-v1`; if yes, render shared messages section below the form.
3. Provide bucket/public-list context props expected by shared data layer.
4. Ensure section loads async independently from form state.
5. Confirm UI behavior:
   - loading spinner in section
   - error fallback text
   - pagination and section-top scroll behavior.

## Verification

From Podverse repo root:

```bash
./scripts/nix/with-env npm run lint -w apps/web
./scripts/nix/with-env npm run dev:web
```

Manual checks:
- Donate form remains functional.
- Messages section appears beneath form for valid mb-v1 config.
- Section hides gracefully when mb-v1 context is unavailable.

## Exit Criteria

- Donate page has a stable, paginated, async Boost messages section using shared component and mb-v1 source.
