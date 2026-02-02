# Add by RSS - Overview

## Goal
Implement the Add by RSS feature as a multi-stage effort with clear isolation of MQ parsing, parse-only logic, API orchestration, web UI, and schema validation. Parsing must run through MQ only. Parsed data is stored primarily on the client with hash-based freshness checks.

## Key Constraints
- Parsing must go through MQ only (no direct API parsing).
- MQ queues: `add-by-rss-on-demand` (used now), `add-by-rss-background` (exists, unused for now).
- Parsed data persistence is client-side by default; server-side storage only when explicitly required by another feature (e.g., queue, playlist).
- Hash-based “not modified” response must be supported; client updates/removes hash alongside local data.
- Placeholders for playback, basic auth UX, and notifications.

## Subplans (High-Level)
- MQ and message types: [10-mq-queues-and-types.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/10-mq-queues-and-types.md)
- Parse-only + hashing flow: [20-parser-hash-and-parse-only.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/20-parser-hash-and-parse-only.md)
- API orchestration + progress: [30-api-enqueue-and-progress.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/30-api-enqueue-and-progress.md)
- Web UI + client storage: [40-web-ui-and-client-storage.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/40-web-ui-and-client-storage.md)
- Schema validation + drift handling: [50-schema-validation.md](/Users/mitcheldowney/repos/pv/podverse/.llm/plans/active/add-by-rss/50-schema-validation.md)

## Deferred Items (Placeholders)
- Media playback experience for Add by RSS items.
- Basic-auth username/password UX for protected feeds.
- Notification handling for Add by RSS updates.

## Related Issue
- `#43`
