# Sub-Plan 07a: podcast:value (channel and item)

**Parent:** [07-complex-tags-implementation.md](07-complex-tags-implementation.md). Execute after 01–03; can run in parallel with 07b, 07c (07d last).

## Objective

Emit `<podcast:value>` at channel and item level with correct structure so Partytime parses and parser-mapping `compatChannelValue` / `compatItemValue` run without error.

## Scope: Lightning keysend only

This plan **only supports Lightning keysend**. Use fixed `type="lightning"` and `method="keysend"` for all value blocks. Do not emit `amp` or other protocols; keep test data and parsing simple and aligned with the [Podcast Namespace value tag](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/value.md) and [value specification](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/examples/value/value.md) (Lightning keysend).

## Authority

- **Partytime:** `phase-4.ts` (value, Phase4Value, Phase4ValueRecipient); `phase-6.ts` (valueTimeSplit, Phase6ValueTimeSplit); `value-helpers.ts` (validRecipient, extractRecipients).
- **Parser-mapping:** `packages/parser-mapping/src/compat/partytime/value.ts` — `compatChannelValue`, `compatItemValue`.
- **Specs:** [value tag](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/value.md), [value specification (Lightning, keysend, valueRecipient)](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/examples/value/value.md).

## Channel value

- Emit `<podcast:value type="lightning" method="keysend" suggested="...">` with one or more `<podcast:valueRecipient type="node" address="..." split="..." name="..." customKey="..." customValue="..." fee="..."/>`.
- Partytime requires: `type`, `method`, and at least one valueRecipient with `type`, `address`, `split`. For Lightning keysend: `type="lightning"`, `method="keysend"`; recipients use `type="node"` and `address` = node pubkey (use faker to generate pubkey-like strings, e.g. 66-char hex). Optional: `suggested` (float, e.g. `0.00000005000` for 5 sats); on recipient: `name`, `customKey`, `customValue`, `fee` (boolean). Split: integer shares (e.g. 1–100).

## Item value

- Same top-level structure as channel: `type="lightning"`, `method="keysend"`, optional `suggested`, one or more valueRecipient (type="node", address, split, etc.).
- Optionally add `<podcast:valueTimeSplit>` children. Two variants:
  - **remoteItem:** attributes `startTime`, `duration`, `remoteStartTime`, `remotePercentage`; child `<podcast:remoteItem>` with `feedGuid`, optional `itemGuid`, `feedUrl`.
  - **recipients:** same time attributes plus child `<podcast:valueRecipient>` elements.
- Faker for time (seconds) and percentages; for remoteItem variant use existing feed GUIDs/URLs from generator context if available.

## Implementation steps

1. In the generator, add helpers to build channel `<podcast:value>` and item `<podcast:value>` (and optional valueTimeSplit blocks). Use **only** `type="lightning"` and `method="keysend"`; valueRecipient `type="node"` with faker-generated pubkey-like addresses and integer split.
2. Append channel value block inside channel podcast namespace (after existing tags).
3. Append item value block inside each item’s podcast namespace where desired (e.g. first N items or random).
4. Remove or update placeholder comment for podcast:value from Sub-Plan 04.
5. Run generate; parse with Partytime; call `compatChannelValue` / `compatItemValue` on parsed result; confirm no throw and expected DB-shaped output.

## Acceptance criteria

- All value blocks use `type="lightning"` and `method="keysend"` only (no amp or other methods).
- Generated feeds include valid `<podcast:value>` at channel level and optionally at item level with valueTimeSplit (one or both variants).
- Partytime parses without error; `compatChannelValue` and `compatItemValue` run without throw and produce expected DTO shape.

## Run after this plan

From repo root: `npm run generate -w podverse-test-assets -- 2 --items 20 --multi 2`. Parse a generated feed with Partytime; run parser-mapping compat for value (channel + item). Fix any parse or compat errors.
