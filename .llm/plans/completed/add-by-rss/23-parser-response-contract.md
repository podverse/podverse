# Add by RSS - Parser Response Contract

## Goal

Define the response shapes for parsed results vs. not-modified so the client can update
storage and UI correctly.

## Scope

- Response payload for parsed data.
- Not-modified response structure.
- Error/failure response structure.

## Key Files

- API handling (downstream):
  [apps/api/src/controllers/account/](/Users/mitcheldowney/repos/pv/podverse/apps/api/src/controllers/account/)
- Parser entry points:
  [packages/parser/src/lib/rss/parser.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/parser.ts)

## Plan

1. Define parsed response:
   - Parsed payload + updated hash.
2. Define not-modified response:
   - Status only + existing hash (optional) to confirm no change.
3. Define failure response:
   - Status + error metadata suitable for client display/logging.
