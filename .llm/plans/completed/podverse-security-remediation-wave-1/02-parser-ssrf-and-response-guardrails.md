# 02 - Parser SSRF and Response Guardrails (`PVSA-003`, `PVSA-004`)

## Goal

Add centralized outbound request protections for parser and worker fetches.

## Target Files

- `/Users/mitcheldowney/repos/pv/podverse/packages/helpers-requests/src/_request.ts`
- `/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/_request.ts`
- `/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/parser.ts`
- `/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/chapters/chapters.ts`
- helper/parser tests for URL policy and size limits

## Plan

1. Define a shared outbound URL policy for parser/service requests:
   - allow `http` and `https` only.
   - deny localhost, loopback, link-local, and private CIDRs.
   - enforce redirect policy (reject or re-validate redirected targets).
2. Add response guardrails:
   - max response body size for text/json feed fetches.
   - explicit timeout defaults and consistent abort handling.
3. Wire parser `_request` wrappers to enforce policy by default.
4. Add tests:
   - blocked URL matrix (`127.0.0.1`, `169.254.169.254`, RFC1918 ranges).
   - oversized response rejection.
   - allowed public URL happy path.
5. Roll through parser call sites to ensure no bypass.

## Verification

```bash
npm run test -w packages/helpers-requests
npm run test -w packages/parser
npm run lint -w packages/helpers-requests
npm run lint -w packages/parser
```

## Done Criteria

- Parser outbound fetch path has enforceable SSRF and size controls.
- Regression tests cover blocked and allowed network targets.
