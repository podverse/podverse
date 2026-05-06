### Session 1 - 2026-05-05

#### Prompt (Developer)

our product is not live yet so we are not so afraid of a large migration now instead of a phased rollout. create and save locally plan files to make these changes. be thorough to ensure that the previous intended behavior is still supported with the new approaches. also we do not want references to "legacy" ways of handling things when this work is completed. we just want a future focused implementation that is an improvement on the old approach.

also there is a plan named @/Users/mitcheldowney/.cursor/plans/podcast_index_blocked-reason_i18n_e185e72f.plan.md . does it still need work? can it be adapted to our new database schema that does not use feed_flag_status?

#### Key Decisions

- Created a complete future-focused plan set for replacing `feed_flag_status` with schema and
  workflows based on conditions, policy, and explicit lifecycle state.
- Included a dedicated plan step adapting podcast-index blocked-reason i18n to the new schema
  contract.
- Confirmed the existing `podcast_index_blocked-reason_i18n` plan still needs implementation and
  should be executed through the new schema-focused plan step.

#### Files Modified

- .llm/history/active/feed-flag-status-replacement/feed-flag-status-replacement-part-01.md
- .llm/plans/active/feed-status-table-replacement/00-SUMMARY.md
- .llm/plans/active/feed-status-table-replacement/00-EXECUTION-ORDER.md
- .llm/plans/active/feed-status-table-replacement/01-schema-and-data-migration.md
- .llm/plans/active/feed-status-table-replacement/01b-status-mapping-and-transition-spec.md
- .llm/plans/active/feed-status-table-replacement/05-management-feed-ops-contract-migration.md
- .llm/plans/active/feed-status-table-replacement/05b-management-api-contract-lock.md
- .llm/plans/active/feed-status-table-replacement/07-tests-and-removal-cutover.md
- .llm/plans/active/feed-status-table-replacement/07b-parity-fixture-matrix.md
- .llm/plans/active/feed-status-table-replacement/COPY-PASTA.md
- .llm/plans/active/feed-status-table-replacement/00-SUMMARY.md
- .llm/plans/active/feed-status-table-replacement/00-EXECUTION-ORDER.md
- .llm/plans/active/feed-status-table-replacement/01-schema-and-data-migration.md
- .llm/plans/active/feed-status-table-replacement/02-orm-and-domain-services.md
- .llm/plans/active/feed-status-table-replacement/03-parser-pipeline-migration.md
- .llm/plans/active/feed-status-table-replacement/04-archiver-lifecycle-migration.md
- .llm/plans/active/feed-status-table-replacement/05-management-feed-ops-contract-migration.md
- .llm/plans/active/feed-status-table-replacement/06-web-blocked-reason-and-takedown-i18n.md
- .llm/plans/active/feed-status-table-replacement/07-tests-and-removal-cutover.md
- .llm/plans/active/feed-status-table-replacement/COPY-PASTA.md

### Session 2 - 2026-05-05

#### Prompt (Developer)

tighten the plans and fix gaps

#### Key Decisions

- Added explicit gap-closure planning artifacts before implementation:
  - status-to-new-model mapping specification
  - lifecycle transition matrix with ownership and validation rules
  - forward-only migration guardrails (no edits to existing applied migrations)
  - management API contract lock before migration coding
  - deterministic parity fixture matrix for regression-proof verification

#### Files Modified

- .llm/history/active/feed-flag-status-replacement/feed-flag-status-replacement-part-01.md
