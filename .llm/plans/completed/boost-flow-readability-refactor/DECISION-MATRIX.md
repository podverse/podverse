# Boost/MetaBoost Package Boundary Decision Matrix

## Purpose

Capture move-now/defer package decisions before migration and refactor phases.

## Decisions

| Logic Area | Current Package/Path | Target Package/Path | Move Now / Defer | Rationale | Migration Risk |
| --- | --- | --- | --- | --- | --- |
| MetaBoost standard resolution and strategy (`mb1`, future standards) | `packages/v4v-metaboost/src/metaBoostStandard.ts` | Keep in `@podverse/v4v-metaboost` | Move now (stay) | Protocol/domain logic belongs with MetaBoost package and is reusable by web and future RN | Low |
| MB1 ingest request shaping (`buildMb1CreateBoostRequest`, capability fetch) | `packages/v4v-metaboost/src/mb1CreateBoost.ts`, `mb1FetchCapability.ts` | Keep in `@podverse/v4v-metaboost` | Move now (stay) | Standard-specific payload logic should remain standard package concern | Low |
| Generic unknown guards/parsers (`isObjectLike`, `getOwnPropertyValue`, trimmed/number coercion) | duplicated in `v4v-metaboost`, `v4v-btc-ln`, workers | `packages/helpers/src/lib/guards.ts` | Move now | Cross-domain generic primitives should be centralized in low-tier shared helpers | Medium |
| LNURL/LNAddress transport and provider behavior | `packages/v4v-btc-ln/src/*` | Keep in `@podverse/v4v-btc-ln` | Move now (stay) | Lightning transport logic is domain-specific and should not move to generic packages | Low |
| Web hook orchestration (`useBoostPayments`, `useBoostSelection`) | `apps/web/src/components/Boost/hooks/*` | Keep in app as adapters; extract reusable pure helpers | Move now (partial) | Hooks should be adapter-thin but remain app-level due to React concerns | Medium |
| Potential future cross-app boost-flow core package | none | possible new `@podverse/boost-core` | Defer | Introduce only after current extraction stabilizes and clear RN requirements emerge | Medium |
| Helper-validation / helper-requests relocation of boost logic | N/A | N/A | Defer / reject | These packages are specialized; moving boost-domain logic there would blur layering | Low |

## Notes

- This matrix is the pre-migration gate for V2 order.
- “Move now (stay)” means explicitly keep in current package after review.
- Deferred items must be revisited after phase 10 verification.
