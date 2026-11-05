# 11 — Web, API, and URL Cutover

## Goal

Move public web and API hostnames to v5 on a schedule that keeps the v4 mobile
app working through the grace period and preserves old links where possible.

## Status

Draft. Needs operator review.

## What we know

- v4 web paths include podcast, episode, clip, playlist, profile, membership,
  reset-password, and related routes. Mobile universal links use `podverse.fm`.
- v4 mobile default API host is under `api.podverse.fm` (path prefix `/api/v1`).
- Deep link schemes include `podverse://` / `com.podverse://`
  ([03](03-store-identity-and-signing.md)).
- v5 route shapes differ; the legacy map ([05](05-id-mapping-and-catalog-seeding.md))
  is required for redirects that still carry v4 shortids.

## Proposed approach

### During grace period

| Host | Role |
| ---- | ---- |
| `api.podverse.fm` (or current prod API) | **Stay on v4** so un-upgraded apps keep working |
| Public web (`podverse.fm`) | Flip to **v5 web** when ready, with redirects from v4 paths |
| Beta hosts | Separate hostnames until promotion ([09](09-beta-environment.md)) |

v5 mobile / web talk to the **v5 API** on its own hostname (or path) during
grace, not to the v4 API.

### Redirects

- `/podcast/:v4Id`, `/episode/:v4Id`, `/clip/:v4Id`, `/playlist/:v4Id`,
  `/profile/:v4Id` → look up legacy map → v5 URL, or a friendly not-found.
- Reset-password and membership links from old emails must either keep working
  on a compatibility path or be clearly expired with instructions.

### After grace / v4 shutdown

- Point API hostname at v5 (or retire the old hostname after clients are gone).
- Keep legacy redirects as long as inbound links matter (search engines, shares).

### AASA and assetlinks

Publish for the production ids and domains before the store build that relies on
them. Include transition entries for `.next` while alpha still exists.

## Honest limits and risks

- Flipping web before redirects are solid breaks shared links.
- Leaving API on v4 while web is on v5 can confuse users who click "open in app"
  across eras; test those paths.
- Custom API domain overrides in the v4 app (advanced settings) may bypass your
  cutover — rare, but support should know.

## Open questions

- Exact production hostnames for v5 API during grace?
- Flip web on the same day as store launch, or earlier?
- How long to keep redirects after v4 shutdown?

## Future plan sets

- Redirect service or Next.js rewrite rules driven by the legacy map.
- DNS / ingress cutover checklist (ops).
- Compatibility matrix for password-reset and membership emails.
