# Likes experience refresh — master

**Orchestration (multi-agent / copy-paste):** [00-SUMMARY.md](./00-SUMMARY.md) (gaps, DoD) · [00-EXECUTION-ORDER.md](./00-EXECUTION-ORDER.md) · [COPY-PASTA.md](./COPY-PASTA.md)

## Scope (see also)

Full product background may also exist in an external Cursor plan (e.g. `likes_ux_refresh_plans_78b64a83.plan.md`) if present; **if missing, use this directory only.** This set implements:

- Likes as **More** menu items and any other like affordance (e.g. header heart, VTS heart): **visible when logged out**; tap opens **login** modal, **no** membership/toggle API calls until authenticated (see 02)
- **Single** `GET` list ordering for `is_default_likes` first (private + medium) — no dual fetch for pin
- Optional lightweight `GET /playlist/private/likes?include_resources=0`
- **Media player (full-size + mini bar info):** shared rules for what title/chapter/remote VTS to show; **precedence** and **overlap** behavior described in [04](./04-web-full-player-vts-heart.md) (VTS remote metadata, `toc: false` chapters, then other chapters; tie-break: first position). VTS **like** heart when override resolves to a `DTOItem`
- **Playlists** → **My Playlists:** default-likes playlists at top (server order)
- Playlist **edit** constraints for `is_default_likes`; **delete** + toggle recreate
- End state includes valid web E2E coverage + screenshot reports for likes/auth behavior and media-player overlay hierarchy, using [07](./07-e2e-media-player-test-foundation.md) and [08](./08-e2e-likes-and-player-overlay-matrix.md)

## Execution order

1. [01-api-and-helpers-likes-summary.md](./01-api-and-helpers-likes-summary.md)
2. [02-web-more-menus-and-membership.md](./02-web-more-menus-and-membership.md)
3. [03-web-playlists-my-playlists-pinned.md](./03-web-playlists-my-playlists-pinned.md)
4. [04-web-full-player-vts-heart.md](./04-web-full-player-vts-heart.md)
5. [05-web-playlist-edit-constraints.md](./05-web-playlist-edit-constraints.md)
6. [06-tests-e2e-and-verification.md](./06-tests-e2e-and-verification.md)
7. [07-e2e-media-player-test-foundation.md](./07-e2e-media-player-test-foundation.md)
8. [08-e2e-likes-and-player-overlay-matrix.md](./08-e2e-likes-and-player-overlay-matrix.md)

## Supersedes (UI only)

- `.llm/plans/completed/web-like-button-clean-break/03-web-like-button-rollout.md` (thumbs-up; now More menu)
- `04-` and `05-` in that set for player layout and My Likes page (redirected to above)

Backend likes endpoints from 01–02 in that set remain the foundation.
