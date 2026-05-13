# GIF UI artwork and shrink whitelist — execution order

Read `00-SUMMARY.md` first.

1. `01-gif-hero-ui-and-media-player.md` — extend hero/header default `allowedExtensions` to include `gif`; tests; remove debug `fetch` regions in `image.ts` if present.
2. `02-shrink-static-only-whitelist.md` — URL whitelist early exit + Sharp metadata skip + worker tests + `docs/image-shrinking` note.

Optional: extend **list** helpers (`buildDTOItemImageLoadCandidates`, `mergeDTOItemThenChannelImageCandidates`, …) to include `gif` if product wants GIF in grid/list rows (called out in `01`).

See `COPY-PASTA.md` for suggested prompts.
