# Feature: add-by-rss-feeds (Part 1)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for development, you can delete this file and the containing directory. The history tracking system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 11, create `add-by-rss-feeds-part-02.md`.

## Metadata

- Started: 2026-02-01
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/43
- Branch: feature/add-by-rss-feeds
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

High-level planning and subplan breakdown for the Add by RSS feature implementation.

## Sessions

### Session 1 - 2026-02-01

#### Prompt (Developer)

Separate the work into distinct high-level plans, and save those plans to files, so that we
can expand upon those plans individually and make them more detailed later

#### Key Decisions

- Split the Add by RSS work into multiple small, isolated plan files.
- Created an overview plan plus five focused subplans for MQ, parser/hash, API, web UI, and
  schema validation.

#### Files Modified

- .llm/plans/active/add-by-rss/00-overview.md
- .llm/plans/active/add-by-rss/10-mq-queues-and-types.md
- .llm/plans/active/add-by-rss/20-parser-hash-and-parse-only.md
- .llm/plans/active/add-by-rss/30-api-enqueue-and-progress.md
- .llm/plans/active/add-by-rss/40-web-ui-and-client-storage.md
- .llm/plans/active/add-by-rss/50-schema-validation.md

### Session 2 - 2026-02-01

#### Prompt (Developer)

Break the @podverse/.llm/plans/active/add-by-rss/10-mq-queues-and-types.md plan into more
detailed subplans if you think it would be beneficial.

#### Key Decisions

- Split the MQ plan into four smaller subplans for constants, payloads, enqueue helpers, and
  dedupe settings.
- Converted the original MQ plan into an overview with links to subplans.

#### Files Modified

- .llm/plans/active/add-by-rss/10-mq-queues-and-types.md
- .llm/plans/active/add-by-rss/11-mq-queue-constants.md
- .llm/plans/active/add-by-rss/12-mq-payload-types.md
- .llm/plans/active/add-by-rss/13-mq-enqueue-helpers.md
- .llm/plans/active/add-by-rss/14-mq-dedupe-and-rate-limit.md

### Session 3 - 2026-02-01

#### Prompt (Developer)

proceed to do the same with @podverse/.llm/plans/active/add-by-rss/20-parser-hash-and-parse-
only.md

#### Key Decisions

- Split the parser plan into three subplans for parse-only flow, hash computation, and
  response contract.
- Converted the original parser plan into an overview with links to subplans.

#### Files Modified

- .llm/plans/active/add-by-rss/20-parser-hash-and-parse-only.md
- .llm/plans/active/add-by-rss/21-parser-parse-only-flow.md
- .llm/plans/active/add-by-rss/22-parser-hash-computation.md
- .llm/plans/active/add-by-rss/23-parser-response-contract.md

### Session 4 - 2026-02-01

#### Prompt (Developer)

proceed with 30-api-enqueue-and-progress subplans

#### Key Decisions

- Split the API plan into subplans for endpoints, progress/results, and MQ-only guardrails.
- Converted the original API plan into an overview with links to subplans.

#### Files Modified

- .llm/plans/active/add-by-rss/30-api-enqueue-and-progress.md
- .llm/plans/active/add-by-rss/31-api-endpoints.md
- .llm/plans/active/add-by-rss/32-api-progress-and-results.md
- .llm/plans/active/add-by-rss/33-api-mq-only-guardrails.md

### Session 5 - 2026-02-01

#### Prompt (Developer)

proceed with 40-web-ui-and-client-storage

#### Key Decisions

- Split the web UI plan into six subplans for nav, list views, updates button, add feed UI,
  detail navigation, and client storage.
- Converted the original web UI plan into an overview with links to subplans.

#### Files Modified

- .llm/plans/active/add-by-rss/40-web-ui-and-client-storage.md
- .llm/plans/active/add-by-rss/41-web-ui-sidebar-and-nav.md
- .llm/plans/active/add-by-rss/42-web-ui-list-views.md
- .llm/plans/active/add-by-rss/43-web-ui-check-for-updates.md
- .llm/plans/active/add-by-rss/44-web-ui-add-feed.md
- .llm/plans/active/add-by-rss/45-web-ui-detail-navigation.md
- .llm/plans/active/add-by-rss/46-web-ui-client-storage.md

### Session 6 - 2026-02-01

#### Prompt (Developer)

proceed with 50-schema-validation

#### Key Decisions

- Split schema validation into three subplans for target inventory, validation approach, and
  failure policy.
- Converted the original schema validation plan into an overview with links to subplans.

#### Files Modified

- .llm/plans/active/add-by-rss/50-schema-validation.md
- .llm/plans/active/add-by-rss/51-schema-validation-targets.md
- .llm/plans/active/add-by-rss/52-schema-validation-approach.md
- .llm/plans/active/add-by-rss/53-schema-validation-failure-policy.md

### Session 7 - 2026-02-01

#### Prompt (Developer)

the name of the branch is add-by-rss-feeds so the history should go in there

#### Key Decisions

- Migrated Add by RSS planning history into this branch-specific history file.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-01.md

---

### Session 8 - 2026-02-01

#### Prompt (Developer)

can @podverse/.llm/history/active/add-by-rss-planning/add-by-rss-planning-part-01.md now be
deleted? if yes, delete it

#### Key Decisions

- Deleted the now-redundant add-by-rss-planning history file after migrating entries to the
  add-by-rss-feeds history file.

#### Files Modified

- .llm/history/active/add-by-rss-planning/add-by-rss-planning-part-01.md

### Session 9 - 2026-02-01

#### Prompt (Developer)

implement @podverse/.llm/plans/active/add-by-rss/10-mq-queues-and-types.md

#### Key Decisions

- Added Add by RSS queue constants and message types for MQ.
- Implemented MQ enqueue helpers for single and bulk Add by RSS feed requests.

#### Files Modified

- packages/helpers/src/lib/mq/mqConstants.ts
- packages/mq/src/types/mq.ts
- packages/mq/src/functions/mq/rss/addByRSS.ts
- packages/mq/src/functions/mq/rss/addByRSSAll.ts
- packages/mq/src/index.ts

### Session 10 - 2026-02-01

#### Prompt (Developer)

Type 'MQQueueName' is not assignable to type 'import("/Users/mitcheldowney/repos/pv/podverse/packages/mq/src/services/activeMQArtemis/index", { with: { "resolution-mode": "import" } }).MQQueueName'.
Type '"add-by-rss-on-demand"' is not assignable to type 'MQQueueName'.ts(2322)
index.ts(23, 3): The expected type comes from property 'queueName' which is declared here on type 'SendMessageParams'

#### Key Decisions

- Expanded MQ queue name union to include Add by RSS queues and DLQ variants.
- Extended MQ message union to include Add by RSS messages and updated dedupe hash logic.

#### Files Modified

- packages/mq/src/services/activeMQArtemis/index.ts

## Related Resources

- [Link to PR]
- [Link to related issues]
