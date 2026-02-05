# Add by RSS - Parser Cache Headers

## Goal

Use HTTP cache headers (ETag/Last-Modified) for conditional requests, with hash fallback when
headers are unavailable.

## Scope

- Conditional request headers (`If-None-Match`, `If-Modified-Since`).
- Handling `304 Not Modified` responses.
- Persisting cache metadata alongside client-stored payloads.

## Key Files

- Parser entry points:
  [packages/parser/src/lib/rss/parser.ts](/Users/mitcheldowney/repos/pv/podverse/packages/parser/src/lib/rss/parser.ts)
- Web client storage:
  [apps/web/src/app/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/)

## Plan

1. Accept optional cache metadata in parse-only requests:
   - `etag`, `lastModified`, and `feedHash` (fallback).
2. Make conditional HTTP requests using cache headers when provided.
3. If response is `304 Not Modified`, return not-modified result without parsing.
4. If response is `200`, parse and return payload with updated `etag`/`lastModified` and hash.
5. Persist cache metadata in client storage alongside the parsed payload.
