# Add by RSS - Hash Computation and Comparison

## Goal

Define how feed hashes are computed and compared so the parser can return a not-modified
response when appropriate.

## Scope

- Hash computation inputs.
- Comparison rules for incoming hashes.
- Output of updated hash when data changes.

## Key Files

- Parser entry points:
  [packages/parser/src/lib/rss/parser.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/parser.ts)
- RSS modules:
  [packages/parser/src/lib/rss/](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/)

## Plan

1. Define the hash input:
   - Normalized parsed payload or normalized raw feed.
2. Compute deterministic hash for the current feed state.
3. Compare to optional `feedHash` from the request:
   - If match, return not-modified response.
   - If not match, return parsed payload + updated hash.
4. If cache headers are available, prefer `ETag`/`Last-Modified` conditional request checks
   and use hash as a fallback.
