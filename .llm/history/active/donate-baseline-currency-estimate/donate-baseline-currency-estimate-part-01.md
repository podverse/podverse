### Session 1 - 2026-04-20

#### Prompt (Developer)

Donate page baseline currency estimate

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Fetch MetaBoost capability whenever `metaBoost` is set, not only when the user is logged in, so `preferred_currency` and `conversion_endpoint_url` populate for baseline amount estimates on `/donate` while anonymous.
- Keep passing `senderGuid` only when logged in so sender-blocking behavior for capability GET stays unchanged.

#### Files Modified

- apps/web/src/components/Boost/BoostFormBase.tsx

### Session 3 - 2026-04-20

#### Prompt (Developer)

So the donate page itself is not fundamentally broken; the regression is that estimate conversion failures are not fail-soft.

Likely why it happens in your local setup:

conversion endpoint URL returned by capability is unreachable from browser context, or
cross-origin/CORS for that endpoint rejects calls from localhost:3002.
The correct hardening is to catch network exceptions in the estimate hook path and degrade to “no estimate” instead of crashing the page.

i need your help fixing the estimate conversion handling, both to fix it and make it actually work, and also to handle the issue more gracefully with a console log warning instead of an error when this type of issue happens

#### Key Decisions

- Confirmed from runtime logs that browser requests to the conversion endpoint throw `TypeError: NetworkError when attempting to fetch resource`, so direct browser calls are not reliable in this local setup.
- Keep fail-soft handling and warning logs, and add a same-origin server proxy fallback (`/api/metaboost/conversion`) so conversion can still succeed without browser CORS/network constraints.
- Keep debug instrumentation in place for post-fix verification before cleanup.

#### Files Modified

- apps/web/src/components/Boost/hooks/boostThresholdConversion.ts
- apps/web/src/components/Boost/hooks/useBoostBaselineEstimate.ts
- apps/web/src/app/api/metaboost/conversion/route.ts
- apps/web/src/components/Boost/hooks/useMbrssV1BoostCapability.ts

### Session 2 - 2026-04-20

#### Prompt (Developer)

Donate Baseline Estimate Rendering Fix

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Keep the previous capability-fetch change and fix the remaining rendering gap by resolving source value type for donate flows from `appRecipientType` and `selectedValueKey` when creator value selections are unavailable.
- Preserve creator/episode/channel behavior by keeping existing precedence first (`selectedItemValue?.type`, then `selectedChannelValue?.type`) and only using donate fallbacks afterward.

#### Files Modified

- apps/web/src/components/Boost/BoostFormBase.tsx

### Session 4 - 2026-04-20

#### Prompt (Developer)

i don't think we want a server-side proxy fallback. i think we want to disable cors on this endpoint/s within metaboost instead

#### Key Decisions

- Removed the web proxy fallback path and deleted the temporary `/api/metaboost/conversion` route so Podverse no longer masks the upstream CORS policy.
- Kept fail-soft conversion error handling and debug instrumentation in place while shifting the fix to Metaboost API CORS routing.

#### Files Modified

- apps/web/src/components/Boost/hooks/boostThresholdConversion.ts
- apps/web/src/app/api/metaboost/conversion/route.ts (deleted)

### Session 5 - 2026-04-20

#### Prompt (Developer)

Donate Estimate UI + Disclaimer Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Removed all temporary debug instrumentation and hypothesis-tagged logging from donate conversion paths while keeping fail-soft conversion behavior.
- Replaced static estimate text rendering with an interactive estimate disclosure that shows a concise hover/tap tooltip, includes a trailing asterisk, and links to a dedicated disclaimer page.
- Added a minimal `/v4v/estimate-disclaimer` page and wired new i18n copy for tooltip + disclaimer content.

#### Files Modified

- apps/web/src/components/Boost/BoostFormBase.tsx
- apps/web/src/components/Boost/hooks/boostThresholdConversion.ts
- apps/web/src/components/Boost/hooks/useBoostBaselineEstimate.ts
- apps/web/src/components/Boost/BoostFormFields.tsx
- apps/web/src/styles/components/Boost/BoostForm.module.scss
- apps/web/src/app/v4v/estimate-disclaimer/page.tsx
- apps/web/i18n/originals/en-US.json
- .llm/history/active/donate-baseline-currency-estimate/donate-baseline-currency-estimate-part-01.md

### Session 6 - 2026-04-20

#### Prompt (Developer)

Ratio Snapshot Conversion Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Replaced per-amount conversion calls in boost threshold utilities with a tuple-keyed snapshot cache and local minor-unit conversion math using `sourceMajorToTargetMajor` ratio metadata.
- Extended capability parsing to consume `conversion_snapshot_endpoint_url` while keeping fallback derivation from `conversion_endpoint_url` for compatibility during rollout.
- Removed baseline-estimate debounce timing so estimate text recalculates immediately on input changes once snapshot data is available.

#### Files Modified

- apps/web/src/components/Boost/BoostFormBase.tsx
- apps/web/src/components/Boost/BoostFormFields.tsx
- apps/web/src/components/Boost/hooks/boostThresholdConversion.ts
- apps/web/src/components/Boost/hooks/boostConversionSnapshotCache.ts
- apps/web/src/components/Boost/hooks/useBoostBaselineEstimate.ts
- apps/web/src/components/Boost/hooks/useBoostPayments.ts
- apps/web/src/components/Boost/hooks/useMbrssV1BoostCapability.ts
- packages/v4v-metaboost/src/metaBoostCapabilityFetchResult.ts
- packages/v4v-metaboost/src/metaBoostCapabilityParseThresholdContext.ts
- packages/v4v-metaboost/src/metaBoostCapabilityParseThresholdContext.test.ts
- packages/v4v-metaboost/src/mbrssV1FetchCapability.ts
- packages/v4v-metaboost/src/mbrssV1FetchCapability.test.ts
- packages/v4v-metaboost/src/mbV1FetchCapability.ts
- packages/v4v-metaboost/src/publicConversionSnapshot.ts
- packages/v4v-metaboost/src/publicConversionSnapshot.test.ts
- packages/v4v-metaboost/src/index.ts
- .llm/history/active/donate-baseline-currency-estimate/donate-baseline-currency-estimate-part-01.md

### Session 7 - 2026-04-20

#### Prompt (Developer)

you can remove the estimate disclaimer page from the tooltip and the page itself

#### Key Decisions

- Removed the `/v4v/estimate-disclaimer` route by deleting its page component.
- Simplified the baseline estimate tooltip to show only `baseline_estimate_tooltip_text` (no link to a disclaimer page).
- Dropped unused tooltip link styling from `BoostForm.module.scss`.

#### Files Modified

- apps/web/src/app/v4v/estimate-disclaimer/page.tsx (deleted)
- apps/web/src/components/Boost/BoostFormFields.tsx
- apps/web/src/styles/components/Boost/BoostForm.module.scss
- .llm/history/active/donate-baseline-currency-estimate/donate-baseline-currency-estimate-part-01.md
