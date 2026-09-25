# 04 — Gated fixes from 03 findings

**Cursor model:** Codex 5.3
**Reasoning:** high

## Goal

Ship only the hypotheses 03 accepted. Each change states a prediction and a gate; miss → revert and tell the operator the measured delta (`mobile-perf-measured-claims`).

## Options (pick from 03)

- **H1** — Prefer smaller list artwork URL; bound expo-image decode to list pixel size; optional prefetch. Ask before server-side thumbs.
- **H2** — No product fix; require Release for iOS perf claims in baselines + rule.
- **H3** — Cut per-row mount work (`mobile-row-render-cost`): batched download status, narrower playback subscription, lazy More actions.
- **H4** — UI-thread changes from xctrace stacks: iOS `removeClippedSubviews`, fewer nested views, listVirtualization tuning.
- **H5** — Chip press delivery in `SectionChip` / ScrollView.

## After each fix

Re-measure the affected gesture on manual iOS (and one Android warm seeded check if the change is shared). Update the candidate table in `MOBILE-PERF-BASELINES.md`.
