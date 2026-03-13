# 11 - Remaining Work to Reach 5/5

## Goal

Capture all remaining implementation work and open questions required to bring the MetaBoost + LNURL
V4V integration to a complete 5/5 state. This plan supersedes prior subplans and should be treated
as the single source of remaining work.

## Scope

- Podverse monorepo (`/Users/mitcheldowney/repos/pv/podverse`)
- Partytime parser is already updated; no new changes expected here.

## Confirmed Decisions

- `@podverse/external-services-alby` should support both `lnaddress` and `keysend`, and remain sandbox-only.
- Add-by-RSS boost actions must use the same BoostForm/modal flow as core pages (full parity).
- Parsing generated test assets is the official seeding step (no dedicated seed script).
- Rename `@podverse/helpers-v4v-metadata` to `@podverse/helpers-v4v` and extend it with recipient
  normalization helpers.

## Remaining Tasks

### 1) API response verification and alignment

- Confirm all API responses that return channel/item value data include the new `meta_boost` object.
- If any endpoints serialize value data manually, update those serializers to include:
  - `meta_boost.schema`
  - `meta_boost.url`
- Add a quick verification checklist to confirm the JSON shape returned from the relevant endpoints.

### 2) external-services-alby completeness

- Ensure the package explicitly supports both `lnaddress` and `keysend` flows in sandbox mode only.

### 3) Add-by-RSS boost flow parity

- Replace the alert placeholder flow to use the same boost modal/flow as core pages.
- Ensure the add-by-RSS flow uses metaBoost when present and falls back when absent.

### 4) Test assets + seeding finalization

- Update the generator so every value-tagged item includes both `lnaddress` and `keysend` recipients:
  - Three recipients per value set.
  - Splits: 60, 40, and 1 (fee).
  - Placeholder addresses are acceptable.
- Update docs to explicitly call out parsing generated assets as the “seeding” step.

### 5) v4v helpers package rename + normalization

- Rename `@podverse/helpers-v4v-metadata` to `@podverse/helpers-v4v` in `packages/helpers-v4v/`.
- Remove the old package and update imports across the monorepo.
- Add a recipient split normalization helper:
  - Normalize relative to base 100 (e.g., 60 + 40 + 1 is valid).
  - Round down to nearest integer.
  - Use the helper when determining per-recipient amounts.

## Definition of Done

- API responses consistently include `meta_boost` where value data is returned.
- Alby package supports sandbox-only `lnaddress` + `keysend` flows.
- Add-by-RSS behavior is aligned with the chosen parity decision.
- Test/seed workflow is clear and reproducible.
- Recipient splits are normalized via the new v4v helpers.

