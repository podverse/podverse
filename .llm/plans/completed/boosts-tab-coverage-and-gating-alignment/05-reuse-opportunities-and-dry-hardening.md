# 05 Reuse Opportunities And Dry Hardening

## Objective
Capture and implement practical reuse opportunities so boost-eligibility behavior stays consistent and maintainable.

## Reuse Opportunities
1. **Shared utility as single source of truth**
   - Keep all eligibility computation in `boostEligibility.ts`.
2. **Optional hook wrapper for component ergonomics**
   - Candidate: `useBoostEligibility(channel, item?)` that memoizes utility results for React consumers.
   - Use only if it reduces call-site noise without obscuring logic.
3. **Shared constants for eligibility dimensions**
   - If conditions evolve, consider explicit constants for required standards (`mbrss-v1`) and ID requirements.
4. **Add-by-RSS input normalization helper (optional)**
   - Candidate: small helper that maps feed -> temporary boost channel + eligibility result to avoid repeated setup code across three add-by-RSS headers.

## Tasks
1. Evaluate whether the optional hook wrapper improves readability in touched components.
2. Add wrapper/helper only if it removes real duplication (do not over-abstract).
3. Ensure no component reintroduces custom ad hoc gating after refactor.

## Acceptance Criteria
- Shared eligibility usage is consistent.
- Any added abstraction demonstrably reduces duplication.
- No new behavior differences across podcast/episode/header/add-by-RSS surfaces.
