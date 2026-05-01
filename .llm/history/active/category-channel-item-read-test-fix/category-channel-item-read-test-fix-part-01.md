# category-channel-item-read-test-fix

## Started

2026-04-30

## Context

API integration test failures in `category-channel-item-read.test.ts`.

---

### Session 1 - 2026-04-30

#### Prompt (Developer)

@/Users/mitcheldowney/.cursor/projects/Users-mitcheldowney-repos-pv-podverse-ansible/terminals/14.txt:1315-1871 debug

#### Key Decisions

- Chapters test: mock item must nest `item_chapters_feed_log` under `item_chapters_feed` so `parseAndGetChapters` sees `last_finished_parse_time` and skips `parseChapters` (avoids real DB access to missing `item_chapters_feed_log` in test schema).
- Live-item unparsed-channel test: use `mockImplementationOnce` so the stub cannot be skewed by queued `mockResolvedValueOnce` calls from other tests when the full api suite runs.

#### Files Modified

- apps/api/src/test/category-channel-item-read.test.ts
