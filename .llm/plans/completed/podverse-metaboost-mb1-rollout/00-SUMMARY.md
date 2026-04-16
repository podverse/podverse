# Podverse MetaBoost + MB1 Rollout Summary

Created: 2026-04-14
Owner: Podverse monorepo
Scope: parser-mapping, web boost flows, donate flow, tests/docs

## Goal

Wire channel-level `podcast:metaBoost` from Partytime `5.0.10` into Podverse boost flows so:

- feeds with valid MetaBoost can use MB1 metadata + confirm flow,
- feeds without MetaBoost keep legacy V4V boost behavior,
- donation flow can optionally enable the same behavior via env/runtime config,
- implementation remains standard-extensible (MB1 first, future standards additive).

## Current-State Audit

### Partytime

- `5.0.10` parses channel-level `podcast:metaBoost` as `{ standard, node }`.
- URL validation supports https by default; optional insecure http via parser option.
- No MB1-specific enum/model; `standard` is currently arbitrary string.

Primary files:

- `../partytime/src/parser/phase/phase-pending.ts`
- `../partytime/src/parser/types.ts`
- `../partytime/src/parser/phase/index.ts`

### Podverse parser-mapping gap

- Partytime `FeedObject.metaBoost` exists in mapping types.
- compat mapping currently sets channel/item value `meta_boost` to `null`.
- Result: parsed channel MetaBoost does not flow into downstream value metadata.

Primary files:

- `packages/parser-mapping/src/types/partytime.ts`
- `packages/parser-mapping/src/compat/partytime/channel.ts`
- `packages/parser-mapping/src/compat/partytime/value.ts`
- `packages/parser-mapping/src/compat/partytime/item.ts`

### Web boost flow

- runtime hooks already support MetaBoost-driven metadata + confirm path.
- behavior depends on `metaBoost` being selected from value metadata.
- if absent, legacy direct payment path continues.

Primary files:

- `apps/web/src/components/Boost/hooks/useBoostSelection.ts`
- `apps/web/src/components/Boost/hooks/useBoostPayments.ts`
- `packages/v4v-metaboost/src/metaBoost.ts`
- `packages/v4v-metaboost/src/mb1CreateBoost.ts`

### Donation flow gap

- donation is env-driven (not RSS-derived values).
- `BoostAppDonateForm` currently passes `metaBoost={null}`.
- therefore MB1 metadata/confirm flow is never used for donation today.

Primary files:

- `apps/web/src/app/donate/page.tsx`
- `apps/web/src/components/Boost/BoostAppDonateForm.tsx`
- `apps/web/src/config/index.ts`
- `apps/web/src/utils/value/appValue.ts`
- `apps/web/src/config/runtime-config.ts`

## Target Behavior

1. Feed has valid `podcast:metaBoost` and supported standard (`mb1`):
   - Boost form uses MB1 metadata + confirmation path.
2. Feed has no MetaBoost or unsupported standard:
   - Boost form works as today without MB1 messaging behavior.
3. Donation page:
   - optional env/runtime MetaBoost config enables same MB1 behavior.
   - no config means unchanged behavior.

## Guardrails

- Keep payment execution BTC-only for now.
- Do not break existing non-MetaBoost boosts.
- Unknown standards must fail soft (non-blocking) and use legacy path.
- Standard integration code should be pluggable (registry/handler style).

## Deliverables

- Implementation plan files `01` through `05`.
- execution orchestration file `00-EXECUTION-ORDER.md`.
- operator prompts in `COPY-PASTA.md`.
