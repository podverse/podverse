# Plan 01 — Foundation URL canonical helper

## Scope

Consolidate and document canonical feed URL behavior in shared validation utilities so all call
sites use one source of truth.

## Key files

- [packages/helpers-validation/src/url.ts](packages/helpers-validation/src/url.ts)
- [packages/helpers-validation/src/index.ts](packages/helpers-validation/src/index.ts)
- [packages/helpers-validation/src/url.test.ts](packages/helpers-validation/src/url.test.ts)

## Steps

1. Confirm `canonicalHttpOrHttpsUrl(urlRaw)` is the canonical entry point for feed URL
   normalization.
2. Ensure helper behavior is explicit:
   - trim input
   - parse as HTTP(S)
   - retry parse with ASCII whitespace replaced by `%20`
   - return canonical `parsed.href`
3. Add/confirm tests for:
   - raw-space URL to encoded canonical URL
   - already encoded URL remains canonical
   - invalid schemes and malformed URLs rejected
4. Document that canonical format is the operational storage and queue format.

## Verification

- `./scripts/nix/with-env npm run test -w @podverse/helpers-validation`

