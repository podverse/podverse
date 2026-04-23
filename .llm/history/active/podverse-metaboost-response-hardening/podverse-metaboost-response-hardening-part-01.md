### Session 1 - 2026-04-20

#### Prompt (Developer)

Podverse MetaBoost Response Hardening Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Replaced ambiguous MetaBoost post return semantics (`Promise<string | null>`) with deterministic failure signaling by throwing `MetaboostCapabilityPreflightError` after the unreachable prompt has been displayed.
- Added typed MetaBoost POST error classification for `sender_blocked` and `owner_terms_not_accepted_current` via a shared `throwKnownMetaboostPostError` helper in `@podverse/v4v-metaboost`.
- Hardened boost submission lifecycle in `useBoostPayments` by using `finally` for `setIsSubmitting(false)` and preventing `onBoostSuccess` when MetaBoost metadata POST fails.
- Adopted and documented strict capability parsing policy: required fields must be valid, and optional threshold fields hard-fail when present but invalid.
- Added mb-v1 capability parser/fetch tests and POST error mapping tests in `packages/v4v-metaboost`.
- Added localized modal copy keys for owner-terms and generic MetaBoost post-failure messages across supported web originals and locale override stubs.

#### Files Modified

- .llm/history/active/podverse-metaboost-response-hardening/podverse-metaboost-response-hardening-part-01.md
- apps/web/i18n/originals/el-GR.json
- apps/web/i18n/originals/en-US.json
- apps/web/i18n/originals/es.json
- apps/web/i18n/originals/fr.json
- apps/web/i18n/overrides/el-GR.json
- apps/web/i18n/overrides/es.json
- apps/web/i18n/overrides/fr.json
- apps/web/src/components/Boost/hooks/useBoostPayments.ts
- apps/web/src/components/Boost/payments/mbV1/mbV1RequestMetadata.ts
- apps/web/src/components/Boost/payments/mbrssV1/mbrssV1RequestMetadata.ts
- packages/v4v-metaboost/src/index.ts
- packages/v4v-metaboost/src/mbV1FetchCapability.test.ts
- packages/v4v-metaboost/src/mbV1FetchCapability.ts
- packages/v4v-metaboost/src/mbrssV1FetchCapability.ts
- packages/v4v-metaboost/src/metaBoostCapabilityParseThresholdContext.ts
- packages/v4v-metaboost/src/metaboostCapabilityPreflightError.ts
- packages/v4v-metaboost/src/metaboostOwnerTermsNotAcceptedPostError.ts
- packages/v4v-metaboost/src/metaboostPostErrorHandling.test.ts
- packages/v4v-metaboost/src/metaboostPostErrorHandling.ts
