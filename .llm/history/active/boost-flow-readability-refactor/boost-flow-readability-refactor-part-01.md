**Note:** Historical transcript. References to removed MB1 follow-up modules or paths in this file are obsolete.

### Session 1 - 2026-04-14

#### Prompt (Developer)

it looks like the useBoostPayments hooks and related files are rather complex. can they be rewritten so it will be easier to understand what steps are happening? it might be clearer if logic can be moved into more helper functions, so there is a more human readable, less overwhelming flow developers can focus on to understand how the implementation works and its various conditions

the goal of the current plan is to create multiple plan files with clear scope of work so i can implement them one at a time.

also, i am unsure if the current implementation of boosts uses the blip0010 fallback in all cases or only when metaboost is not available. the intention is for metaboost to always be used instead of blip0010 or any other fallback when metaboost with mb1 is available. also, remember that mb1 is just the first standard we intend to support, but the code should be written in a way where other standards can fit within the same logical flow over time as they emerge and we can support them

#### Prompt (Developer)

one more thing to add to the plans is to confirm that all of our deployment processes

local + npm
local docker only
local k8s
remote k8s

are all prepared to handle the new metaboost related logic

create the plan files

#### Key Decisions

- Created a dedicated multi-file plan set under `.llm/plans/active/boost-flow-readability-refactor/`.
- Added an explicit deployment-readiness phase covering local npm, local Docker, local k8s, and remote k8s.
- Kept MB1 precedence over bLIP-0010 fallback as a first-class invariant across all phases.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md

### Session 15 - 2026-04-14

#### Prompt (Developer)

Boost Payments Helper Modularization Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Split monolithic boost payment helpers into concern-focused modules under `apps/web/src/components/Boost/payments/`.
- Isolated MB1 metadata request and confirm logic into `payments/mb1/` while keeping `useBoostPayments` as orchestration.
- Extracted generic payment error parsing and BLIP custom-record builder helpers into reusable payment modules.
- Preserved existing MB1-precedence behavior and validated no drift via web lint/build checks.

#### Files Modified

- apps/web/src/components/Boost/hooks/useBoostPayments.ts
- apps/web/src/components/Boost/hooks/useBoostPayments.helpers.ts (deleted)
- apps/web/src/components/Boost/payments/boostAppConfig.ts
- apps/web/src/components/Boost/payments/boostBlipCustomRecords.ts
- apps/web/src/components/Boost/payments/boostPaymentErrors.ts
- removed web MB1 helper module
- apps/web/src/components/Boost/payments/mb1/mb1RequestMetadata.ts
- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md

### Session 16 - 2026-04-14

#### Prompt (Developer)

improve the modularization. also, we can remove all references to "boostbox" in podverse monorepo as it will not be used

#### Key Decisions

- Removed BoostBox-specific runtime support from web/API and local infra, and switched MB1 metadata flow to direct endpoint calls from `metaBoost.node`.
- Improved payment modularization by slimming MB1 request dependencies (`appName` instead of app config object) and removing the obsolete `boostAppConfig` module.
- Renamed `@podverse/v4v-metaboost` metadata helper module from `boostbox` to `boostMetadata`.
- Removed BoostBox references across active code/docs/makefiles/infra templates while leaving historical `.llm` archives unchanged.
- Validated affected workspaces with lint/build for `@podverse/v4v-metaboost`, `@podverse/web`, and `@podverse/api`.

#### Files Modified

- apps/api/.env.example
- apps/api/src/app.ts
- apps/api/src/config/index.ts
- apps/api/src/controllers/metaboost/boostbox.ts (deleted)
- apps/api/src/lib/startup/validation.ts
- apps/api/src/routes/metaboost.ts (deleted)
- apps/api/src/routes/metaboost/boostbox.ts (deleted)
- apps/web/i18n/originals/el-GR.json
- apps/web/i18n/originals/en-US.json
- apps/web/i18n/originals/es.json
- apps/web/i18n/originals/fr.json
- apps/web/i18n/overrides/el-GR.json
- apps/web/i18n/overrides/es.json
- apps/web/i18n/overrides/fr.json
- apps/web/src/app/v4v/boost-messages/page.tsx
- apps/web/src/components/Boost/hooks/useBoostPayments.ts
- apps/web/src/components/Boost/payments/boostAppConfig.ts (deleted)
- apps/web/src/components/Boost/payments/mb1/mb1RequestMetadata.ts
- docs/architecture/ARCHITECTURE.md
- docs/infra/LOCAL-BOOSTBOX.md (deleted)
- docs/v4v/README.md
- docs/v4v/bitcoin/lnd/LOCAL-V4V-TESTNET-WALKTHROUGH.md
- docs/v4v/bitcoin/lnd/V4V-BITCOIN-LN-FILES-ASSESSMENT.md (deleted)
- docs/v4v/bitcoin/lnd/V4V-BITCOIN-LN-SETUP-DIAGRAM.md
- docs/v4v/bitcoin/lnd/V4V-METABOOST-FLOW.md
- docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md
- docs/v4v/metaboost/llm-spec-proposal.md (deleted)
- infra/config/env-templates/boostbox.env.example (deleted)
- infra/docker/local/boostbox/docker-compose.yml (deleted)
- makefiles/local/Makefile.local.apps.mk
- makefiles/local/Makefile.local.infra.mk
- makefiles/local/Makefile.local.v4v.mk
- packages/v4v-btc-ln/src/test-data/ln-recipients-config.ts
- packages/v4v-metaboost/package.json
- packages/v4v-metaboost/src/boostMetadata.ts
- packages/v4v-metaboost/src/boostbox.ts (deleted)
- packages/v4v-metaboost/src/index.ts
- packages/v4v-metaboost/src/metaBoost.ts
- packages/v4v-metaboost/src/metaBoostStandard.ts
- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md

### Session 17 - 2026-04-14

#### Prompt (Developer)

do it

#### Key Decisions

- Moved generic error parsing helpers (`getErrorCode`, `getErrorResponseStatus`, `getErrorResponseBodyMessage`, `getErrorMessage`) into `@podverse/helpers`.
- Kept provider-specific failure parsing (`getProviderFailure`) in web payment scope and renamed the module to reflect provider coupling.
- Rewired `useBoostPayments` to import generic helpers from `@podverse/helpers` and provider-specific helper from local payment module.
- Validated the change with lint/build for `@podverse/helpers` and `@podverse/web`.

#### Files Modified

- apps/web/src/components/Boost/hooks/useBoostPayments.ts
- apps/web/src/components/Boost/payments/boostPaymentErrors.ts (deleted)
- apps/web/src/components/Boost/payments/boostPaymentProviderFailure.ts
- packages/helpers/src/lib/error/errorParsing.ts
- packages/helpers/src/lib/error/index.ts
- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md

### Session 18 - 2026-04-14

#### Prompt (Developer)

do it

#### Key Decisions

- Extracted pure MB1 confirm helper logic (largest-recipient resolution and legacy confirm payload builder) into `@podverse/v4v-metaboost`.
- Kept transport orchestration (`request` calls and response handling) in the web app layer.
- Updated web MB1 confirm flow to consume shared fallback payload helper.
- Validated changes via lint/build for `@podverse/v4v-metaboost` and `@podverse/web`.

#### Files Modified

- removed web MB1 helper module
- packages/v4v-metaboost/src/mb1CreateBoost.ts
- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md

### Session 19 - 2026-04-14

#### Prompt (Developer)

do it

#### Key Decisions

- Removed all Mb1Legacy compatibility helpers from `@podverse/v4v-metaboost` to enforce greenfield-only MB1 confirm behavior.
- Removed web confirm fallback branch and made MB1 confirm strict: non-2xx confirm now throws.
- Validated strict MB1 confirm behavior changes with lint/build for `@podverse/v4v-metaboost` and `@podverse/web`.

#### Files Modified

- removed web MB1 helper module
- packages/v4v-metaboost/src/mb1CreateBoost.ts
- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md

### Session 20 - 2026-04-14

#### Prompt (Developer)

do that clean up and then @podverse/.llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md:47-48

#### Key Decisions

- Logged prompt before applying MB1 docs cleanup and phase-9 forms/types alignment work.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md

### Session 21 - 2026-04-14

#### Prompt (Developer)

update the plans so they are up to date and ready to proceed. ask me questions if needed.

#### Key Decisions

- Logged prompt before updating active boost-flow-readability-refactor plan files for current repo alignment.
- Marked phase 9 as completed in COPY-PASTA based on already landed forms/types wiring work.
- Removed stale "legacy fallback" wording from active plan invariants/matrix in favor of explicit non-MB1 fallback wording.
- Added explicit phase-10 closure checks for strict MB1 confirm semantics wording and `BoostPaymentAppConfig` ownership decision visibility.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
- .llm/plans/active/boost-flow-readability-refactor/00-SUMMARY.md
- .llm/plans/active/boost-flow-readability-refactor/04-forms-wiring-and-types.md
- .llm/plans/active/boost-flow-readability-refactor/05-verification-and-invariants.md
- .llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md

### Session 22 - 2026-04-14

#### Prompt (Developer)

@podverse/.llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md:52-56

#### Key Decisions

- Logged prompt before executing phase-10 verification commands and artifact updates.
- Executed all phase-10 lint/build commands with the repo Nix wrapper; all passed.
- Captured a phase-10 verification artifact covering required MB1/non-MB1/failure/mixed-recipient behavior evidence and closure checks.
- Marked phase 10 as completed in COPY-PASTA and archived `05-verification-and-invariants.md` from active to completed.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
- .llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md
- .llm/plans/active/boost-flow-readability-refactor/verification-artifacts/phase-10-verification-2026-04-14.md
- .llm/plans/completed/boost-flow-readability-refactor/05-verification-and-invariants.md
- .llm/plans/active/boost-flow-readability-refactor/05-verification-and-invariants.md (moved)

### Session 23 - 2026-04-14

#### Prompt (Developer)

@podverse/.llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md:61-62

#### Key Decisions

- Logged prompt before executing phase-11 deployment-readiness checks and artifacts.
- Ran phase-11 local npm and Docker command sets; collected runtime-config and startup/health evidence.
- Recorded that MetaBoost runtime keys are currently unset in local npm and local Docker sidecar env outputs.
- Recorded local/remote k8s blockers: missing `local_k8s_up` make target and `kubectl` API endpoint timeouts.
- Kept phase 11 as in-progress in COPY-PASTA with explicit blocker list instead of marking complete.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
- .llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md
- .llm/plans/active/boost-flow-readability-refactor/deployment-artifacts/local-npm.md
- .llm/plans/active/boost-flow-readability-refactor/deployment-artifacts/local-docker.md
- .llm/plans/active/boost-flow-readability-refactor/deployment-artifacts/local-k8s.md
- .llm/plans/active/boost-flow-readability-refactor/deployment-artifacts/remote-k8s.md

### Session 14 - 2026-04-14

#### Prompt (Developer)

@podverse/.llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md:42-43

#### Key Decisions

- Implement phase 8 by extracting pure payment-flow helpers out of `useBoostPayments` while preserving MB1-vs-fallback behavior exactly.
- Archive `03-payment-helpers-and-hook-slim.md` after lint/build verification if acceptance criteria are met.
- Completed phase 8 by extracting metadata/confirm/error helper boundaries into `useBoostPayments.helpers.ts` and slimming `useBoostPayments` orchestration flow.
- Archived phase-8 plan file from `active` to `completed` after successful web lint/build verification.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
- .llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md
- .llm/plans/active/boost-flow-readability-refactor/03-payment-helpers-and-hook-slim.md (moved)
- .llm/plans/completed/boost-flow-readability-refactor/03-payment-helpers-and-hook-slim.md
- apps/web/src/components/Boost/hooks/useBoostPayments.helpers.ts
- apps/web/src/components/Boost/hooks/useBoostPayments.ts
- .llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md
- .llm/plans/active/boost-flow-readability-refactor/02-selection-helpers-and-hook-slim.md (moved)
- .llm/plans/completed/boost-flow-readability-refactor/02-selection-helpers-and-hook-slim.md

### Session 13 - 2026-04-14

#### Prompt (Developer)

i don't think you actually moved the plan. are you sure it is completed?

#### Key Decisions

- Corrected phase-7 plan archive status after verification showed `02-selection-helpers-and-hook-slim.md` was still under `active`.
- Moved phase-7 plan file to `completed` and updated `COPY-PASTA.md` to reflect true completion state.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md

### Session 12 - 2026-04-14

#### Prompt (Developer)

@podverse/.llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md:32-33

#### Key Decisions

- Implement phase 6 by introducing an explicit boost execution strategy resolver in `@podverse/v4v-metaboost` and consuming that single strategy result in web boost payments flow.
- Archive `01-boost-strategy-and-registry.md` after validation if acceptance criteria are satisfied.
- Completed phase 6 by adding `resolveBoostExecutionStrategy` and using it in `useBoostPayments`, then archived phase 6 plan file from `active` to `completed`.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
- .llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md
- .llm/plans/active/boost-flow-readability-refactor/01-boost-strategy-and-registry.md (moved)
- .llm/plans/completed/boost-flow-readability-refactor/01-boost-strategy-and-registry.md
- apps/web/src/components/Boost/hooks/useBoostPayments.ts
- packages/v4v-metaboost/src/metaBoostStandard.ts

### Session 11 - 2026-04-14

#### Prompt (Developer)

go

#### Key Decisions

- Execute phase 5 (`12-package-move-migration-and-validation`) validation path by confirming package-move scope, running required build/lint checks, and generating deployment-readiness evidence artifacts for phase 06 coverage.
- Completed phase 5 via the explicit no-op path in `12` (no additional package relocation approved), with clean package/web lint+build validation.
- Added a phase-12 no-op completion note and archived `12-package-move-migration-and-validation.md` from `active` to `completed`.
- Updated phase-5 entry in `COPY-PASTA.md` to completed wording.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
- .llm/plans/active/boost-flow-readability-refactor/12-no-op-completion-note.md
- .llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md
- .llm/plans/active/boost-flow-readability-refactor/12-package-move-migration-and-validation.md (moved)
- .llm/plans/completed/boost-flow-readability-refactor/12-package-move-migration-and-validation.md

### Session 10 - 2026-04-14

#### Prompt (Developer)

go

#### Key Decisions

- Complete remaining scoped Wave 3/4 work by migrating generic helper patterns in boost/metaboost app paths and safe worker paths, then archive phase 4 if acceptance is met.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
- .llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md
- .llm/plans/active/boost-flow-readability-refactor/09-helper-migration-waves.md (moved)
- .llm/plans/completed/boost-flow-readability-refactor/09-helper-migration-waves.md
- apps/web/src/components/Boost/hooks/useBoostPayments.ts
- apps/workers/src/commands/imageShrink/runConsumer.ts

### Session 9 - 2026-04-14

#### Prompt (Developer)

go ahead

#### Key Decisions

- Verified phase 3 (`08-helper-inventory-and-target-modules`) was already implemented and reflected in applied helper target/module work.
- Archived the completed phase-3 plan file from `active` to `completed` and updated `COPY-PASTA.md` to reflect completion.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
- .llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md
- .llm/plans/active/boost-flow-readability-refactor/07-helper-consolidation-summary.md (moved)
- .llm/plans/completed/boost-flow-readability-refactor/07-helper-consolidation-summary.md

### Session 8 - 2026-04-14

#### Prompt (Developer)

do it

#### Key Decisions

- Verified phase 2 (`07-helper-consolidation-summary`) was already implemented.
- Archived the completed phase-2 plan file from `active` to `completed` and updated `COPY-PASTA.md` to reflect completion.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
- .llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md
- .llm/plans/active/boost-flow-readability-refactor/11-package-boundary-review-and-move-decisions.md (moved)
- .llm/plans/completed/boost-flow-readability-refactor/11-package-boundary-review-and-move-decisions.md

### Session 7 - 2026-04-14

#### Prompt (Developer)

@podverse/.llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md:7-8 implement this. if it is already implemented, move it to completed

#### Key Decisions

- Verified the phase-1 gate was already implemented (`11-package-boundary-review-and-move-decisions` plus `DECISION-MATRIX`).
- Archived the completed phase-1 plan file from `active` to `completed` and updated references to prevent broken paths.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
- .llm/plans/active/boost-flow-readability-refactor/DECISION-MATRIX.md
- packages/helpers/src/index.ts
- packages/helpers/src/lib/guards.ts
- packages/helpers/src/lib/unknown.ts (deleted)

### Session 6 - 2026-04-14

#### Prompt (Developer)

do it

#### Key Decisions

- Renamed `packages/helpers/src/lib/unknown.ts` to `packages/helpers/src/lib/guards.ts` for clearer intent.
- Updated shared helper export path accordingly without changing helper semantics.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
- .llm/plans/active/boost-flow-readability-refactor/00-EXECUTION-ORDER.md
- .llm/plans/active/boost-flow-readability-refactor/05-verification-and-invariants.md
- .llm/plans/active/boost-flow-readability-refactor/06-deployment-readiness-all-environments.md
- .llm/plans/active/boost-flow-readability-refactor/12-package-move-migration-and-validation.md
- .llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md

### Session 4 - 2026-04-14

#### Prompt (Developer)

Boost Flow Readability Refactor V2

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Logged prompt before implementing the V2 plan execution work.
- Added the required move-now/defer package-boundary matrix artifact before migration work.
- Scoped helper consolidation to boost/metaboost-related modules first by introducing shared unknown-value helpers in `@podverse/helpers` and migrating `v4v-metaboost` and `v4v-btc-ln` usages.
- Hardened deployment-readiness planning with concrete commands and pass criteria for local npm, local Docker, local k8s, and remote k8s.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
- .llm/plans/active/boost-flow-readability-refactor/DECISION-MATRIX.md
- .llm/plans/active/boost-flow-readability-refactor/06-deployment-readiness-all-environments.md
- .llm/plans/active/boost-flow-readability-refactor/11-package-boundary-review-and-move-decisions.md
- packages/helpers/src/index.ts
- packages/helpers/src/lib/unknown.ts
- packages/v4v-btc-ln/src/lnaddress.ts
- packages/v4v-btc-ln/src/lnurlp.ts
- packages/v4v-metaboost/package.json
- packages/v4v-metaboost/src/boostbox.ts
- packages/v4v-metaboost/src/mb1CreateBoost.ts
- packages/v4v-metaboost/src/metaBoost.ts

### Session 5 - 2026-04-14

#### Prompt (Developer)

make the fixes

#### Key Decisions

- Will harden plan readiness by aligning execution order docs to V2, adding stronger MB1 precedence verification requirements, adding deployment evidence artifacts, and adding an explicit no-op completion path for package-move phase.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md

### Session 2 - 2026-04-14

#### Prompt (Developer)

@podverse/packages/v4v-metaboost/src/mb1CreateBoost.ts:35-49 it seems like generic helpers like this should be defined in a sharable module and imported whenever needed. scan through the whole podverse monorepo for generic helpers of this nature, and move them to a sharable module and import them as needed. add the plan files for this work within the boost-flow- plans the and save those plan files locally

#### Key Decisions

- Logged prompt before adding new helper-consolidation planning files.
- Decided to extend the existing `boost-flow-readability-refactor` plan set with dedicated phases for monorepo helper inventory, shared helper module design, migration waves, and validation.
- Anchored target shared-module location in `@podverse/helpers` while preserving semantics where helper variants differ.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
- .llm/plans/active/boost-flow-readability-refactor/00-SUMMARY.md
- .llm/plans/active/boost-flow-readability-refactor/00-EXECUTION-ORDER.md
- .llm/plans/active/boost-flow-readability-refactor/07-helper-consolidation-summary.md
- .llm/plans/active/boost-flow-readability-refactor/08-helper-inventory-and-target-modules.md
- .llm/plans/active/boost-flow-readability-refactor/09-helper-migration-waves.md
- .llm/plans/active/boost-flow-readability-refactor/10-helper-consolidation-verification.md
- .llm/plans/active/boost-flow-readability-refactor/COPY-PASTA.md
- .llm/plans/active/boost-flow-readability-refactor/11-package-boundary-review-and-move-decisions.md
- .llm/plans/active/boost-flow-readability-refactor/12-package-move-migration-and-validation.md

### Session 3 - 2026-04-14

#### Prompt (Developer)

make sure you review the existing packages related to this work, and if those should be moved around to account for this goal, then do so. create and/or update the plan files

#### Key Decisions

- Logged prompt before updating plan files.
- Will extend plan set with explicit package-boundary review and package move/split decision phase for reusable boost logic.

#### Files Modified

- .llm/history/active/boost-flow-readability-refactor/boost-flow-readability-refactor-part-01.md
