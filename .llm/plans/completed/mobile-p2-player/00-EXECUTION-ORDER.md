# Execution order — P2.1.4 player screen

Strictly sequential. Every step but 01 and 02 depends on the one before it, and 03 must land before 04
or the fixed region will be built around panels that still expand.

Prompts to paste: [COPY-PASTA.md](COPY-PASTA.md) · Decisions: [00-SUMMARY.md](00-SUMMARY.md)

| Step                                                             | What lands                                             | Model     | Reasoning |
| ---------------------------------------------------------------- | ------------------------------------------------------ | --------- | --------- |
| [01](01-player-layout-math.md) Layout math                       | `fullPlayerLayout.ts` + tests, no UI change             | Codex 5.3 | high      |
| [02](02-transport-previous-and-jumps.md) Previous & jumps         | `skipToPrevious`, `jumpBy`, shared 10/30 interval, tests | Opus 5    | high      |
| [03](03-player-chrome-rows-and-sheets.md) Chrome rows & sheets     | Three rows, More sheet, panels become sheets            | Codex 5.3 | high      |
| [04](04-fixed-region-and-scroll-shell.md) Region & scroll shell    | Fixed region, peek, sticky chips, condensed bar         | Opus 5    | high      |
| [05](05-section-chips-and-panes.md) Chips & panes                  | Shared pane hook, all five chips, panes below           | Codex 5.3 | high      |
| [06](06-e2e-and-abcmemory.md) E2E & abcmemory                      | `player-screen.yaml`, new rule, skill + doc closeout     | Codex 5.3 | medium    |

## Why this order

- **01 before 04** — the region cannot be assembled before its heights are agreed and tested.
- **02 before 03** — the transport row needs `skipToPrevious` and `jumpBy` to exist, or its buttons
  ship dead.
- **03 before 04** — the fixed region only holds if sleep timer, speed, and up next are already sheets.
- **04 before 05** — panes need the sticky header and section list to live in.
- **06 last** — the flow asserts the finished screen, and the rule is written once the contract is real.

## Cross-surface note

Step 02 changes a shared constant, so **web's jump-back button changes from 15 to 10 seconds** in the
same commit ([`cross-surface-change-impact`](/.cursor/rules/cross-surface-change-impact.mdc)). No web
E2E asserts the old label, but web verification belongs in that step's commands.

## Not in this set

Clip authoring, the device volume slider ([751](/docs/proposals/mobile/_master-plan_/phase-2/details/751-defer-player-volume-slider.md)),
transcript-to-playback coupling ([598](/docs/proposals/mobile/_master-plan_/phase-2/details/598-defer-player-transcript-chrome.md)),
a configurable jump interval, and mini-player extras. Sleep timer countdown, custom durations, and
persistent playback rate stay `expected` on [FEATURE-INVENTORY.md](FEATURE-INVENTORY.md) until the
operator asks.
