# Mobile Reusability Pass (DRY Foundation)

**Goal:** reduce duplicated mobile screen code by extracting reusable components, hooks, and pure
functions early, so future feature work stays concise and consistent.

## Why this plan exists

Current branch work delivered many screens quickly, but several patterns are duplicated across
files and should be consolidated before adding more functionality.

## Key reuse opportunities identified

1. Repeated screen scaffold + state gates in library/profile/rss screens (`ScrollView`, heading,
   `ListLoading`, `ListError`, auth required, empty fallback).
2. Repeated card/section shells (`card`, `cardHeading`, `notice`, `content` styles) across
   `library/*`, `profile/*`, `rss/*`, and details.
3. Repeated feed-row mapping helpers (`channelToRow`, `clipToRow`, queue/history row adapters) in
   multiple screens.
4. Repeated queue/history data loading primitives (`getPrimaryQueue`, queue selection, list mapping).
5. Large RSS screen mixes UI, persistence, API orchestration, parse polling, and playback policy in
   one file (needs domain hooks/services).
6. Repeated no-op row action wiring and section rendering loops in Profile/MyProfile.

## Scope

- Focus on reusable component + hook + pure function extraction only.
- Preserve current behavior and route flow.
- Keep visual parity and token usage intact.
- No feature expansion beyond necessary wiring for extracted abstractions.

## Out of scope

- Queue/autoplay behavior redesign (Track 10+).
- Playback engine redesign.
- New product features.

## Deliverables

- New reusable primitives under `apps/mobile/src/components/` and `apps/mobile/src/hooks/`.
- Shared mappers/utilities under `apps/mobile/src/lib/` (or domain folders).
- Screen files rewritten to compose the shared primitives.
- Updated docs/rules references only if needed for clarity.
