### Session 1 - 2026-04-19

#### Prompt (Developer)

Boost form baseline conversion and message precheck

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added a new debounced baseline-estimate hook for per-input converted display values and kept visibility conditional to `sourceCurrency !== preferredCurrency`.
- Kept estimate rendering inline to the right of each amount input by restructuring amount input layout rows in `BoostFormFields`/SCSS.
- Reused existing public conversion endpoint plumbing (`convertBoostThresholdAmount`) for both inline estimates and threshold checks.
- Added a submit-time threshold precheck in `useBoostPayments` when a non-empty message is present; if below threshold, opens a modal offering to send without message or cancel.
- Refactored submit flow to thread `effectiveMessage` through payment/post paths so “send without message” behavior is deterministic.
- Added new `boost_messages` i18n keys for the below-threshold modal in required web locales and matching override placeholders.

#### Files Modified

- apps/web/src/components/Boost/hooks/useBoostBaselineEstimate.ts
- apps/web/src/components/Boost/BoostFormFields.tsx
- apps/web/src/styles/components/Boost/BoostForm.module.scss
- apps/web/src/components/Boost/BoostFormBase.tsx
- apps/web/src/components/Boost/hooks/useBoostPayments.ts
- apps/web/i18n/originals/en-US.json
- apps/web/i18n/originals/es.json
- apps/web/i18n/originals/fr.json
- apps/web/i18n/originals/el-GR.json
- apps/web/i18n/overrides/es.json
- apps/web/i18n/overrides/fr.json
- apps/web/i18n/overrides/el-GR.json
- .llm/history/active/boost-form-baseline-conversion/boost-form-baseline-conversion-part-01.md
