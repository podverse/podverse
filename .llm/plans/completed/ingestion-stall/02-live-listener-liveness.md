# 02 — Live item listener liveness (issue 319)

**Cursor model:** Opus 5.5 · **Reasoning:** high

GitHub: https://github.com/podverse/podverse/issues/319

One change: `mqRSSRunLiveItemListener` reconnects when the Podping socket stops delivering, even if
`close` and `error` never fire, and each reconnect is visible in the logs.

Prompt 01 already changed the parser consumer. Do not edit it here.

## What is true in the tree

`packages/mq/src/functions/mq/rss/runLiveItemListener.ts`:

- `new WebSocket(url)` has no options, so a handshake can wait forever.
- `openedSocket` is cleared only by `close` and `error`. The 5 second reconnect interval runs only
  when `!openedSocket`, so a socket that dies with no close frame disables recovery.
- `connect()` has no in-flight guard. A connect that never opens and never errors leaves
  `openedSocket` null, and each tick starts another `WebSocket`.
- `close` and `error` handlers write the shared `openedSocket` without checking which socket fired.
  A late `close` from an old socket can mark a newer open socket as closed.
- The `keepAliveInterval` logs `runLiveItemListener interval` every 100,000,000 ms (about 27.78 h).
- `stop()` clears both intervals, removes listeners, and closes the socket. Keep it.
- Tests in `runLiveItemListener.test.ts` fake `ws` with `FakeWebSocket`.

## Behavior

All of this stays in `runLiveItemListener.ts` and its test.

1. Construct with `{ handshakeTimeout: 10_000 }`.
2. Keep one socket reference and a connecting flag. `connect()` returns early while an attempt is
   in flight. The flag clears when that attempt opens, errors, or closes.
3. Every `open`, `message`, `close`, and `error` handler first checks that its client is still the
   current socket and does nothing otherwise.
4. Record the time of the last received frame. Opening the socket counts as the start of the
   window.
5. The existing 5 second interval is the one supervisor:
   - Open socket, no frame for 5 minutes: log it, `removeAllListeners()`, `terminate()`, clear the
     reference, and reconnect. This must not wait for `close`.
   - No socket and no attempt in flight: reconnect.
   - Attempt in flight: do nothing. The handshake timeout ends it.
6. Use the staleness check only, no ping/pong. Reconnecting during a quiet stretch costs one
   handshake, and terminating on silence is what covers a peer that vanished with no FIN or RST.
7. Log one line per attempt with an attempt counter, including attempts that fail. A tick that
   does nothing stays quiet.
8. Change the heartbeat to once an hour. It logs the age of the last frame (or `none`) and the
   attempt count, so a log reader can tell a working listener from a stuck one.
9. `stop()` still clears both intervals and never reconnects afterward, including when it runs
   while an attempt is in flight.

## Tests

Extend `FakeWebSocket` with `terminate()` and a way to open without emitting frames. Fake timers.

- Opens, never sends a frame, never closes. After 5 minutes the listener terminates that socket,
  opens exactly one new socket, and logs the attempt.
- A late `close` from the terminated socket does not affect the new one.
- A connect that never opens does not create a new socket on every 5 second tick.
- `stop()` clears timers and does not reconnect.

Do not run the tests.

## Do not

- Do not change which Podping messages enqueue `rss-live`.
- Do not add a Kubernetes probe for the listener here.

## Release notes entry

Append to `release-notes/scratchpad.md`. Surfaces: workers. The live item listener reconnects
after 5 minutes with no Podping frame, times out handshakes after 10 seconds, logs each reconnect
attempt, and logs an hourly heartbeat with the age of the last frame.
