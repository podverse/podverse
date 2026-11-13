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

| Host                                    | Role                                                                |
| --------------------------------------- | ------------------------------------------------------------------- |
| `api.podverse.fm` (or current prod API) | **Stay on v4** so un-upgraded apps keep working                     |
| `api-prod.podverse.fm`                  | v5 API during grace. After the block, `api.podverse.fm` points here |
| Public web (`podverse.fm`)              | Operator chooses. Likely the first store approval. Redirects stay   |
| Beta hosts                              | Separate hostnames. After launch, the production database           |

v5 mobile and web talk to `api-prod.podverse.fm` during grace, not to the
v4 API. When public v4 requests are blocked, `api.podverse.fm` points at v5.

### Redirects

A public v4 URL keeps working. Migrated pages keep the v4 shortid, so a
matching path is the same URL. When the path changes, reserve the old URL and
redirect to the v5 page. Do not reuse that path for a different page. An id
with no row gets a friendly not-found, not a new resource that happens to
share the string.

A `/podcast/:id` with no channel under that id asks the
[legacy podcast lookup](05-id-mapping-and-catalog-seeding.md#legacy-podcast-lookup).
When a channel exists for the same Podcast Index id, redirect there.
Otherwise show the friendly not-found page. A page view never queues a
parse.

Reset-password and membership links from old emails must either keep working
on a compatibility path or be clearly expired with instructions.

These are the URL changes for content that migrates. v4 chapters and
soundbites are `mediaRefs`, and their public page is `/clip/:id`. The id in
the new path is that same `mediaRefs.id`. Ids of length 7 or 8 fit once
`nano_id_v2` accepts 7 characters. That minimum is decided and is not in the
schema yet. See [05](05-id-mapping-and-catalog-seeding.md).

| v4 URL                           | v5 page                              | What changes                           |
| -------------------------------- | ------------------------------------ | -------------------------------------- |
| `/podcast/:id`                   | `/podcast/:id`                       | Same id and path                       |
| `/album/:id`                     | `/album/:id`                         | Same id and path                       |
| `/episode/:id`                   | `/episode/:id`                       | Same id and path. Live page may differ |
| `/track/:id`                     | `/track/:id`                         | Same id and path                       |
| `/clip/:id` (user clip)          | `/clip/:id`                          | Same id and path                       |
| `/clip/:id` (official chapter)   | `/chapter/:id`                       | Same id. Path changes. Not a v5 clip   |
| `/clip/:id` (official soundbite) | `/official-clip/:id`                 | Same id. Path changes. Not a v5 clip   |
| `/playlist/:id`                  | `/playlist/:id`                      | Same id and path                       |
| `/profile/:id`                   | `/profile/:id`                       | Same id and path                       |
| `/embed/player?...`              | Typed `/embed/<kind>/:id`            | Query string becomes a typed path      |
| `/miniplayer/clip/:id`           | Clip, chapter, or official-clip page | No v5 miniplayer route                 |
| `/miniplayer/episode/:id`        | `/episode/:id`                       | No v5 miniplayer route                 |
| `/videoplayer/clip/:id`          | Clip, chapter, or official-clip page | No v5 videoplayer route                |
| `/videoplayer/episode/:id`       | `/episode/:id`                       | No v5 videoplayer route                |
| `/account-claim-token/:id`       | No v5 page. Tokens are not imported  | URL is not reserved                    |

`/embed/<kind>` is `podcast`, `episode`, `clip`, `chapter`, `official-clip`,
`playlist`, or `album`.

Live items are v4 episodes, so their shared link is `/episode/:id`. v5 also
has `/podcast/livestream/:item_id` and `/music/livestream/:item_id`. If the
canonical page moves, `/episode/:v4Id` still redirects there.

### After grace / v4 shutdown

- Block public requests to the v4 API. Point `api.podverse.fm` at v5.
  The v4 process may keep running on the server with no public route until the
  final database archive is checked, and then it stops
  ([13](13-forced-migration-and-v4-shutdown.md)).
- Keep the web redirects. Shutting down public v4 does not release the old paths.

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

## Website flip

The v5 website goes live when the operators say so. The likely moment is
the first store approval of the mobile app, whichever store that is. The
redirects for old addresses have to be in place before that flip.

## Future plan sets

- Redirect service or Next.js rewrite rules driven by the legacy map.
- DNS / ingress cutover checklist (ops).
- Compatibility matrix for password-reset and membership emails.
