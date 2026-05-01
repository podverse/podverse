# api-v2-alignment

**Started:** 2026-04-30  
**Author:** LLM session  
**Context:** Podverse HTTP API uses `/v2`; Metaboost HTTP API and MetaBoost Standard URLs stay on `/v1`.
Cross-repo GitOps env aligned accordingly.

### Session 8 - 2026-04-30

#### Prompt (Developer)

Boost: MetaBoost + BLIP + Threshold Alignment

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Removed client-side suppression of MetaBoost POST when converted boost amount is below bucket minimum; POST attempt follows `shouldAttemptMetaBoostStandardPost` (HTTP messaging capability only).
- Dropped threshold/source amount props from `useBoostPayments`; threshold UX remains in `BoostFormBase` for name/message fields only.
- MetaBoost POST failures with `below_minimum_boost_amount` use `threshold_below_minimum_modal_title` plus API `message` when present.
- Metaboost spec docs corrected: `minimum_message_amount_minor` defaults to `0` at schema layer (replacing outdated USD 0.10 note); documented ingest `below_minimum_boost_amount` and public list `minimumAmountMinor` behavior already in OpenAPI lists.

#### Files Created/Modified

- `.llm/history/active/api-v2-alignment/api-v2-alignment-part-01.md`
- `apps/web/src/components/Boost/hooks/metaBoostStandardPostAttempt.ts`
- `apps/web/src/components/Boost/hooks/metaBoostStandardPostAttempt.test.ts`
- `apps/web/src/components/Boost/hooks/useBoostPayments.ts`
- `apps/web/src/components/Boost/BoostFormBase.tsx`
- `metaboost/docs/MB-V1-SPEC-CONTRACT.md`
- `metaboost/docs/MBRSS-V1-SPEC-CONTRACT.md`

### Session 7 - 2026-04-30

#### Prompt (Developer)

go with the simpler path

#### Key Decisions

- Removed `omitBlipMetadataInKeysend` from `sendPayments` and deleted `shouldOmitBlipMetadataInKeysend`; node keysend BLIP inclusion is governed only by `desc !== null || allowBlipFallback`.
- Deleted `useBoostPayments.test.ts` that only covered the removed helper.

#### Files Created/Modified

- `.llm/history/active/api-v2-alignment/api-v2-alignment-part-01.md`
- `apps/web/src/components/Boost/hooks/useBoostPayments.ts`
- `apps/web/src/components/Boost/hooks/useBoostPayments.test.ts` (removed)

### Session 6 - 2026-04-30

#### Prompt (Developer)

MetaBoost + Legacy Node Message Hybrid

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- MetaBoost submissions no longer suppress BLIP metadata for node recipients; boost sends now keep legacy BLIP keysend message metadata while still performing MetaBoost POST.
- Lnaddress flow remains unchanged.
- Added focused unit tests for `shouldOmitBlipMetadataInKeysend` to lock hybrid routing behavior for null, `mbrss-v1`, and `mb-v1` inputs.

#### Files Created/Modified

- `.llm/history/active/api-v2-alignment/api-v2-alignment-part-01.md`
- `apps/web/src/components/Boost/hooks/useBoostPayments.ts`
- `apps/web/src/components/Boost/hooks/useBoostPayments.test.ts`

### Session 5 - 2026-04-30

#### Prompt (Developer)

MetaBoost Public Messages From Capability

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- `public_messages_url` from capability (`GET /boost/:bucketIdText`) is now the only source for public-message fetching in Podverse.
- Removed URL-path derivation in `packages/v4v-metaboost/src/publicMessages.ts`; callers must pass an explicit public messages URL.
- When capability omits `public_messages_url`, web message fetchers are not created and the public messages section is not rendered.
- Kept `public_messages_url` optional and non-error behavior aligned with Metaboost spec-contract tests/docs (no Metaboost code changes required).

#### Files Created/Modified

- `.llm/history/active/api-v2-alignment/api-v2-alignment-part-01.md`
- `packages/v4v-metaboost/src/metaBoostCapabilityFetchResult.ts`
- `packages/v4v-metaboost/src/mbV1FetchCapability.ts`
- `packages/v4v-metaboost/src/mbrssV1FetchCapability.ts`
- `packages/v4v-metaboost/src/publicMessages.ts`
- `packages/v4v-metaboost/src/mbV1FetchCapability.test.ts`
- `packages/v4v-metaboost/src/mbrssV1FetchCapability.test.ts`
- `packages/v4v-metaboost/src/publicMessages.boostPath.test.ts`
- `apps/web/src/components/Boost/hooks/useMbrssV1BoostCapability.ts`
- `apps/web/src/components/Boost/messages/fetchPublicBoostMessages.ts`
- `apps/web/src/components/Boost/messages/useBoostMessagesView.ts`
- `apps/web/src/app/donate/page.tsx`

### Session 4 - 2026-04-30

#### Prompt (Developer)

MetaBoost ingest URLs: trim-only (no forced `/v1`)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- **`normalizeMetaboostMbrssV1IngestNodeUrl`:** trim, reject empty, validate with `new URL`; **no `pathname` rewriting** (no `/v2/*` or `/v1/s/` → `/v1/standard/`).
- **`mbV1IngestUrl`:** detect **`/mb-v1/boost/`** anywhere in pathname for recognition/normalization; trim-only normalize aligned with mbrss.
- **`publicMessages`:** derive public message URLs via **`parseBoostApiPrefixAndBucketShortId`** using markers **`/mbrss-v1/boost/`** and **`/mb-v1/boost/`**, preserving API prefix segments before the marker (prefix-agnostic).
- Added **`publicMessages.boostPath.test.ts`** for fetch URL assertions with `/v1/s/` and `/v2/standard/` prefixes.

#### Files Created/Modified

- `packages/v4v-metaboost/src/mbrssV1IngestUrl.ts`
- `packages/v4v-metaboost/src/mbV1IngestUrl.ts`
- `packages/v4v-metaboost/src/publicMessages.ts`
- `packages/v4v-metaboost/src/mbrssV1IngestUrl.test.ts`
- `packages/v4v-metaboost/src/mbV1IngestUrl.test.ts`
- `packages/v4v-metaboost/src/mbrssV1FetchCapability.test.ts`
- `packages/v4v-metaboost/src/mbV1FetchCapability.test.ts`
- `packages/v4v-metaboost/src/publicMessages.boostPath.test.ts`
- `.llm/history/active/api-v2-alignment/api-v2-alignment-part-01.md`

### Session 2 - 2026-04-30

#### Prompt (Developer)

i see that you changed all the "v1" to "v2" in the current uncommitted changes, but we do NOT need "metaboost" api endpoints to be v2. we only need podverse endpoints to be v2

#### Key Decisions

- **Podverse:** Keep management-api / main API version paths at **`/v2`** (unchanged from Session 1 intent for Podverse only).
- **Metaboost:** Defaults, Next rewrite destination, management-api config fallback, docs tables, README examples back to **`/v1`**; GitOps **`metaboost.cc`** `API_VERSION_PATH` / sidecars **`/v1`**.
- **`@podverse/v4v-metaboost`:** MetaBoost Standard paths **`/v1/standard/*`**; normalize **`/v1/s/`** → **`/v1/standard/`**; accept mistaken **`/v2/s/`** and **`/v2/standard/`** and rewrite to **`/v1/standard/`** for feed resilience.
- **Docs:** `V4V-METABOOST-LNURL.md` examples use **`api.metaboost.cc/v1/s/...`**.

#### Files Created/Modified

- `packages/v4v-metaboost/src/mbrssV1IngestUrl.ts`, `mbV1IngestUrl.ts`, `publicMessages.ts`, `mbrssV1IngestUrl.test.ts`, `*.test.ts` under `packages/v4v-metaboost/src/`
- `apps/api/src/test/external-services-and-meta.test.ts`
- `docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md`

### Session 3 - 2026-04-30

#### Prompt (Developer)

@podverse/packages/v4v-metaboost/src/mbrssV1IngestUrl.test.ts:17-26 i don't think we want a test for this. the code should not be forcing metaboost to v1. we simply shouldn't make reference to metaboost v2 in tests. the metaboost url in actual code logic will be able to be any version.

#### Key Decisions

- Remove test assertions that explicitly reference mistaken `/v2/*` Metaboost URLs.
- Keep normalization tests focused on legacy `/v1/s/` to `/v1/standard/` behavior and neutral URL handling without encoding a hard v2→v1 assumption in test wording.

#### Files Created/Modified

- `packages/v4v-metaboost/src/mbrssV1IngestUrl.test.ts`
- `.llm/history/active/api-v2-alignment/api-v2-alignment-part-01.md`

### Session 1 - 2026-04-30

#### Prompt (Developer)

search for all instances of api version "v1" in podverse metaboost k.podcastdj.com and metaboost.cc

they should actually be on v2

#### Prompt (Developer)

we do not need backward compatible, just align on v2

#### Key Decisions

- Podverse: management-api K8s env and probes, test/playwright defaults, v4v-metaboost normalization and public message URLs use `/v2`; legacy `/v2/s/` → `/v2/standard/` only (no `/v1/*` normalization).
- Docs/skills updated where they referenced `/api/v1` for management API routes.

_Narrowing (Session 2):_ `@podverse/v4v-metaboost` MetaBoost node URLs target **`/v1/standard/*`** again; Podverse HTTP API **`/v2`** unchanged.

#### Files Created/Modified

- infra/k8s/base/management-api/source/management-api.env
- infra/k8s/base/management-api/deployment.yaml
- apps/api/src/test/setup.ts
- apps/management-api/vitest.setup.ts
- apps/web/playwright.e2e-server-env.ts
- apps/management-web/playwright.config.ts
- packages/v4v-metaboost/src/mbrssV1IngestUrl.ts, mbV1IngestUrl.ts, publicMessages.ts
- packages/v4v-metaboost/src/\*.test.ts (paths updated)
- apps/api/src/test/external-services-and-meta.test.ts
- packages/helpers-backend/src/summarizeUpstreamHttpErrorForLog.test.ts
- .cursor/skills/api-testing/SKILL.md
- apps/management-api/APPS-MANAGEMENT-API.md
- docs/operations/MANAGEMENT-DATABASE-CONSOLE.md
- docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md
