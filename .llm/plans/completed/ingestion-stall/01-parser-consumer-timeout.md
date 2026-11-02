# 01 — Parser consumer timeout (issue 318)

**Cursor model:** Opus 5.5 · **Reasoning:** high

GitHub: https://github.com/podverse/podverse/issues/318

One change: a feed parse that runs past 15 minutes is logged, rejected, and its process exits so
Kubernetes starts a clean one. A process whose event loop is stuck is killed by liveness on the
same budget. No pod can stay `Ready` and silent with a parse that never finishes.

Do not edit `runLiveItemListener.ts` (prompt 02) or add the `mqRSSAddAll` job (prompt 03).

## What is true in the tree

- `ActiveMQArtemisService.consumeMessages` (`packages/mq/src/services/activeMQArtemis/index.ts`)
  awaits `processMessage` inside `withMqConsumerSpan` with no time budget. On throw it rejects with
  `podverse:processing-error` and calls `receiver.add_credit(1)`.
- `ensureReceiver` opens with `credit_window: 0` and grants one credit. Each consumer holds exactly
  one message until its handler settles.
- `consumeMessages` is used by `mqRSSRunParser` (`packages/mq/src/functions/mq/rss/runParser.ts`),
  `mqOpmlImportRun`, `mqAddByRSSRunParser`, `imageShrinkRunConsumer`, and the DLQ consumers.
- `FeedService.tryStartParsing(id, maxParsingAgeMinutes = 15)` (`packages/orm/src/services/feed/feed.ts`)
  already treats an `is_parsing` lock older than 15 minutes as stale. Another worker may then start
  the same feed.
- `ActiveMQArtemisService.close()` closes receivers first, then senders, then the connection, with
  a 10 second bound.
- The `mqRSSRunParser` deployments are `parser-normal`, `parser-live`, and `parser-ondemand` under
  `infra/k8s/base/workers/`. Their liveness and readiness are both `pidof node || exit 1`.
- `/logs` is an `emptyDir` mounted in every worker pod. An `emptyDir` survives a container restart
  inside the same pod.
- The workers image is `node:24-slim`, so `sh`, `cat`, and `date +%s` are available to probes.

## Why the process exits instead of taking the next message

A Node promise cannot be cancelled. A handler that lost the race keeps its database connection and
any open transaction. It can still call `context.delivery.accept()` and `receiver.add_credit(1)`
later, which would put two messages in flight. After 15 minutes `tryStartParsing` also lets another
worker take the same feed while the abandoned parse may still write. Exiting releases all of that:
Postgres rolls back the open transaction when the connection closes, and the new container starts
with one credit and no leftover work.

## Behavior

### Shared budget

1. Add `FEED_PARSE_MAX_MINUTES = 15` to `@podverse/helpers`, next to the other parser or MQ
   constants, with a one-line doc comment: the parsing lock goes stale after this, and the parser
   consumer stops a handler after this.
2. `tryStartParsing` uses it as the default for `maxParsingAgeMinutes`. No behavior change there.

### `consumeMessages` option

3. `consumeMessages(queueName, processMessage, options?)`. `options.handlerTimeoutMs` is opt-in.
   Without it the consumer behaves exactly as today. OPML import, Add by RSS, image shrink, and
   DLQ consumers do not pass it in this change.
4. With `handlerTimeoutMs`, race the span-wrapped handler against a timer started for that one
   message. Clear the timer when the handler settles either way, so the next message starts a
   fresh budget. The worker stays up and consumes one message after another; it never restarts
   between feeds. Put a short comment at the race: the losing promise cannot be
   cancelled, so the process exits.
5. On expiry, once per process:
   - Log one error naming the queue, the AMQP `message_id` when present, the elapsed time, and
     `url` and `podcast_index_id` when the JSON body has them. Never log the whole body.
   - `context.delivery?.reject({ condition: 'podverse:handler-timeout', description })`.
   - Mark the delivery abandoned so the existing catch block does not reject it a second time or
     add credit if the handler throws later.
   - `await this.close()`, then `process.exit(1)`. Do not call `add_credit`.
6. `options.inFlightFilePath` is also opt-in. When set:
   - Write it empty before the receiver is opened. If that first write fails, throw so the worker
     fails at startup. The file must be cleared at startup because `/logs` keeps the previous
     container's file, and a leftover start time would get the new container killed.
   - Write the start time in epoch seconds when a handler starts. Write it empty when the handler
     settles. Do not touch it during a handler.
   - Write a temporary file in the same directory, then rename it over the target, so a probe never
     reads half a number.
   - A failed write after startup is logged and does not stop the consumer.

### Parser wiring

7. `mqRSSRunParser` in `packages/mq` takes the two options and passes them to `consumeMessages`.
   The worker command (`apps/workers/src/commands/mq/rss/runParser.ts`) passes
   `FEED_PARSE_MAX_MINUTES * 60_000` and the in-flight path from config.
8. New env `MQ_CONSUMER_IN_FLIGHT_FILE`, optional, read in `apps/workers` config with no default.
   Unset means no file (local dev and tests). Add it to startup validation as optional for
   `mqRSSRunParser`, to `apps/workers/.env.example` (empty), and to `apps/workers/ENV.md` under
   Message Queue, with what the probe expects. Do not add it to the shared k8s `workers.env`.

### Liveness

9. On `parser-normal`, `parser-live`, and `parser-ondemand` only, set
   `env: MQ_CONSUMER_IN_FLIGHT_FILE=/logs/mq-consumer-in-flight` and change **liveness** to:

   ```sh
   pidof node >/dev/null || exit 1
   f=/logs/mq-consumer-in-flight
   [ -s "$f" ] || exit 0
   [ $(( $(date +%s) - $(cat "$f") )) -lt 960 ]
   ```

   960 seconds is the 15-minute budget plus one minute, so the in-process timer normally exits
   first and liveness is only the backstop for a stuck event loop. Say that in a YAML comment that
   names `FEED_PARSE_MAX_MINUTES`. Keep the existing period, timeout, and failure threshold.
10. Leave **readiness** as `pidof node`. These pods pull from the broker, so `NotReady` would not
    stop or replace a stuck one.

## Tests

Vitest under `packages/mq/src/services/activeMQArtemis/`, next to `shutdown.test.ts`. Fake timers,
a fake receiver that emits `message`, and `process.exit` spied so it does not exit.

- Handler never resolves, `handlerTimeoutMs` set. After the budget: one error log, reject with
  `podverse:handler-timeout`, `close()` called, `process.exit(1)` called once, no `add_credit`.
- Handler throws after it was abandoned: no second reject, no `add_credit`.
- Handler resolves before the budget: advance past the budget, no reject, no exit.
- Several messages in a row, each finishing under the budget but together running well past it:
  no timeout and no exit. The budget is per message, never per process.
- No `handlerTimeoutMs`: no timer. A never-resolving handler does not exit.
- `inFlightFilePath` in a temp directory: empty after startup even when a stale value was there, a
  start time while the handler runs, empty after it settles.

Do not run the tests.

## Do not

- Do not reject and continue consuming after a timeout.
- Do not change readiness, the credit window, or other consumers' behavior.
- Do not set the budget from `DEFAULT_HTTP_TIMEOUT_MS`.
- Do not add an env override for the 15 minutes.

## Release notes entry

Append to `release-notes/scratchpad.md`. Surfaces: workers, k8s. A feed parse past 15 minutes is
rejected with `podverse:handler-timeout` and the parser container restarts. Parser liveness fails
when one message has been in flight for 16 minutes. Operators who deploy their own manifests should
copy the `MQ_CONSUMER_IN_FLIGHT_FILE` env and the liveness command from the base parser deployments.
