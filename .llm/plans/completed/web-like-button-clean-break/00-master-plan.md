# Podverse Like Button - Master Plan

## Scope

Implement a clean-break likes system in Podverse where likes are stored as default likes playlists and exposed through one-click thumbs-up controls across list rows, detail pages, and player surfaces.

## Confirmed Product Decisions

- Full rename from favorites to likes in active code paths.
- Schema field is `is_default_likes` (not `is_default_favorites`).
- Clean-slate implementation only; no legacy/fallback branches.
- Default likes playlist provisioning: **on first like action** only, implemented as **idempotent**
  create-or-resolve (so signup/login does not create playlists, but first-like cannot race into duplicates).
- Likes are backed by at most:
  - **one** default-likes **AV** playlist, and
  - **one** default-likes **music** playlist.
- Likeable row types (mapped into those default-likes playlists):
  - **Items** (AV items and music items use the matching default-likes playlist by `medium_id`)
  - **Clips** (still `playlist_resource.clip_id`, but stored in the **AV** default-likes playlist;
    the `My Likes` Clips tab is a **server-filtered view** of that default-likes playlist, not a third
    `medium` playlist)
  - **Add-by-RSS** (where the product already supports add-by-RSS playlist resources, likes should
    use the same resource identity and routes)
- Livestreams are not likeable.
- Full-size player: **parent like** is always the parent `Item` (or the appropriate add-by-RSS
  identity for add-by-RSS now-playing).
- Value time split **split like** (second control in the full-size player) is only meaningful when
  the split can be resolved to a **canonical `Item` row in our database**. If it cannot, **hide**
  the split like control; parent like remains. Broader VTS/overlay/Boost work is out of scope for
  the initial roll-out and is captured as a follow-up placeholder:
  - [07-future-vts-boost-and-metadata.md](./07-future-vts-boost-and-metadata.md)
- Read/render efficiency:
  - A **`POST` batch membership** endpoint is required for “filled icon” checks on large lists.
  - The `My Likes` experience should use **dedicated `GET` list endpoints per tab** (not three separate
    client roundtrips that re-implement filtering poorly).
- My Likes page includes separate tabs for:
  - Episodes
  - Music Tracks
  - Clips

## Plan Set

Sequential copy-paste prompts (verification commands and completion step): [COPY-PASTA.md](./COPY-PASTA.md)

- [01-schema-and-contract-rename.md](./01-schema-and-contract-rename.md)
- [02-api-likes-service-and-toggle.md](./02-api-likes-service-and-toggle.md)
- [03-web-like-button-rollout.md](./03-web-like-button-rollout.md)
- [04-player-and-value-time-split-likes.md](./04-player-and-value-time-split-likes.md)
- [05-my-likes-page-and-sidebar.md](./05-my-likes-page-and-sidebar.md)
- [06-tests-and-verification.md](./06-tests-and-verification.md)
- [07-future-vts-boost-and-metadata.md](./07-future-vts-boost-and-metadata.md) (placeholder; not a phase in COPY-PASTA)

## Delivery Sequence

1. Complete schema/entity/DTO/route naming rename to likes.
2. Implement backend likes service contract and toggle endpoints.
3. Implement web likes state, reusable like button, and row/detail rollout.
4. Implement player likes, including value-time-split subcontent liking.
5. Add My Likes route, sidebar entry, and tabbed views.
6. Complete integration + E2E test coverage and verification.

## Phase Gates

- Do not start Phase 02 until Phase 01 contract rename is complete.
- Do not start Phase 03 until Phase 02 endpoints and request helpers are complete.
- Do not start Phase 04 until Phase 03 like button behavior is complete.
- Do not start Phase 05 until Phase 04 player behavior is complete.
- Do not start Phase 06 until Phase 05 navigation and pages are complete.
