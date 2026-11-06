# 11 — Web, API, and URL Cutover

## Goal

Move public web and API hostnames to v5 on a schedule that keeps the v4 mobile
app working through the grace period. Every public v4 web URL keeps working.
When v5 uses a different path or a new id, the old URL stays reserved and
redirects to the v5 page.

## Status

Draft. Needs operator review.

## What we know

- v4 web paths include podcast, episode, clip, playlist, profile, membership,
  reset-password, and related routes. Mobile universal links use `podverse.fm`.
- v4 mobile default API host is under `api.podverse.fm` (path prefix `/api/v1`).
- Deep link schemes include `podverse://` / `com.podverse://`
  ([03](03-store-identity-and-signing.md)).
- v5 route shapes differ. Migrated public ids stay the v4 shortid
  ([05](05-id-mapping-and-catalog-seeding.md)). The legacy map is required
  when the path changes. `v5_kind` picks the destination path.

## Proposed approach

### During grace period

| Host                                    | Role                                                                 |
| --------------------------------------- | -------------------------------------------------------------------- |
| `api.podverse.fm` (or current prod API) | **Stay on v4** so un-upgraded apps keep working                      |
| Public web (`podverse.fm`)              | Flip to **v5 web** when ready. Old URLs stay reserved and redirect   |
| Beta hosts                              | Separate hostnames until promotion ([09](09-beta-environment.md))    |

v5 mobile / web talk to the **v5 API** on its own hostname (or path) during
grace, not to the v4 API.

### Redirects

A public v4 URL keeps working. Migrated pages keep the v4 shortid, so a
matching path is the same URL. When the path changes, reserve the old URL and
redirect to the v5 page. Do not reuse that path for a different page. An id
with no row gets a friendly not-found, not a new resource that happens to
share the string.

Reset-password and membership links from old emails must either keep working
on a compatibility path or be clearly expired with instructions.

These are the URL changes for content that migrates. v4 chapters and
soundbites are `mediaRefs`, and their public page is `/clip/:id`. The id in
the new path is that same `mediaRefs.id`. Ids of length 7 or 8 fit once
`nano_id_v2` accepts 7 characters. That minimum is decided and is not in the
schema yet. See [05](05-id-mapping-and-catalog-seeding.md).

| v4 URL                           | v5 page                                           | What changes                           |
| -------------------------------- | ------------------------------------------------- | -------------------------------------- |
| `/podcast/:id`                   | `/podcast/:id`                                    | Same id and path                       |
| `/album/:id`                     | `/album/:id`                                      | Same id and path                       |
| `/episode/:id`                   | `/episode/:id`                                    | Same id and path. Live page may differ |
| `/track/:id`                     | `/track/:id`                                      | Same id and path                       |
| `/clip/:id` (user clip)          | `/clip/:id`                                       | Same id and path                       |
| `/clip/:id` (official chapter)   | `/chapter/:id`                                    | Same id. Path changes. Not a v5 clip   |
| `/clip/:id` (official soundbite) | `/official-clip/:id`                              | Same id. Path changes. Not a v5 clip   |
| `/playlist/:id`                  | `/playlist/:id`                                   | Same id and path                       |
| `/profile/:id`                   | `/profile/:id`                                    | Same id and path                       |
| `/embed/player?...`              | Typed `/embed/<kind>/:id`                         | Query string becomes a typed path      |
| `/miniplayer/clip/:id`           | Clip, chapter, or official-clip page              | No v5 miniplayer route                 |
| `/miniplayer/episode/:id`        | `/episode/:id`                                    | No v5 miniplayer route                 |
| `/videoplayer/clip/:id`          | Clip, chapter, or official-clip page              | No v5 videoplayer route                |
| `/videoplayer/episode/:id`       | `/episode/:id`                                    | No v5 videoplayer route                |
| `/account-claim-token/:id`       | No v5 page. Tokens are not imported               | URL is not reserved                    |

`/embed/<kind>` is `podcast`, `episode`, `clip`, `chapter`, `official-clip`,
`playlist`, or `album`.

Live items are v4 episodes, so their shared link is `/episode/:id`. v5 also
has `/podcast/livestream/:item_id` and `/music/livestream/:item_id`. If the
canonical page moves, `/episode/:v4Id` still redirects there.

### After grace / v4 shutdown

- Point API hostname at v5 (or retire the old hostname after clients are gone).
- Keep the web redirects. Shutting down v4 does not release the old paths.

### AASA and assetlinks

Publish for the production ids and domains before the store build that relies on
them. Include transition entries for `.next` while alpha still exists.

## Honest limits and risks

- Flipping web before the reserved redirects are in place breaks shared links.
  Re-deriving a chapter or soundbite without a `mediaRefs.id` map row does
  the same: the old `/clip/:id` link has nowhere to go.
- Leaving API on v4 while web is on v5 can confuse users who click "open in app"
  across eras; test those paths.
- Custom API domain overrides in the v4 app (advanced settings) may bypass your
  cutover — rare, but support should know.

## Open questions

- Exact production hostnames for v5 API during grace?
- Flip web on the same day as store launch, or earlier?

## Future plan sets

- Redirect service or Next.js rewrite rules driven by the legacy map.
- DNS / ingress cutover checklist (ops).
- Compatibility matrix for password-reset and membership emails.
