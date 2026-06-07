# Podverse Embed Player — 00 Summary

## Goal

Ship an `apps/web` embed player implementation that reuses existing media-player behavior where feasible,
supports typed embed routes that match Podverse page conventions, and delivers:

- Single embed (audio-ready, video placeholder)
- List embed (audio-ready, video placeholder)
- Share modal handoff to an embed builder modal with live preview
- Minimal URL customization support
- E2E coverage for core behavior

## Locked decisions

- Scope: `apps/web` only for this phase.
- Route style: typed routes (not generic `item`/`channel` naming).
- **Embed shell:** all `/embed/**` routes use a dedicated minimal layout — no NavBar, SideBar, cookie
  banner, or global media-player dock chrome.
- **SEO:** all `/embed/**` routes emit SSR noindex metadata (not only `/embed` landing).
- **Playback mode:** reuse global playback state and primitives with explicit embed-mode guardrails
  (no anonymous queue restore, no auto-queue side effects, no main-app layout mutations).
- **Visibility:** phase-1 list embeds resolve **public-only** content; private/unlisted playlists and
  channels render a stable not-available shell (no data leak).
- Heights:
  - Single embed fixed height: ~`180px`
  - List embed fixed height: ~`640px` with internal list scrolling
- Text behavior: all embed text is single-line with truncation.
- Video handling: detect and render a "coming soon" placeholder.
- Minimal URL customization only for phase 1.

## Architecture contract (non-negotiable)

- Embed routes live under `apps/web/src/app/embed/**` with a shared `embed/layout.tsx` that:
  - renders children only (minimal shell),
  - exports noindex metadata for all child routes,
  - mounts only the provider subset required for playback + i18n + runtime config,
  - omits root-layout chrome (`NavBar`, `SideBar`, `CookieConsentBanner`, global `#media-player` dock,
    `QueueController`, `AnonymousPlaybackRestoreController`).
- Embed UI renders playback controls inline inside the embed shell (fixed-height player region), bound to
  the same playback context — not the global bottom dock.

## Playback mode contract

- Embed routes set an explicit embed-mode flag consumed by playback load/update paths.
- In embed mode:
  - skip anonymous playback restore on first visit,
  - do not mutate main-app queue or auto-queue state,
  - do not call layout mutators that adjust `#sidebar` / `#page-wrapper` for dock spacing,
  - map URL `autoplay` → `shouldPlay` and `t` → start seconds on the playback load input.
- Phases 2–3 must honor this contract; do not add embed-specific imperative player logic outside shared
  entry points.

## Typed route contract (phase 1)

- `/embed` (landing + demo index)
- `/embed/episode/[item_id]`
- `/embed/track/[item_id]`
- `/embed/clip/[clip_id]`
- `/embed/chapter/[item_chapter_id_text]`
- `/embed/official-clip/[item_soundbite_id]`
- `/embed/podcast/[channel_id]`
- `/embed/album/[channel_id]`
- `/embed/playlist/[playlist_id]`

## Canonical URL mapping contract

All embed URLs (builder modal, share handoff, docs) must be produced by a single helper
(`apps/web/src/lib/embed/buildEmbedUrl.ts`). Entity kind → typed embed path:

| Entity context | Embed path |
| --- | --- |
| Episode (podcast/video item) | `/embed/episode/{item.id_text}` |
| Track (music item) | `/embed/track/{item.id_text}` |
| Clip | `/embed/clip/{clip.id_text}` |
| Chapter | `/embed/chapter/{item_chapter.id_text}` |
| Official clip (soundbite) | `/embed/official-clip/{item_soundbite.id_text}` |
| Podcast channel (list) | `/embed/podcast/{channel.id_text}` |
| Album channel (list) | `/embed/album/{channel.id_text}` |
| Playlist (list) | `/embed/playlist/{playlist.id_text}` |

**Important:** official-clip embed paths use `/embed/official-clip/…`, not `/soundbite/…` (the legacy
share URL in `ModalShare.tsx` is wrong and must not be copied).

## URL parameter baseline (phase 1)

- Shared controls:
  - `autoplay` (boolean; invalid values normalize to `false`)
  - `t` (start seconds; invalid/negative values normalize to `0`)
  - `play_id_text` (hidden advanced default-play override for list embeds)
- Reused list/query vocabulary where applicable:
  - `type`
  - `sort`
  - `range`
  - `page`
- Invalid list query params fall back to route-specific defaults (see Phase 3 tables).

## Reuse-first implementation anchors

- Playback decision logic:
  - [`/apps/web/src/lib/playback`](/apps/web/src/lib/playback)
- Playback load/update hook:
  - [`/apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx`](/apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx)
- Media controls bridge:
  - [`/apps/web/src/contexts/MediaPlayerControls.tsx`](/apps/web/src/contexts/MediaPlayerControls.tsx)
- Chapter-aware info resolution:
  - [`/apps/web/src/utils/mediaPlayer/mediaPlayerInfoResolution.ts`](/apps/web/src/utils/mediaPlayer/mediaPlayerInfoResolution.ts)
- Embed URL builder (new, single source of truth):
  - [`/apps/web/src/lib/embed/buildEmbedUrl.ts`](/apps/web/src/lib/embed/buildEmbedUrl.ts)
- Existing share modal flow:
  - [`/apps/web/src/components/Modal/ModalShare.tsx`](/apps/web/src/components/Modal/ModalShare.tsx)
  - [`/apps/web/src/components/Modals/Modals.tsx`](/apps/web/src/components/Modals/Modals.tsx)
  - [`/apps/web/src/contexts/Modals.tsx`](/apps/web/src/contexts/Modals.tsx)

## Deliverables in this plan set

- `00-EXECUTION-ORDER.md`
- `01-embed-route-contract-and-runtime-foundations.md`
- `02-single-embed-ui-and-playback-reuse.md`
- `03-list-embed-loading-and-default-selection.md`
- `04-share-to-embed-builder-modal-and-preview.md`
- `05-demo-page-e2e-and-docs.md`
- `COPY-PASTA.md`
