# Add by RSS - Parse-Only + Hashing (Overview)

## Goal

Support parsing RSS feeds without DB persistence, returning parsed results (or not-modified)
based on hash comparison.

## Scope

- Parse-only flow in the RSS parser.
- Hash computation and comparison.
- Return contract for parsed vs. not-modified.

## Key Files
- Parser entry points: [packages/parser/src/lib/rss/parser.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/parser.ts)
- RSS feed/channel/item parsing modules under [packages/parser/src/lib/rss/](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/)

## Subplans

- Parse-only flow:
  [21-parser-parse-only-flow.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/21-parser-parse-only-flow.md)
- Hash computation and comparison:
  [22-parser-hash-computation.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/22-parser-hash-computation.md)
- Response contract (parsed vs. not modified):
  [23-parser-response-contract.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/23-parser-response-contract.md)

## Decisions to Make Later

- Exact hash algorithm and input (normalized parsed payload vs. normalized raw feed content).
- Normalization strategy to keep hash stable across minor feed formatting differences.
