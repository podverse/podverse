### Session 1 - 2026-04-30

#### Prompt (Developer)

Remove minimum boost amount; optional owner list filter only

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Stripped `minimum_message_amount_minor` / `minimumMessageAmountMinor` from `@podverse/v4v-metaboost` capability parsing and fetch results; legacy field in JSON is ignored.
- Removed client-side threshold blocking for name/message (`convertBoostThresholdAmount` comparison UX) from `BoostFormBase` / `BoostFormFields`; POST errors no longer branch on `below_minimum_boost_amount`.
- Removed unused boost_messages threshold i18n keys (`threshold_notice`, modal strings, conversion error strings tied to client threshold checks).
- Kept `boostThresholdConversion` for baseline estimate only; dropped unused `minimumMessageAmountMinor` from conversion context type.

#### Files Modified

- packages/v4v-metaboost/src/metaBoostCapabilityParseThresholdContext.ts
- packages/v4v-metaboost/src/metaBoostCapabilityParseThresholdContext.test.ts
- packages/v4v-metaboost/src/metaBoostCapabilityFetchResult.ts
- packages/v4v-metaboost/src/mbV1FetchCapability.ts
- packages/v4v-metaboost/src/mbrssV1FetchCapability.ts
- packages/v4v-metaboost/src/mbV1FetchCapability.test.ts
- packages/v4v-metaboost/src/mbrssV1FetchCapability.test.ts
- apps/web/src/components/Boost/BoostFormBase.tsx
- apps/web/src/components/Boost/BoostFormFields.tsx
- apps/web/src/components/Boost/hooks/boostThresholdConversion.ts
- apps/web/src/components/Boost/hooks/useBoostBaselineEstimate.ts
- apps/web/src/components/Boost/hooks/useMbrssV1BoostCapability.ts
- apps/web/src/components/Boost/hooks/useBoostPayments.ts
- apps/web/src/components/Boost/hooks/metaBoostStandardPostAttempt.ts
- apps/web/i18n/originals/en-US.json
- apps/web/i18n/originals/es.json
- apps/web/i18n/originals/fr.json
- apps/web/i18n/originals/el-GR.json
- apps/web/i18n/overrides/es.json
- apps/web/i18n/overrides/fr.json
- apps/web/i18n/overrides/el-GR.json

### Session 2 - 2026-04-30

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/14.txt:849-1245 debug

#### Key Decisions

- `next build` (Turbopack) could not resolve `./metaBoostStandardPostAttempt.js` to the sibling `.ts` source; `shouldAttemptMetaBoostStandardPost` was only `mbrssV1HttpMessagingEnabled`, so inlined that boolean and removed the helper module + its trivial unit test.

#### Files Modified

- apps/web/src/components/Boost/hooks/useBoostPayments.ts
- apps/web/src/components/Boost/hooks/metaBoostStandardPostAttempt.ts (removed)
- apps/web/src/components/Boost/hooks/metaBoostStandardPostAttempt.test.ts (removed)
- .llm/history/active/remove-minimum-boost-amount-list-filter/remove-minimum-boost-amount-list-filter-part-01.md
