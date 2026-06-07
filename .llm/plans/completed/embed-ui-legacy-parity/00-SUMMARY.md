# Embed UI legacy parity — 00 Summary

## Goal

Align the podverse-embed player UI with the legacy Podverse embed design (user reference screenshots): unified card chrome, 76px artwork, bold episode title, date pill, full-width progress with timestamps, compact list rows without thumbnails, and iframe heights that fit the player card without clipping.

## Locked decisions

- **Reference:** Legacy embed screenshots only (no legacy source in-repo).
- **Exclude:** V4v / lightning-bolt icons.
- **Branding:** Keep current PodcastDJ brand via `EmbedFooter` (do not revert to PODVERSE wordmark).
- **Reuse:** Keep `MediaPlayerProgress`, `PlayButton`, `PlaybackSpeedButton`, `PlayButtonRow`; scope layout fixes via embed SCSS wrappers.
- **Heights:** Single **260px**, list **720px** (exported from `buildEmbedIframeCode.ts`).

## Gap table (pre-fix)

| Area | Legacy | Current (before this plan set) |
| --- | --- | --- |
| Artwork | ~76px, placeholder on failure | 64px, broken icon |
| Episode title | Large bold | `font-size-sm` |
| Date | Pill badge | Plain text |
| Progress | Full width + timestamps | 520px fixed width, often clipped |
| List rows | Play + text only | 112px thumbnails |
| Card | One bordered card | Inner player border only |
| Iframe height | Taller card | 220 / 680 |

## Out of scope

- Video embed beyond existing placeholder
- Main-app media player dock
- V4v UI

## Plan files

| # | File | Outcome |
| --- | --- | --- |
| 1 | `01-shell-card-layout-and-heights.md` | Unified card, overflow fix, 260/720 heights |
| 2 | `02-player-info-artwork-typography.md` | 76px art, title hierarchy, date pill |
| 3 | `03-progress-and-controls-parity.md` | Full-width progress in embed |
| 4 | `04-list-rows-legacy-layout.md` | Remove list thumbnails |
| 5 | `05-e2e-docs-heights.md` | E2E, docs, builder sync |

See [`00-EXECUTION-ORDER.md`](./00-EXECUTION-ORDER.md) and [`COPY-PASTA.md`](./COPY-PASTA.md).
