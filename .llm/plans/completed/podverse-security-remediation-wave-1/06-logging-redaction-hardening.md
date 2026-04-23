# 06 - Logging and Redaction Hardening (`PVSA-008`, `PVSA-009`)

## Goal

Reduce sensitive data leakage in application and integration logs.

## Target Files

- `/Users/mitcheldowney/repos/pv/podverse/packages/helpers-backend/src/redactForLog.ts`
- `/Users/mitcheldowney/repos/pv/podverse/packages/external-services-podcast-index/src/index.ts`
- any related logger call sites using raw error payloads

## Plan

1. Expand redaction strategy beyond one key:
   - include common secret/token/password key variants.
   - support nested object redaction where needed.
2. Replace raw upstream error payload logging with sanitized summaries:
   - status code
   - endpoint class
   - request correlation id when available
3. Keep deep payload dumps disabled by default.
4. Add tests:
   - redaction unit tests for nested and mixed-case keys.
   - integration/client tests validating log-safe error formatting.

## Verification

```bash
npm run test -w packages/helpers-backend
npm run test -w packages/external-services-podcast-index
npm run lint -w packages/helpers-backend
npm run lint -w packages/external-services-podcast-index
```

## Done Criteria

- Logs no longer emit sensitive values in known key paths.
- Third-party API failures remain diagnosable without raw payload leakage.
