# 180-client-version-header

**Master step:** 22.6
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Send a **mobile client version (+ platform) header on every API request** so the server can log and
slice traffic by app version — supporting the add-only API discipline (179), phased rollout (181),
and post-release monitoring (184).

## Implementation

- **Shared client:** `ApiRequestService` (`packages/helpers-requests/src/api/_request.ts`) gained an
  optional `defaultHeaders?: Record<string, string>` constructor param, merged as the **base** of
  every request's headers (per-request `config.headers` and auth headers still take precedence).
  Backward-compatible — existing consumers (web/api) are unaffected.
- **Mobile header builder:** `apps/mobile/src/auth/mobileClientHeaders.ts` (pure, no RN/Expo imports)
  exports `buildMobileClientHeaders(version, platform)` and the header names:
  - `X-Podverse-Client-Version` — from `Constants.expoConfig?.version` (fallback `unknown`).
  - `X-Podverse-Client-Platform` — from `Platform.OS` (`ios` / `android`).
- **Wiring:** `createMobileApiRequestService` (`apps/mobile/src/auth/mobileApi.ts`) resolves the RN
  values (`expo-constants` + `react-native` `Platform`) and passes `defaultHeaders`, so **all** mobile
  API calls carry the headers.

## Tests

- `apps/mobile/src/auth/mobileClientHeaders.test.ts` covers version+platform emission and the
  `unknown` fallback for null/undefined/empty version. Registered in `apps/mobile/vitest.config.ts`.

## Acceptance criteria

- Every mobile API request includes `X-Podverse-Client-Version` and `X-Podverse-Client-Platform`.
- The shared-client change is additive/optional (no web/api behavior change).
- Pure builder is unit-tested in the node graph.

## Verification

```bash
npm run build -w @podverse/helpers-requests
npm --prefix apps/mobile run test
```
