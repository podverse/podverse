# Add by RSS - Web UI Client Storage and Hashes

## Goal

Persist Add by RSS parsed payloads and hashes in client storage and keep them in sync.

## Scope

- Client storage choice and structure.
- Hash persistence and update rules.

## Key Files

- Web app routes and UI:
  [apps/web/src/app/](/Users/mitcheldowney/repos/pv/podverse/apps/web/src/app/)

## Plan

1. Use IndexedDB for parsed payload storage and hashes.
2. Store parsed payloads alongside their feed hash and synthetic `id`/`id_text` mappings.
3. When data changes, update the stored hash; when data is removed, remove the hash.
