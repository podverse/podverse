# 311-queue-launch-hydration

**Master step:** 10.2
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

- On app launch (after auth bootstrap), fetch all queues + abridged index using the same wrappers
  web SSR bootstrap uses, via the queue repository sync path.
- Populate the queue store from repository after sync.

## Architecture notes

Web SSR/bootstrap loads queues then abridged resources. Mobile: auth hydrate →
`queueRepository` sync → store set. Prefer focus/launch once; avoid duplicate parallel hydrates.

## Edge cases / cross-track deps

- Token refresh race during hydrate (reuse auth bootstrap sequencing)
- Partial failure: keep previous SQLite snapshot
- Depends on 10.1 store existing

## Acceptance criteria

- Cold start with logged-in user ends with queues + abridged index in store/SQLite
- Anonymous launch does not hit authenticated queue endpoints
- Failure surfaces recoverable error / retry without crashing nav shell

## Web parity references

- Web queue bootstrap / `QueuesProvider` init paths
- Mobile auth bootstrap (Track 6) + `queueRepository`

## Verification

```bash
npm run mobile:e2e:test -- library
npm run mobile:e2e:api:health
```

## Depends on

- 10.1 / 310; auth bootstrap done
