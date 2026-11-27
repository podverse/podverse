**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Record public client config in docs, local env, and GitOps

The website and the phone already read `GET /config`. This plan says so where operators set the seven instance settings, and it writes the two playlist-tag keys on the API templates plan 11 does not touch.

## Rows

R39

## Runs after

103, 60, 61

Plan 103 removes `GET /product/membership`, so the docs name `GET /config`. Plans 60 and 61 edit `apps/web/ENV.md`, `infra/k8s/base/web/source/web-sidecar.env`, and `apps/web/sidecar/.env.example`. This plan comments other keys in those files and does not rewrite the Playlists section.

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## Decisions

- Client env for the seven settings stays. It is what web and mobile use when `GET /config` fails. Do not delete those keys.
- The two playlist-tag keys are API-only. Do not copy them to `NEXT_PUBLIC_*` or `EXPO_PUBLIC_*`. Plan 11 already writes them on `apps/api/.env.example`, `infra/k8s/base/api/source/api.env`, and `packages/helpers-config/src/podverseTestEnv.ts`. Do not edit those three. Plan 11 also adds the Playlist tags subsection in `apps/api/ENV.md`. Leave that subsection. Add the Public client config subsection beside it.
- Values written here are `5` and `50`. `set_if_empty` so a later local override is kept. A character value above 50 is not written.

## Docs

`docs/features/ADD-BY-RSS.md`, the paragraph that starts "The public `GET /product/membership` returns that default." Say the default is `membership.maxAddByRSSFeeds` on `GET /config`. Leave the sentence about `GET /product/membership/comparison`.

`apps/web/ENV.md` documents three of the seven keys. Add one sentence to each existing bullet: the website uses `GET /config`, and this value applies when that request fails.

- `NEXT_PUBLIC_BRAND_NAME`
- `NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE`
- `NEXT_PUBLIC_CONTACT_EMAIL`

The manifest paragraph that says `name` and `short_name` are `NEXT_PUBLIC_BRAND_NAME` becomes: they come from `GET /config` `instance.brandName`, and from `NEXT_PUBLIC_BRAND_NAME` when that request fails. Leave the next sentence, which is about icon and theme URLs. Do not add bullets for legal name, terms version, taste version, or stats days. This file does not list them. Do not rewrite the Playlists section. Plans 60 and 61 own that section.

`apps/mobile/APPS-MOBILE.md`, under "Local env consistency": add one sentence to the `EXPO_PUBLIC_CONTACT_EMAIL` bullet and one to the `EXPO_PUBLIC_ACCOUNT_SIGNUP_MODE` bullet. Each is the fallback when `GET /config` fails. Leave the `EXPO_PUBLIC_MOBILE_WEB_BASE_URL` bullet. The phone has no env for brand, legal name, terms version, taste version, or stats days.

`apps/api/ENV.md`: add a Public client config subsection next to the Playlist tags subsection plan 11 added. Say `GET /config` returns `playlistLimits` from those keys, plus `membership` and `instance`. Do not restate the startup table. Point at it.

Add one new comment line immediately above each of the seven assignments. Do not rewrite an existing comment that already mentions the key (the manifest and icon notes stay). The new line is: `GET /config` is the value the website uses. This applies when that request fails.

- `infra/k8s/base/web/source/web-sidecar.env` — all seven: `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_TERMS_OF_SERVICE_VERSION`, `NEXT_PUBLIC_TASTE_PROFILE_AGREEMENT_VERSION`, `NEXT_PUBLIC_STATS_TRACK_EVENT_RETENTION_DAYS`, `NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE`, `NEXT_PUBLIC_CONTACT_EMAIL`
- `infra/config/local/web-sidecar.env` — the same seven
- `apps/web/sidecar/.env.example` — the same seven
- `tools/web-perf/lighthouse/.env.web.example` — only the three that file already has: `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE`, `NEXT_PUBLIC_CONTACT_EMAIL`. Do not add the other four.

Do not change icon, theme, API URL, or playlists-default lines in those files.

## Local env

`infra/config/local/api.env` uses double quotes. After `OPML_IMPORT_MAX_FEEDS_PER_HOUR="50"`, add:

```
# Empty uses 5. setup.sh does not copy this to the website.
PLAYLIST_TAG_MAX_PER_PLAYLIST="5"
# Empty uses 50. Startup refuses a value above 50. Not copied to the website.
PLAYLIST_TAG_NAME_MAX_LENGTH="50"
```

`scripts/local-env/setup.sh` keeps every existing client copy. Add comments, and do not stop the upserts:

- Above `if [ -n "${BRAND_NAME:-}" ]` (the block that writes `NEXT_PUBLIC_BRAND_NAME`): those website copies are the fallback when `GET /config` fails.
- On the comment above the `NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE` / `EXPO_PUBLIC_ACCOUNT_SIGNUP_MODE` upserts (`ACCOUNT_SIGNUP_MODE_EFFECTIVE`): the client copies are that same fallback.
- Above `if [ -n "${LEGAL_NAME:-}" ]`: the `NEXT_PUBLIC_LEGAL_NAME`, terms version, and taste-profile version copies are that same fallback.
- Replace the comment above the `NEXT_PUBLIC_STATS_TRACK_EVENT_RETENTION_DAYS` upsert. It currently says the web app displays that env value. Say the website reads stats retention from `GET /config`, and this copy is the fallback when that request fails.
- Above the `EXPO_PUBLIC_CONTACT_EMAIL` upsert: that copy is the fallback when `GET /config` fails.

Do not add that sentence to logo, theme, locale, or API URL copies.

After `apply_override "OPML_IMPORT_MAX_FEEDS_PER_HOUR"`, call `set_if_empty` four times. Do not use `API_AND_WORKERS_ENV_FILES`.

```
set_if_empty "$API_APP_ENV" "PLAYLIST_TAG_MAX_PER_PLAYLIST" "5"
set_if_empty "$API_INFRA_ENV" "PLAYLIST_TAG_MAX_PER_PLAYLIST" "5"
set_if_empty "$API_APP_ENV" "PLAYLIST_TAG_NAME_MAX_LENGTH" "50"
set_if_empty "$API_INFRA_ENV" "PLAYLIST_TAG_NAME_MAX_LENGTH" "50"
```

Two comment lines above that block, one variable name each: empty uses 5, and empty uses 50. Neither key is copied to the website or the workers. A character value above 50 is not written.

## GitOps

The checkout is present beside this repo at `/Users/mitcheldowney/repos/pv/k.podcastdj.com`. Namespace `podverse-alpha` only. Edit only:

- `/Users/mitcheldowney/repos/pv/k.podcastdj.com/apps/podverse-alpha/api/source/api.env`
- `/Users/mitcheldowney/repos/pv/k.podcastdj.com/apps/podverse-alpha/web/source/web-sidecar.env`

`api.env` is unquoted. After `TASTE_PROFILE_AGREEMENT_VERSION=2026-10-24`, add:

```
# PLAYLIST_TAG_MAX_PER_PLAYLIST: empty uses 5. A set value may be higher, up to 32767.
PLAYLIST_TAG_MAX_PER_PLAYLIST=5
# PLAYLIST_TAG_NAME_MAX_LENGTH: empty uses 50. Startup refuses a value above 50.
PLAYLIST_TAG_NAME_MAX_LENGTH=50
```

On `web-sidecar.env`, add one new comment line immediately above each of these assignments. Do not change the values (`PodcastDJ`, `Podverse LLC`, `user_signup_email`, `contact@podverse.fm`, the two dates, and `90`). Do not rewrite the existing comment about the installable app name.

- `NEXT_PUBLIC_BRAND_NAME`
- `NEXT_PUBLIC_LEGAL_NAME`
- `NEXT_PUBLIC_TERMS_OF_SERVICE_VERSION`
- `NEXT_PUBLIC_TASTE_PROFILE_AGREEMENT_VERSION`
- `NEXT_PUBLIC_STATS_TRACK_EVENT_RETENTION_DAYS`
- `NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE`
- `NEXT_PUBLIC_CONTACT_EMAIL`

The comment is: the site uses `GET /config`. This value applies when that request fails.

Do not edit management-web, management-api, or workers in that checkout. Their brand names are separate. Do not edit any other namespace. No other file in that checkout sets these keys.

## Do not

- Do not add the playlist-tag keys to web or mobile env.
- Do not change the API route. Plan 103 removes `GET /product/membership`.
- Do not move API URLs, logos, themes, list screens, or playlists opening defaults.

## Tests

No new unit test, API integration test, Playwright spec, or Maestro flow. This plan comments keys and writes two API env values. Plans 100, 101, and 102 hold the behavior.

## Files

- `docs/features/ADD-BY-RSS.md`
- `apps/web/ENV.md`
- `apps/mobile/APPS-MOBILE.md`
- `apps/api/ENV.md`
- `infra/k8s/base/web/source/web-sidecar.env`
- `infra/config/local/web-sidecar.env`
- `infra/config/local/api.env`
- `apps/web/sidecar/.env.example`
- `tools/web-perf/lighthouse/.env.web.example`
- `scripts/local-env/setup.sh`
- `/Users/mitcheldowney/repos/pv/k.podcastdj.com/apps/podverse-alpha/api/source/api.env` (sibling checkout, not this repo)
- `/Users/mitcheldowney/repos/pv/k.podcastdj.com/apps/podverse-alpha/web/source/web-sidecar.env` (sibling checkout, not this repo)

## Release scratchpad

```markdown
## Public client config

- Surfaces: api, web, mobile, ops
- Change: `GET /config` returns one public body with three groups. `membership` is the catalog `GET /product/membership` used to return. `playlistLimits` is the tag count and the character cap (`PLAYLIST_TAG_MAX_PER_PLAYLIST` and `PLAYLIST_TAG_NAME_MAX_LENGTH`; unset means 5 and 50). `instance` is brand name, legal name, contact email, signup mode, terms version, taste-profile agreement version, and stats retention days. `GET /product/membership` is removed. Pricing, comparison, and the management membership editor stay. Web and mobile use this response. When the request fails, they keep the env values they already had. The playlist form uses 5 tags and 50 characters until the limits arrive. API URLs, web-only infrastructure, and Home, Browse, and playlists opening defaults stay on the client.
- Who notices: website and phone users of a server whose brand, signup mode, or membership prices differ from the copy on that client; anyone who called `GET /product/membership`
- Operator steps: set the two playlist-tag keys on the API. 5 and 50 match the previous constants. A character value above 50 keeps the API from starting. Leave the client copies of the seven instance settings in place; they apply only when `GET /config` fails.
```
