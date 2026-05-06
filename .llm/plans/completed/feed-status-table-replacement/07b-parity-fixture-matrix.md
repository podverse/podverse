# 07b — Parity fixture matrix

## Goal

Define deterministic scenario fixtures and expected outcomes before removal cutover to verify
behavior parity end-to-end.

## Fixture scenarios (minimum set)

1. Active clean feed
- lifecycle: active
- conditions: none
- expected policy: parse/public/add true

2. Oversized-only feed
- lifecycle: active
- conditions: oversized_detected
- expected policy: parse false, public true, add false

3. Spam-only feed
- lifecycle: active
- conditions: spam_detected
- expected policy: parse false, public false, add false

4. Spam + oversized concurrent
- lifecycle: active
- conditions: spam_detected, oversized_detected
- expected policy: parse false, public false, add false
- expected primary reason precedence: spam or takedown precedence as defined in policy rules

5. Spam permitted feed
- lifecycle: active
- conditions: spam_detected, spam_permitted
- expected policy: parse true, public/add per defined permitted-spam policy

6. Pending archive feed
- lifecycle: pending_archive
- conditions: optional archival condition
- expected policy: parse/public/add false

7. Archived feed
- lifecycle: archived
- conditions: optional archival condition
- expected policy: parse/public/add false

8. Takedown feed
- lifecycle: takedown
- conditions: takedown_active
- expected policy: parse/public/add false, primary reason takedown_active

9. Manual block feed
- lifecycle: active
- conditions: manual_block
- expected policy: parse/public/add false, primary reason manual_block

10. Policy override scenario
- lifecycle: active
- conditions: spam_detected
- override: parse_allowed_override=true
- expected policy: parse true with tracked override provenance

11. Transition validation failure
- lifecycle transition attempt: archived -> active (without override path)
- expected: 400/validation failure, no mutation

12. Unknown condition key rejection
- request includes unknown key
- expected: 400 and no state mutation

## Test layer mapping

- ORM unit tests: condition->policy computation and transition validation.
- Parser integration tests: condition activation/deactivation and skip behavior.
- Management API integration tests: contract validation + audit snapshots.
- Web/management-web E2E tests: blocked/takedown rendering and operations workflow.

## Completion criteria

- All fixtures are represented in tests.
- Expected policy/lifecycle outputs are asserted exactly, not loosely.

---

## Traceability (implemented)

| # | Scenario | Test / artifact |
|---|----------|-----------------|
| 1–10 | Condition + lifecycle → effective policy | `packages/orm/src/lib/feedEffectivePolicyComputed.test.ts` (imports pure module `feedEffectivePolicyComputed.ts`; scenarios 1–10 with strict `toBe` assertions). |
| 10 | Override merge semantics (parse true while spam active) | Same file, scenario **10** documents merge after `computeEffectivePolicyFromConditionKeys`. |
| 11 | Transition `archived`→`active` denied | `packages/orm/src/lib/feedLifecycleTransitionValidation.test.ts` (`assertLifecycleTransitionAllowed` throws); **HTTP**: `apps/management-api/src/routes/feedFlagStatus.integration.test.ts` (parity **#11**). |
| 12 | Unknown `active_condition_keys` | `feedFlagStatus.integration.test.ts` (parity **#12**). |
| Parser | Condition-driven parser paths | `packages/parser/src/lib/rss/parser.parseRSSFeedAndSaveToDatabase.conditions.test.ts` (header references **07b**). |
| Web / mgmt UI | Blocked banner + feed-operations | Prompt **06** i18n + `apps/management-web/e2e/feed-operations-flag-status.spec.ts`; verify with `make e2e_test_management_web_report_spec SPEC=e2e/feed-operations-flag-status.spec.ts` and web smoke. |

## Implementation notes

- **`pending_archive`** lifecycle gates are enforced in `applyLifecycleConstraintsToEffectiveFlags` / `applyLifecycleConstraintsToComputedPolicy` alongside archived/takedown (`packages/orm/src/lib/feedEffectivePolicyComputed.ts`).
- Pure policy helpers were extracted from `FeedPolicyService` so parity tests do not load `AppDataSource` / full entity barrel.
