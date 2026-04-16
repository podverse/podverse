# Podverse MetaBoost + MB1 Execution Order

## Rules

- Phases are sequential: complete one phase before starting next.
- Within a phase, only run steps in parallel when explicitly marked.
- Keep scope limited to this plan set; no unrelated refactors.

## Phase 1 - Foundation (Sequential)

1. Implement standard handler contract and MB1 handler.
2. Add BTC-only guardrails for standard resolution and runtime payload shaping.
3. Add focused unit tests for resolver behavior.

Plan file:

- `01-standard-model-and-registry.md`

## Phase 2 - Parser-Mapping Wiring (Sequential)

1. Map `parsedFeed.metaBoost` (channel-level) into compat DTO output.
2. Preserve old behavior when tag absent/invalid.
3. Add parser-mapping tests for channel-level MetaBoost mapping.

Plan file:

- `02-parser-mapping-channel-metaboost.md`

## Phase 3 - Web Boost Integration (Sequential)

1. Update boost selection to resolve standard handlers from mapped meta data.
2. Keep fallback path for unsupported/absent standard.
3. Integrate MB1 metadata + confirm only when supported handler resolves.
4. Add/adjust hook/component tests.

Plan file:

- `03-web-boost-flow-mb1-integration.md`

## Phase 4 - Donation Integration (Sequential)

1. Add runtime/env config for optional donation MetaBoost standard+node.
2. Validate and resolve through same standard handler path.
3. Wire `BoostAppDonateForm` to pass MetaBoost only when valid config exists.
4. Add tests for configured/unconfigured behavior.

Plan file:

- `04-donate-env-metaboost-integration.md`

## Phase 5 - Tests + Docs Closeout (Partially Parallel)

Sequential first:

1. Run full lint/type/test passes for touched packages/apps.
2. Fix breakages.

Then parallel if desired:

3. Update docs (V4V/MetaBoost flow + env docs).
4. Update rollout notes/changelog references.

Plan file:

- `05-tests-and-docs.md`

## Exit Criteria

- Parser-mapping carries channel MetaBoost through.
- Feed boosts: MB1 enabled only when valid supported MetaBoost exists.
- Donation boosts: optional MB1 via env/runtime config.
- Non-MetaBoost flow unchanged.
- BTC-only guard enforced in Podverse runtime behavior.
