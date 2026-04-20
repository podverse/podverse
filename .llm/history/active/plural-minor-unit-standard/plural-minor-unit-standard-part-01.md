### Session 1 - 2026-04-19

#### Prompt (Developer)

Plural Minor-Unit Standard Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Started implementation from the approved plan in strict to-do order.
- Adopted plural-first minor-unit naming while preserving singular compatibility where external contracts still require it.
- Kept locale JSON files unchanged because all target `types.*.denomination` values were already plural (`satoshis`) across requested locales.

#### Files Modified

- .llm/history/active/plural-minor-unit-standard/plural-minor-unit-standard-part-01.md
- packages/v4v-metaboost/src/boostCurrencyInput.ts
- packages/v4v-metaboost/src/mbrssV1CreateBoost.ts
- packages/v4v-metaboost/src/mbV1CreateBoost.ts
- packages/v4v-metaboost/src/publicConversion.ts
- packages/v4v-metaboost/src/boostCurrencyInput.test.ts
- packages/v4v-metaboost/src/mbrssV1CreateBoost.test.ts
- packages/v4v-metaboost/src/mbV1CreateBoost.test.ts
- packages/v4v-metaboost/src/publicConversion.test.ts
- apps/web/src/components/Boost/BoostFormBase.tsx
- apps/web/src/components/Boost/messages/formatPublicBoostAmountLine.ts
- apps/web/src/components/Boost/payments/mbrssV1/mbrssV1RequestMetadata.ts
- apps/web/src/components/Boost/payments/mbV1/mbV1RequestMetadata.ts
