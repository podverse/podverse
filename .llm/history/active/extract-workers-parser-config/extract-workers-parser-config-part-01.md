### Session 1 - 2026-05-01

#### Prompt (Developer)

Extract parser config builder from workers `index.ts`

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added `buildWorkersParserConfig` and exported `parseSpamFeedItemThresholdEnv` in `lib/parser/buildWorkersParserConfig.ts`; spam defaults still passed from `index.ts` (ORM `DEFAULT_SPAM_FEED_ITEM_THRESHOLDS`) so the helper does not import `@podverse/orm`.
- Loaded the builder with a dynamic `import()` inside the parser category branch to avoid loading it for non-parser commands.
- Added a small Vitest file for `parseSpamFeedItemThresholdEnv`.

#### Files Created/Modified

- apps/workers/src/lib/parser/buildWorkersParserConfig.ts
- apps/workers/src/lib/parser/buildWorkersParserConfig.test.ts
- apps/workers/src/index.ts
- .llm/history/active/extract-workers-parser-config/extract-workers-parser-config-part-01.md
