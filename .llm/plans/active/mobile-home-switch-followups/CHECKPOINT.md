# Checkpoint protocol — operator captures and agent review

Every milestone that changes behavior ends with a capture. The operator runs it; a separate agent
turn reviews it and writes one ledger row. Numbers decide keep or revert; the operator's impression
is recorded next to them.

## One-time setup per session (operator)

- **Mobile Metro** running the perf bundle (stop any other Metro on `:8081` first):

```bash
npm run mobile:dev:perf
```

- Only `"iPhone 17 Pro"` booted. If the E2E twin is up, shut it down in **Mobile**:

```bash
xcrun simctl shutdown "iPhone 17 Pro E2E"
```

- When a milestone says **Rebuild**, run it in **Mobile iOS** and wait for the app to open:

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```

## Capture steps (operator)

Same routine for every label. The gesture differs by label (table below).

1. **Mobile** — cold start the app so every capture starts from the same state:

```bash
xcrun simctl terminate "iPhone 17 Pro" com.podverse.app.next
xcrun simctl launch "iPhone 17 Pro" com.podverse.app.next
```

2. Wait at least 5 seconds on Home. For Home gestures make sure **Podcasts** is the selected chip.
3. **Mobile** — arm (use the gesture name from the table):

```bash
npm run mobile:perf -- --manual --arm --device ios --gesture chips
```

4. Do the gesture exactly as the table says, then wait 3 seconds.
5. **Mobile** — collect:

```bash
npm run mobile:perf -- --manual --collect --device ios --gesture chips
```

6. Reply in chat: `collected <LABEL>` plus one line of impression (for example "smooth", "one
   hitch leaving Episodes", "worse than before"). Mention anything odd you saw.

| Gesture | Where | What to do |
| --- | --- | --- |
| `chips` | Home, Podcasts selected | Tap Episodes → Artists → Episodes → Podcasts, about one second apart. Do that three times (12 taps). |
| `browse-chips` | Browse tab | Tap Episodes → Artists → Episodes → Podcasts, about one second apart, three times. |
| `play` | Home, Episodes chip | Tap Play on the first row, wait two seconds, tap it again (pause). Repeat three times (6 taps). |
| `refresh` | Home, Episodes chip | Pull to refresh, wait for the sync indicator to finish, repeat three times. |

Keep the pace at about one tap per second. Faster taps overlap switches and measure a different
thing than the one users feel.

## Labels in this set

| Label | Milestone | Gesture | Notes |
| --- | --- | --- | --- |
| B1, B2 | 03 | chips | Baseline twice; their spread is the noise floor |
| B3 | 03 | chips | Optional: Metro `npm run mobile:dev:perf:prodjs` (production JS, same native build) |
| P0 | 03 | play | Baseline row renders per play tap |
| R0 | 03 | refresh | Baseline row renders per reload |
| BR0 | 03 | browse-chips | Browse baseline |
| PROF1 | 04 | chips | Optional, adds `--profile` to arm and collect; numbers not used in the ledger |
| T5 | 05b | chips | Also look at artwork sharpness in list and grid |
| P6, C6 | 06b | play, chips | |
| R7 | 07 | refresh | |
| C8 | 08 | chips | Expect no change; then the Maestro run |
| C9a, C9b | 09b | chips | Main fix, captured twice; then the Maestro run |
| FIN, FINP | 10 | chips, play | Production JS (`npm run mobile:dev:perf:prodjs` in **Mobile Metro**) |

In a `chips` capture the report splits taps into first visits and revisits (`kept`). Before 09b
every tap is a first visit; after it, the first Episodes and Artists taps are first visits and the
other ten are revisits.

## Maestro run

After C8 and after C9b, check the `home` flows on the E2E simulator. Stop **Mobile Metro** first
(only one Metro can hold `:8081`). Leave these running, each in its own tab:

- **Mobile E2E Metro**: `npm run mobile:dev:e2e`
- **Mobile E2E API**: `npm run mobile:e2e:api`
- **Mobile E2E iOS** (exits when installed): `npm run mobile:e2e:ios`

Then in **Mobile Maestro**:

```bash
npm run mobile:e2e:test -- --platform ios home
open .artifacts/mobile-e2e-reports/latest/failures.json
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```

Afterwards stop **Mobile E2E Metro** and start `npm run mobile:dev:perf` again in **Mobile Metro**
before the next capture. Reply with the pass/fail count and any failing flow name.

## Review procedure (agent, when the operator replies "collected <LABEL>")

1. Read `.artifacts/mobile-perf/latest/summary.txt`, then `summary.json` and `timeline.json` in
   the same folder when a number needs checking. `latest` is a symlink to the newest capture.
2. Check the capture is usable: `tapUi.all.taps` should be 12 for `chips`. `play` and `refresh`
   produce no chip taps; check `rowRenders.playTap.n` is 6 or `refreshLoad.n` is 3 instead. A
   `touchLagMs` of `—` everywhere in a `chips` capture means the native monitor is not in the build
   — ask the operator to rebuild (**Mobile iOS**) and recapture. Arm and collect must use the same
   `--gesture`.
3. Add one row to the **Chip switch ledger** table in
   `docs/development/mobile/MOBILE-PERF-BASELINES.md` (created in 03). Columns:

   | Label | Date | Build | chipVisible p95 first / revisit | spinnerVisible p95 | listVisible p95 revisit | uiMaxGap p95 | taps ≥100 ms gap | touchLag p95 | row renders (play / refresh) | footprint MB | Impression | Decision |

   Use `—` for a column the gesture does not produce.
4. Compare with the previous row of the same gesture and with the baseline:
   - **Noise floor:** the spread between B1 and B2 for each metric, and at least 8 ms for any frame
     time. A smaller difference is "no change".
   - Apply the milestone's **keep rule** and **revert rule** (they are in the milestone file) and
     write the decision: `kept`, `reverted`, or `operator decides`.
5. Reply with: the ledger row, a two-sentence reading (what moved, what did not), and the decision.
   If the decision is a revert, list the exact edits that undo the milestone and wait for the
   operator's go-ahead before making them.
6. If the impression disagrees with the numbers (for example "felt worse" but metrics improved),
   say so plainly, record both, and ask the operator which to trust. Do not decide alone.

## Why these metrics

- `chipVisibleMs` — finger lift to the display time of the frame that first shows the new chip.
  Measured natively (display link `targetTimestamp` minus the touch timestamp, same clock). This is
  what the user sees; rAF marks are not.
- `spinnerVisibleMs` / `listVisibleMs` — same clock, for the frame that first shows the loading
  spinner or the rows for the chosen chip.
- `uiMaxGapMs` — longest UI-thread frame gap inside the tap's window (lift → next tap or +3 s).
  A long gap is a visible hitch even when the chip itself painted quickly.
- `touchLagMs` — finger lift to the moment the JS handler ran. High values mean the JS thread was
  busy when the tap arrived.
- Row renders — how many `HomeFeedRow` renders a play tap or a reload costs.
- Footprint — `phys_footprint` from `footprint` at collect time; the image change should cut it.
