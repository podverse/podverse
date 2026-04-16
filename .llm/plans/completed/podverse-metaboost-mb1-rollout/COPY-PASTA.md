# Podverse MetaBoost + MB1 Rollout - Copy-Pasta

## Critical Execution Rules

- Execute phases in order.
- Do not start the next phase until the current phase is complete.
- Within this plan set, use one agent per phase to avoid cross-file conflicts.

## Phase 1 - Foundation

```text
Read and execute .llm/plans/active/podverse-metaboost-mb1-rollout/01-standard-model-and-registry.md

Implement the standard resolver/handler foundation with MB1 first, including BTC-only guardrails and fallback behavior for unknown standards.

Follow repository coding rules and update tests for this phase.
```

## Phase 2 - Parser Mapping

```text
Read and execute .llm/plans/active/podverse-metaboost-mb1-rollout/02-parser-mapping-channel-metaboost.md

Wire partytime channel-level metaBoost into parser-mapping compat output while preserving legacy behavior when absent.

Follow repository coding rules and update tests for this phase.
```

## Phase 3 - Web Boost Flow

```text
Read and execute .llm/plans/active/podverse-metaboost-mb1-rollout/03-web-boost-flow-mb1-integration.md

Integrate MB1 selection/payment handling for supported MetaBoost feeds and preserve legacy fallback behavior for unsupported/absent metadata.

Follow repository coding rules and update tests for this phase.
```

## Phase 4 - Donation Special Case

```text
Read and execute .llm/plans/active/podverse-metaboost-mb1-rollout/04-donate-env-metaboost-integration.md

Add optional env/runtime-config-driven MetaBoost handling for the donation boost form with safe fallback when not configured.

Follow repository coding rules and update tests for this phase.
```

## Phase 5 - Tests and Docs Closeout

```text
Read and execute .llm/plans/active/podverse-metaboost-mb1-rollout/05-tests-and-docs.md

Complete verification, documentation updates, and final hardening for rollout readiness.

Follow repository coding rules and ensure command outputs are clean.
```
