# Feature: add-by-rss-feeds (Part 2)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history tracking
> system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 21,
> create `add-by-rss-feeds-part-03.md`.

## Metadata

- Started: 2026-02-01
- Completed: 2026-02-05
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/43
- Branch: feature/add-by-rss-feeds
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

High-level planning and subplan breakdown for the Add by RSS feature implementation.

## Sessions

### Session 11 - 2026-02-01

#### Prompt (Developer)

add extra safety, and if the helper is reusable, import it from a helpers module

#### Key Decisions

- Added a reusable `getRecordValue` helper to safely read optional hash entries by URL.
- Updated Add by RSS bulk enqueue to use the helper for safer key access.

#### Files Modified

- packages/helpers/src/index.ts
- packages/helpers/src/lib/record.ts
- packages/mq/src/functions/mq/rss/addByRSSAll.ts

---

## Related Resources

- [Link to PR]
- [Link to related issues]

### Session 12 - 2026-02-01

#### Prompt (Developer)

move the 10-14 mq to completed

#### Key Decisions

- Moved Add by RSS MQ plans 10-14 from active to completed.

#### Files Modified

- .llm/plans/active/add-by-rss/10-mq-queues-and-types.md
- .llm/plans/active/add-by-rss/11-mq-queue-constants.md
- .llm/plans/active/add-by-rss/12-mq-payload-types.md
- .llm/plans/active/add-by-rss/13-mq-enqueue-helpers.md
- .llm/plans/active/add-by-rss/14-mq-dedupe-and-rate-limit.md
- .llm/plans/completed/add-by-rss/10-mq-queues-and-types.md
- .llm/plans/completed/add-by-rss/11-mq-queue-constants.md
- .llm/plans/completed/add-by-rss/12-mq-payload-types.md
- .llm/plans/completed/add-by-rss/13-mq-enqueue-helpers.md
- .llm/plans/completed/add-by-rss/14-mq-dedupe-and-rate-limit.md

### Session 13 - 2026-02-01

#### Prompt (Developer)

update it

#### Key Decisions

- Added a cache-headers subplan to the parse-only overview and noted headers+hash flow.

#### Files Modified

- .llm/plans/active/add-by-rss/20-parser-hash-and-parse-only.md
- .llm/plans/active/add-by-rss/22-parser-hash-computation.md
- .llm/plans/active/add-by-rss/24-parser-cache-headers.md

### Session 14 - 2026-02-01

#### Prompt (Developer)

begin implementing @podverse/.llm/plans/active/add-by-rss/20-parser-hash-and-parse-only.md

#### Key Decisions

- Added request helper to return headers for conditional cache handling.
- Implemented parse-only Add by RSS parser with cache headers and hash fallback.
- Added raw feed hashing helper and exported parse-only types/functions.

#### Files Modified

- packages/helpers-requests/src/\_request.ts
- packages/parser/src/lib/\_request.ts
- packages/parser/src/lib/rss/hash/rawFeed.ts
- packages/parser/src/lib/rss/parser.ts
- packages/parser/src/index.ts

### Session 15 - 2026-02-01

#### Prompt (Developer)

refactor it

#### Key Decisions

- Consolidated request logic into a shared internal helper for both request helpers.

#### Files Modified

- packages/helpers-requests/src/\_request.ts

### Session 16 - 2026-02-01

#### Prompt (Developer)

refactor it

#### Key Decisions

- Moved Add by RSS parse-only logic into a dedicated module to keep parser.ts smaller.

#### Files Modified

- packages/parser/src/lib/rss/addByRSS.ts
- packages/parser/src/lib/rss/parser.ts
- packages/parser/src/index.ts

### Session 18 - 2026-02-01

#### Prompt (Developer)

sounds good. implmenet the plan if you have no further questions

#### Key Decisions

- Added API enqueue/status endpoints for Add by RSS parsing using MQ-only flow.
- Implemented Redis-backed cache entries for parse progress/results.
- Extended Add by RSS MQ message metadata to carry cache headers.

#### Files Modified

- packages/mq/src/types/mq.ts
- packages/mq/src/functions/mq/rss/addByRSS.ts
- packages/mq/src/functions/mq/rss/addByRSSAll.ts
- apps/api/src/lib/addByRSSParseCache.ts
- apps/api/src/controllers/account/accountAddByRSSParse.ts
- apps/api/src/routes/account.ts

### Session 17 - 2026-02-01

#### Prompt (Developer)

move to completed

#### Key Decisions

- Moved Add by RSS parser plans 20-24 from active to completed.

#### Files Modified

- .llm/plans/active/add-by-rss/20-parser-hash-and-parse-only.md
- .llm/plans/active/add-by-rss/21-parser-parse-only-flow.md
- .llm/plans/active/add-by-rss/22-parser-hash-computation.md
- .llm/plans/active/add-by-rss/23-parser-response-contract.md
- .llm/plans/active/add-by-rss/24-parser-cache-headers.md
- .llm/plans/completed/add-by-rss/20-parser-hash-and-parse-only.md
- .llm/plans/completed/add-by-rss/21-parser-parse-only-flow.md
- .llm/plans/completed/add-by-rss/22-parser-hash-computation.md
- .llm/plans/completed/add-by-rss/23-parser-response-contract.md
- .llm/plans/completed/add-by-rss/24-parser-cache-headers.md

### Session 19 - 2026-02-01

#### Prompt (Developer)

if they are fully completed, move them to completed. also, generate the plan file or files
you recommend to work on next, if i should not move onto 40-web yet

#### Key Decisions

- Moved Add by RSS API plans 30-33 into completed.
- Added a workers-side plan for parsing progress updates.

#### Files Modified

- .llm/plans/active/add-by-rss/30-api-enqueue-and-progress.md
- .llm/plans/active/add-by-rss/31-api-endpoints.md
- .llm/plans/active/add-by-rss/32-api-progress-and-results.md
- .llm/plans/active/add-by-rss/33-api-mq-only-guardrails.md
- .llm/plans/completed/add-by-rss/30-api-enqueue-and-progress.md
- .llm/plans/completed/add-by-rss/31-api-endpoints.md
- .llm/plans/completed/add-by-rss/32-api-progress-and-results.md
- .llm/plans/completed/add-by-rss/33-api-mq-only-guardrails.md
- .llm/plans/active/add-by-rss/34-worker-parse-progress.md

### Session 20 - 2026-02-01

#### Prompt (Developer)

implement @podverse/.llm/plans/active/add-by-rss/34-worker-parse-progress.md

#### Key Decisions

- Added workers-side Add by RSS MQ consumer and Redis cache updates.
- Introduced KeyValDB config/validation for workers and documented env vars.

#### Files Modified

- apps/workers/src/lib/keyvaldb/keyvaldb.ts
- apps/workers/src/lib/addByRSSParseCache.ts
- apps/workers/src/commands/mq/rss/runAddByRSSParser.ts
- apps/workers/src/commands/commandNames.ts
- apps/workers/src/commands/index.ts
- apps/workers/src/config/index.ts
- apps/workers/src/index.ts
- apps/workers/src/lib/startup/categoriesForCommand.ts
- apps/workers/src/lib/startup/validation.ts
- apps/workers/package.json
- apps/workers/ENV.md
- apps/workers/.env.example
- packages/mq/src/types/mq.ts
- packages/mq/src/functions/mq/rss/addByRSS.ts
- packages/mq/src/functions/mq/rss/addByRSSAll.ts
- packages/mq/src/index.ts
- .llm/plans/active/add-by-rss/34-worker-parse-progress.md
- .llm/plans/completed/add-by-rss/34-worker-parse-progress.md
