# Add by RSS - Parse-Only Flow

## Goal

Create a parse-only path that fetches and parses RSS content without persisting any ORM
entities.

## Scope

- Parser entry point for Add by RSS parse-only.
- Reuse existing RSS parsing utilities.
- Ensure no Feed/Podcast creation occurs.

## Key Files

- Parser entry points:
  [packages/parser/src/lib/rss/parser.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/parser.ts)
- RSS modules:
  [packages/parser/src/lib/rss/](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/)

## Plan

1. Create a parse-only function that:
   - Accepts `feedUrl` + optional `feedHash`.
   - Fetches and parses RSS content using existing parsing utilities.
   - Produces a normalized parsed payload suitable for client rendering.
2. Ensure the parse-only flow avoids any ORM persistence paths.
