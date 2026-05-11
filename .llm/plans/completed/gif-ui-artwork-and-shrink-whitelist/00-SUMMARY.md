# GIF UI artwork and image-shrink whitelist

## Goals

1. **Display:** Allow `.gif` URLs in Podverse hero/header artwork chains (item + channel), including media player large artwork (built via `mergeDTOItemThenChannelImageHeroCandidates`).
2. **Shrink pipeline:** Only attempt resize/WebP upload for **static raster** sources allowed by an explicit whitelist (png/jpeg/webp). **Never** process GIF URLs or detected animations/multi-frame WebP through Sharp resize/upload.

## Canonical detail

- `01-gif-hero-ui-and-media-player.md` — helpers (`packages/helpers/src/lib/image.ts`), defaults, optional list/grid parity.
- `02-shrink-static-only-whitelist.md` — workers `imageShrink` gate + Sharp metadata defense + docs/tests.

Supersedes the narrower draft that covered hero defaults only (gif in headers without shrink policy).

## Verification (after implementation)

```bash
./scripts/nix/with-env npm run test:unit -w @podverse/helpers
./scripts/nix/with-env npm run test:unit -w apps/workers
```

Lint touched packages from repo root per usual.
