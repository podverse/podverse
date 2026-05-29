# Phase 6 — Signup, terms modal, settings toggle

## Goal

Wire account-level ToS and listen-stats opt-in in the web UI.

## Signup (`AuthSignUpForm.tsx`)

Add two checkboxes (pattern from `ModalDisclaimer.tsx` + `TextCheckboxes`):

1. **Required — ToS:** `misc.i_have_read_and_agree` with link to `/terms`
   - Submit disabled until checked
   - Pass `terms_version: config.public.terms.version` to `reqAccountCreate`

2. **Optional encouraged — listen stats:** new i18n
   `authentication.listen_stats_opt_in` + short help
   `authentication.listen_stats_opt_in_help` (mentions popularity,
   pseudonymization, `{retention_days}` days retention)
   - Default **checked**
   - Maps to `allow_listen_stats` in create payload

Show validation if create returns terms version mismatch.

## Terms version modal (`ModalTermsAcceptance.tsx`)

New modal + register in `Modals.tsx` / `ModalsProvider`:

**Show when:**

- User is logged in (`useAccount()`)
- `account.account_terms_acceptance` is null OR
  `account.account_terms_acceptance.terms_version !== config.public.terms.version`

**Behavior:**

- Non-dismissable (no backdrop close, no X)
- Checkbox + Continue (same pattern as environment disclaimer)
- On continue: `reqAccountAcceptTerms({ terms_version })`, refresh account
  context / refetch me

**Do not show** for anonymous users.

Trigger: client effect in `LazyLoadedComponents` or dedicated controller
component mounted once per session.

## Settings toggle

`SettingsAccount.tsx` (or new sub-panel):

- Toggle `allow_listen_stats` with explanation + link to `/terms`
- Call settings PATCH API from phase 3
- Optimistic UI with error toast on failure

## Client stats skip

`apps/web/src/utils/statsTracking/statsTracking.ts`:

- Early return if logged-in account has `allow_listen_stats === false`
- Read from account context / me payload

`NonLiveMediaOrchestrator.tsx` — no change needed if statsTracking guards.

## i18n additions

`authentication` namespace:

- `listen_stats_opt_in`
- `listen_stats_opt_in_help`

`terms_acceptance` namespace (modal):

- `header`
- `message` (version changed)
- `checkbox_label`

## Exit criteria

- Cannot sign up without ToS checkbox
- Listen-stats preference saved at signup
- Logged-in user with stale terms sees blocking modal
- Settings toggle persists and affects stats POSTs

## Verification

```bash
./scripts/nix/with-env npm run lint -w apps/web
```

Manual signup + login flows.
