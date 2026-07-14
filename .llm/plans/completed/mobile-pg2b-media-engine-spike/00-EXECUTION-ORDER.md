# PG-2b execution order

Run COPY-PASTA prompts in sequence. Do not skip ahead.

Read **`00-CAR-FOUNDATION.md`** before implementing.

| Order | Plan file                            | Steps              | Model     |
| ----- | ------------------------------------ | ------------------ | --------- |
| 1 ✅  | `01-module-scaffold-and-bridge.md`   | 2.1–2.3, **2.35**  | Opus 4.8  |
| 2 ✅  | `02-ios-audio-session-nowplaying.md` | 2.4–2.6            | Opus 4.8  |
| 3 ✅  | `03-android-exoplayer-service.md`    | 2.7–2.9            | Opus 4.8  |
| 4 ✅  | `04-events-and-js-adapter.md`        | 2.10–2.11          | Opus 4.8  |
| 5 ✅  | `05-background-kill-spikes.md`       | 2.12–2.13          | Opus 4.8  |
| 6 ✅  | `06-spike-go-no-go-gate.md`          | 2.34               | Codex 5.3 |

**PG-2b complete.** Gate **GO** (2026-07-13). Plan set archived to
`.llm/plans/completed/mobile-pg2b-media-engine-spike/`.
