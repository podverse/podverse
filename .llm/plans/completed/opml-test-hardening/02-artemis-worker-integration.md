# 02 — ActiveMQ Artemis worker integration (OPML import)

## Goal

Add an integration test that exercises the **real** async path end-to-end against a live ActiveMQ
Artemis broker (not the fixtures sync path):

1. Enqueue an OPML import batch via `mqOpmlImportAdd` onto the `opml-import` queue.
2. Run the worker consumer (`apps/workers/src/commands/mq/rss/runOpmlImport.ts` →
   `processOpmlImportJob`) against a test DB + Valkey.
3. Assert the Valkey report reaches `completed` with the expected per-feed outcomes.

## Why

The fixtures sync path (used by mobile/web E2E and API integration tests) bypasses MQ. The broker
delivery, consumer wiring, and dedupe header (`_AMQ_DUPL_ID`) are only exercised in production. This
plan closes that gap, including a regression for the dedupe fix.

## Key assertions

- **Happy path:** batch of directory/PI/unknown feeds resolves to
  `subscribed` / `enqueued_indexed` / `added_by_rss` and the report is `completed`.
- **Dedupe regression (the bug this branch fixed):** enqueue **two** batches with **different**
  `requestId`s inside the dedupe window and assert **both** are processed (they must NOT collapse).
  Then enqueue the **same** `requestId` twice and assert it is delivered once.
  - Reference the pure helper `computeMqDuplicateId` (`packages/mq/src/lib/computeMqDuplicateId.ts`)
    and its unit test for the expected identity: OPML batches dedupe on `requestId`, never `url`.

## Harness requirements

- A broker in the test harness. Options, in order of preference:
  1. A dockerized Artemis brought up by a `make` target (mirror `make test_deps` for Postgres/Valkey;
     add e.g. `make test_deps_mq` or extend `test_deps`).
  2. A testcontainers-style spin-up inside the test file (guard behind an env flag so unit CI can
     skip when no broker is available).
- Deterministic Podcast Index: reuse `resolveE2eOpmlImportFeed`
  (`apps/api/src/lib/opml/e2eOpmlImportFixture.ts`) or inject a stub `podcastGetByFeedUrl` so the
  worker never hits the network.

## Tasks

1. Add the broker harness target/flag and document ports in the test docs.
2. New test (e.g. `packages/mq/src/functions/mq/rss/opmlImport.integration.test.ts` or an
   `apps/workers` integration test) covering the happy path + dedupe regression above.
3. Gate it so `npm run test:unit` / plain CI skips when no broker is present; wire it into whatever
   job runs broker-backed integration tests.

## Operator verification

```bash
make test_deps            # + broker target once added (e.g. make test_deps_mq)
# then the broker-backed integration command this plan introduces
```
