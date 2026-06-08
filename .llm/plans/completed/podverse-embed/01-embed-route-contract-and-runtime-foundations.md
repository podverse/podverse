# 01 — Embed route contract and runtime foundations

## Objective

Define the typed embed route and query contract, create the minimal embed layout shell, and build shared
runtime plumbing that both single and list embed variants consume.

## Prerequisites

- Read architecture, playback mode, URL mapping, and visibility contracts in
  [`00-SUMMARY.md`](./00-SUMMARY.md) before implementation.

## Scope

- Add dedicated minimal embed layout and typed route shells in `apps/web/src/app/embed/**`.
- Define phase-1 query parsing and normalization utilities with unit tests.
- Add a shared embed runtime model for:
  - embed layout type (`single` vs `list`)
  - embed playback mode (guardrails for queue/restore side effects)
  - media type state (`audio` vs `video`)
  - normalized default-play behavior (`autoplay`, `t`, `play_id_text`)
  - public-only visibility gating for list entities
- Keep `/embed` as the landing/demo index route (also under minimal layout).
- Extend SEO policy so all `/embed/**` child routes are noindex at SSR.

## File targets

- `/apps/web/src/app/embed/layout.tsx` (minimal shell + layout-level noindex metadata)
- `/apps/web/src/app/embed/page.tsx`
- `/apps/web/src/app/embed/episode/[item_id]/page.tsx`
- `/apps/web/src/app/embed/track/[item_id]/page.tsx`
- `/apps/web/src/app/embed/clip/[clip_id]/page.tsx`
- `/apps/web/src/app/embed/chapter/[item_chapter_id_text]/page.tsx`
- `/apps/web/src/app/embed/official-clip/[item_soundbite_id]/page.tsx`
- `/apps/web/src/app/embed/podcast/[channel_id]/page.tsx`
- `/apps/web/src/app/embed/album/[channel_id]/page.tsx`
- `/apps/web/src/app/embed/playlist/[playlist_id]/page.tsx`
- `/apps/web/src/lib/embed/*` (runtime, query parser, embed-mode helpers)
- `/apps/web/src/lib/embed/__tests__/parseEmbedQueryParams.test.ts` (new)
- `/apps/web/src/lib/seo/routeSeoPolicy.ts` (extend `/embed/**` noindex coverage)

## Contract decisions

- Typed routes mirror normal page naming conventions (see `00-SUMMARY.md` mapping table).
- Reuse query vocabulary where existing pages already use it:
  - `type`, `sort`, `range`, `page`
- Add embed-specific minimal params:
  - `autoplay` — boolean; missing/invalid → `false`
  - `t` — non-negative integer seconds; missing/invalid/negative → `0`
  - `play_id_text` — optional string; list embeds only; invalid/not-found falls back to default row
- List embed visibility: public-only for phase 1; non-public entities render not-available shell.

## Embed layout contract

- `embed/layout.tsx` must **not** inherit root chrome. Omit:
  - `NavBar`, `SideBar`, `MainHeader`, `MainWrapper`
  - `CookieConsentBanner`, `MembershipExpiredBanner`
  - global `MediaPlayerController` dock, `LazyLoadedComponents` media-player aside
  - `QueueController`, `AnonymousPlaybackRestoreController`
- Mount only providers required for embed playback, i18n, runtime config, and API requests.
- All embed pages render inside a stable root element with `data-testid="embed-root"`.

## Embed playback mode contract

- Export an embed-mode flag/helper from `apps/web/src/lib/embed/*` (e.g. `isEmbedRoute`, `EmbedPlaybackMode`).
- Embed layout sets embed mode so playback hooks can:
  - skip anonymous playback restore,
  - skip auto-queue mutations and queue-resource now-playing updates,
  - skip main-app layout class mutations for dock spacing,
  - pass URL `autoplay`/`t` into playback load input normalization.

## Implementation notes

- Keep parser strict and normalized (defaults + allowed enums); centralize once in `lib/embed`.
- Keep types explicit and avoid ad-hoc assertions.
- Apply `buildNoindexMetadata()` at embed layout level so every child route inherits noindex SSR tags.
- Update `routeSeoPolicy.ts` to document `/embed/**` alongside `/embed`.
- Do not use `MainHeader`/`MainWrapper` on embed pages (current `/embed` placeholder uses these — replace).

## Unit test requirements (Phase 1)

Add Vitest coverage in `apps/web/src/lib/embed/__tests__/parseEmbedQueryParams.test.ts` for:

- missing params → stable defaults,
- invalid `autoplay`/`t`/`sort`/`type` → normalized fallbacks,
- `play_id_text` passthrough when present,
- list vs single param sets.

## Acceptance criteria

- All typed embed routes resolve and compile under minimal embed layout.
- Embed pages render without root app chrome (no nav, sidebar, global dock).
- Layout-level noindex metadata applies to `/embed` and child routes (verify SSR meta tag).
- Shared query parser returns stable defaults for missing/invalid params (unit tests pass).
- Runtime model represents:
  - single/list mode,
  - embed playback mode with side-effect guardrails,
  - audio/video mode,
  - auto-select-first or explicit `play_id_text`,
  - public-only list visibility gate.
- `/embed` landing route links to demo variant placeholders that Phase 5 will populate with stable IDs.

## Phase gate (required before Phase 2)

Do not start Phase 2 until all acceptance criteria above are met, including layout shell, noindex,
embed-mode flags, and parser unit tests.

## Out of scope for this phase

- Final visual polish for embed UI (Phase 2–3).
- Share modal/embed builder flow (Phase 4).
- E2E coverage (Phase 5; parser unit tests only in this phase).
