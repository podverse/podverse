# Execution order — Music detail

Prompts: [COPY-PASTA.md](COPY-PASTA.md) · Decisions: [00-SUMMARY.md](00-SUMMARY.md)

| Step                                              | What lands                         | Model     | Reasoning |
| ------------------------------------------------- | ---------------------------------- | --------- | --------- |
| [01](01-album-detail.md) Album detail             | Shell rebuild, season sort, panes  | Codex 5.3 | high      |
| [02](02-artist-detail.md) Artist detail           | Shell rebuild, remote items panes  | Codex 5.3 | high      |
| [03](03-track-detail-and-library.md) Track + Library | Real TrackDetail, Library routes | Codex 5.3 | high      |
| [04](04-i18n-e2e-closeout.md) i18n + E2E          | Keys, Maestro, master plan flip    | Codex 5.3 | medium    |

## Order

**01 → 02 → 03 → 04.** Album before artist (artist navigates to album). Track after album (album
header band). Closeout last.

## Shared files

| File                                 | Prompts    |
| ------------------------------------ | ---------- |
| `apps/mobile/src/navigation/index.tsx` | 03 (primary), 01/02 may add linking only if needed |
| `packages/i18n-catalog/**`           | 04 owns    |

## Closeout

Flip 762–764 to `done`; note 729 music half superseded; remove this plan set.
