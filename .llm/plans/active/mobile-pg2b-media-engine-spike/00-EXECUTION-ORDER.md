# PG-2b execution order

Run COPY-PASTA prompts in sequence. Do not skip ahead. Mark steps `planned` → `done` only when
implementing (this detailing phase leaves them **`planned`**).

Read **`00-CAR-FOUNDATION.md`** before implementing.

| Order | Plan file                            | Steps              | Model     |
| ----- | ------------------------------------ | ------------------ | --------- |
| 1 ✅  | `01-module-scaffold-and-bridge.md`   | 2.1–2.3, **2.35**  | Opus 4.8  |
| 2 ✅  | `02-ios-audio-session-nowplaying.md` | 2.4–2.6            | Opus 4.8  |
| 3 ✅  | `03-android-exoplayer-service.md`    | 2.7–2.9            | Opus 4.8  |
| 4 ✅  | `04-events-and-js-adapter.md`        | 2.10–2.11          | Opus 4.8  |
| 5 ⏳  | `05-background-kill-spikes.md`       | 2.12–2.13          | Opus 4.8  |
| 6 ✅  | `06-spike-go-no-go-gate.md`          | 2.34               | Codex 5.3 |

**Step 5 (⏳):** scaffolding done; 2.12/2.13 stay `planned` until the operator runs the device spikes
and records results in `apps/mobile/modules/podverse-media-engine/SPIKE-NOTES.md`.

**Step 6 (✅):** gate authored (`apps/mobile/modules/podverse-media-engine/GO-NO-GO.md`); engine/car
constraints are GO. Final GO is conditional on the Step 5 device sign-off.

After the operator records 2.12/2.13 results (marking those steps `done`), archive the remaining set
files and this directory to `.llm/plans/completed/mobile-pg2b-media-engine-spike/` per plan-completion.
