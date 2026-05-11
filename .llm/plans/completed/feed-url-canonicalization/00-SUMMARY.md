# Summary — Feed URL canonicalization across ingestion paths

## Objective

Standardize all feed URL handling on canonical, percent-encoded HTTP(S) URLs so feeds whose
"official" string includes spaces can be accepted, queued, parsed, and stored consistently.

## Recommended handling

- Canonical operational format: encoded URL (`%20`), not raw spaces.
- Normalize at API ingress for every endpoint that accepts a feed URL.
- Use canonical URLs for queue payloads, dedupe keys, and DB persistence.
- Keep outbound parser/fetch paths robust when given legacy raw-space URLs.

## Scope

- `apps/api` feed URL ingress validation and normalization.
- `packages/helpers-validation` canonical helper usage.
- `packages/parser` and `packages/helpers-requests` outbound compatibility.
- `packages/orm` URL identity and lookup consistency for feed-related records.
- Focused integration/unit coverage for all impacted paths.

## Out of scope

- Broad refactors unrelated to feed URL normalization.
- UI copy or UX redesign.

## Key risks

- Mixed canonical/raw forms causing duplicate logical records.
- One endpoint normalized while another still rejects raw-space URLs.
- Parser fetch failures if a raw-space URL bypasses ingress normalization.

