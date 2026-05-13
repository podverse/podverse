# Open questions (remaining)

## Already resolved

- Mobile auth direction: **Bearer-primary**.
- Initiative scope: **Aggressive two-client extraction**.
- Package names: **`@podverse/management-api-requests`** and **`@podverse/http-request-core`**.
- Mobile token endpoint work: **included in this initiative**.
- Refresh strategy: **rotating refresh tokens**.
- Token model policy: **shared core with explicit per-API overrides**.

## Questions that still affect implementation details

1. **Cross-repo reuse:** keep Podverse-local implementation or design for later reuse in Metaboost.
2. **OpenAPI contract policy for clients:** manual typed wrappers with CI checks (now) vs codegen
   (later phase).

## Decision deadline guidance

- Questions 1–2 can be explicitly deferred with a short note in docs if needed.
