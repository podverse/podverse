# 01 — Shared rate-limit env parse helper

## Goal

Add a small, testable helper that turns one env value + a known suffix into `{ windowMs, max }`,
with a required default when unset/invalid.

## Scope

- Prefer `packages/helpers` so API and workers can share the same parser (Tier-safe; no app
  imports upward).
- Export named functions (prefer-named-exports).
- Unit tests in the same package.

## Steps

1. Add a module (suggested path:
   `packages/helpers/src/lib/rateLimit/parseCountPerWindowEnv.ts`) that:
   - Accepts something like:
     `parseCountPerWindowEnv({ envValue, suffix, defaultMax })` **or**
     `parseCountPerWindowEnvFromKey({ env, key, defaultMax })` where `key` must end with an
     allowed suffix and the suffix selects `windowMs`.
   - Allowed suffixes → windows:
     - `_PER_MINUTE` → `60_000`
     - `_PER_10_MINUTES` → `600_000`
     - `_PER_HOUR` → `3_600_000`
     - `_PER_DAY` → `86_400_000`
   - Parse max with `Number.parseInt(raw, 10)`; treat empty/NaN/`< 1` as `defaultMax`.
   - Return `{ windowMs: number; max: number }`.
2. Optionally export a map or type for the suffix allowlist so API startup validation / docs can
   reference the same set.
3. Export from `packages/helpers/src/index.ts`.
4. Add unit tests covering: each suffix → correct `windowMs`; valid max; empty/invalid → default;
   reject or ignore keys whose suffix is not in the allowlist (document chosen behavior).
5. Do **not** wire call sites yet (that is plan 02/03).

## Key files

- `packages/helpers/src/lib/rateLimit/parseCountPerWindowEnv.ts` (new)
- `packages/helpers/src/lib/rateLimit/parseCountPerWindowEnv.test.ts` (new)
- `packages/helpers/src/index.ts`

## Out of scope

- `.env.example` / K8s / routes
- Soft OPML feed counter logic

## Operator verification

```bash
# Root
npm run build -w @podverse/helpers
npm run test -w @podverse/helpers
```
