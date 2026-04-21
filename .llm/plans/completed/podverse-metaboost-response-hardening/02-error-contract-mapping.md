# Phase 2: Error Contract Mapping

## Objective

Map known Metaboost error contracts to explicit user-visible behavior instead of generic/silent handling.

## Files

- `apps/web/src/components/Boost/payments/mbrssV1/mbrssV1RequestMetadata.ts`
- `apps/web/src/components/Boost/payments/mbV1/mbV1RequestMetadata.ts`
- `apps/web/src/components/Boost/hooks/useBoostPayments.ts`
- `packages/helpers/src/lib/error/errorParsing.ts` (read-only unless helper extension is needed)
- i18n message files used by boost modal text

## Changes

1. Extend POST error classification beyond `sender_blocked`:
   - Add explicit handling for `owner_terms_not_accepted_current`.
   - Preserve server-provided `message` when present; fallback to local i18n key.
2. Define user-facing behavior for owner-terms block:
   - Reuse modal pattern (title/message/primary action), with action copy aligned to terms requirement context.
3. Ensure unknown 4xx/5xx errors are surfaced in a deterministic non-success UX path:
   - No silent swallow that still resolves as success.
4. Keep code-branch boundaries narrow:
   - Parse code and message once.
   - Keep contract-specific checks close to request metadata modules.

## Acceptance Criteria

- `owner_terms_not_accepted_current` yields a clear user message.
- Unknown ingest errors no longer silently become success.
- Existing `sender_blocked` behavior remains intact.
