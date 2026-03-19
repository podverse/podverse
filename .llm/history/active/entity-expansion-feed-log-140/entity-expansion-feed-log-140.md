# entity-expansion-feed-log-140

**Started:** 2026-03-18  
**Context:** GitHub issue #140 – Entity expansion limit exceeded + duplicate feed_log key in on-demand parser.

---

### Session 1 - 2026-03-18

#### Prompt (Developer)

Implement the plan as specified (Debug entity expansion and feed_log duplicate, issue #140). Do NOT edit the plan file. To-do's from the plan have already been created. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Partytime: Bumped `fast-xml-parser` to ^5.3.6 (install used 5.3.7); added `maxTotalExpansions: 10000` in `xml-parser.ts` so feeds with &gt;1000 entity expansions (e.g. fountain.fm, no-agenda) parse successfully.
- Partytime: Added unit test `entity-expansion.test.ts` that parses RSS with 1001 `&amp;` entities and asserts success.
- Podverse ORM: Implemented retry-on-duplicate in `FeedLogService.update()`: on Postgres 23505 (unique_violation), retry `_update` once so the existing row is updated when two concurrent parses race to create the first feed_log row.
- Optional ORM test for concurrent feed_log update was cancelled: ORM package has no test script or test runner.

#### Files Created/Modified

- partytime/package.json – fast-xml-parser ^5.3.6 (or 5.3.7 after install)
- partytime/src/parser/xml-parser.ts – ENTITY_EXPANSION_LIMIT 10000, maxTotalExpansions in parserOptions
- partytime/src/parser/**test**/entity-expansion.test.ts – new unit test for &gt;1000 entities
- packages/orm/src/services/feed/feedLog.ts – update() catches QueryFailedError 23505 and retries \_update once
