# Feature: workers-mq-init (Part 1)

## Metadata

- Started: 2026-02-04
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor
- GitHub Issues: N/A
- Branch: feature/add-by-rss-feeds
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Fix workers MQ initialization for parser RSS parse feed and audit other commands.

## Sessions

### Session 1 - 2026-02-04

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Add MQ category to parserRSSParseFeed command grouping and audit other commands for mismatches.
- Update workers env table to reflect MQ usage for parserRSSParseFeed.

#### Files Modified

- apps/workers/src/lib/startup/categoriesForCommand.ts
- apps/workers/ENV.md
- .llm/history/active/workers-mq-init/workers-mq-init-part-01.md
