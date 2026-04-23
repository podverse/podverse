### Session 1 - 2026-04-21

#### Prompt (Developer)

Parser collision hardening plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Started execution from the attached plan, beginning with the first todo in progress.
- Updated `BaseOneService` to perform read-before-write checks through write/transaction repositories, so one-to-one saves do not race against stale reads from the read datasource.
- Added an atomic feed parse-lock acquisition (`tryStartParsing`) and moved lock acquisition earlier in parsing to reduce overlap windows between concurrent refresh requests.
- Made lock release unconditional in parser `finally` when the current run acquired the lock, while still updating `last_parsed_file_hash` only when a parsed feed is available.
- Introduced shared stable-key helpers for parsed items and used them to dedupe live items and skip live-item processing when a matching regular item was already parsed in the same run.
- Added parser regression tests that cover mixed item/live-item overlap and repeated same-item dedupe behavior.

#### Files Modified

- packages/orm/src/services/base/baseOneService.ts
- packages/orm/src/services/feed/feed.ts
- packages/parser/src/lib/rss/parser.ts
- packages/parser/src/lib/rss/liveItem/liveItem.ts
- packages/parser/src/lib/rss/itemStableKey.ts
- packages/parser/src/lib/rss/itemStableKey.test.ts
- .llm/history/active/parser-collision-hardening/parser-collision-hardening-part-01.md
