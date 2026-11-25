**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 11 — Catalog-restricted Playwright lane

Add one Playwright lane that runs the web app, its sidecar, and its API with all three catalog
settings on, so later plans can write specs against a narrowed instance. The default lane keeps
all three blank and goes on proving that unset settings give today's full site. This plan adds
the lane wiring, the shared E2E constants, a spec that proves the sidecar delivers the settings
at runtime, and a spec that proves stored content still opens on a narrowed instance: off-list
shows and their episodes, clips, chapters, and embeds; allowlisted shows' clips, chapters, and
livestreams; stored music pages and embeds with Music off; playlists, profiles, and Subscribe.
It changes no product code.

## Rows

R3, R10, R11, R43, R44, R45, R46, R48, R61, R62, R63, R64

## Runs after

10, 12

## Files

- apps/web/playwright.e2e-server-env.ts
- apps/web/playwright.catalog-restricted.config.ts
- apps/web/playwright.config.ts
- apps/web/package.json
- apps/web/e2e/helpers/seedConstants.ts
- apps/web/e2e/helpers/catalogRestricted.ts
- apps/web/e2e/catalog-restricted-runtime-config.spec.ts
- apps/web/e2e/catalog-restricted-stored-content.spec.ts
- makefiles/local/Makefile.local.e2e.mk
- scripts/e2e-html-hub-report.mjs

## Settled decisions

- **One lane, all three settings on.** Each lane is a full `next build` plus API and sidecar
  start, so one lane for the three settings keeps the run short. Specs in it name which setting
  they prove.
- **The lane's API gets the same settings.** `buildE2eWebApiEnvPrefix` passes the lane's values
  as `CATALOG_*` to the API it starts on port 4030, next to the `NEXT_PUBLIC_CATALOG_*` values
  the sidecar gets. So step 09's allowlist-only search endpoint answers on this lane, and step
  11's Add by RSS refusals are live here. Each lane starts its own API
  (`reuseExistingServer: false`), so the default lane's API keeps the blank values from
  `apiTestEnvBase()` (plan 12). The contract for those API behaviors (status codes, the endpoint
  being unreachable while the allowlist is blank) is covered by API integration tests that
  toggle `config.catalog`; lane specs cover what a visitor sees.
- **Lane allowlist.** The allowlisted podcast and livestream shows, plus the seeded music album
  and artist. Listing the music shows means a music result missing from allowlist-only search on
  this lane is missing because Music is off, not because of the allowlist.
- **Stored content keeps its pages.** No page, embed, row, or player in this set returns
  not-found because a stored show is off the list or is music (R61–R64). The stored-content
  spec asserts this on the lane where both settings are on. No plan adds a gate to the clip edit
  page or forces the Podcast Index feed page to not-found; there is nothing to assert for those
  beyond the absence of a gate.
- **Lane name** `catalog-restricted`. Spec files are `apps/web/e2e/catalog-restricted-*.spec.ts`.
  The lane config matches only that glob; the default config ignores it.
- **Default lane sends the keys blank**, so a value in the operator's shell cannot leak into the
  default run (same approach as `NEXT_PUBLIC_COOKIE_CONSENT_BANNER_ENABLED`).
- **No seed change.** Every id below is already seeded by `tools/web/seed-e2e.mjs` or
  `tools/web/seed-embed-fixtures.mjs`.

### Lane allowlist (Podcast Index feed ids)

| Constant (in `seedConstants.ts`) | Id | Seeded show |
| --- | --- | --- |
| `E2E_PODCAST_FEED_PI_ID` | 876543211 | `e2ePodChnl001` "E2E Podcast Seed Channel" (chapter `e2eChapIntro01`, clip `e2eClip00000001`, official clip `e2eSoundbite001`) |
| `E2E_LIVESTREAM_FEED_PI_ID` | 876543210 | `v5fCrIj9Io` "E2E Livestream Channel" (live item `e2eLiveStrm01`) |
| `E2E_MUSIC_FEED_PI_ID` | 876543212 | album `e2eMusicAlbm01` (track `e2eMusicTrk001`) |
| `E2E_MUSIC_ARTIST_FEED_PI_ID` | 876543218 | artist `e2eMusicChnl01` |

### Stored shows off the list

| Constant | Id | Seeded show |
| --- | --- | --- |
| `EMBED_SAMPLE_PODCAST_FEED_PI_ID` | 876543220 | `embSmpPodAud1` "Cosmos Classroom" (episode `embSmpEpAud1`, clip `embSmpClip001`, official clip `embSmpSbite01`, chapter `embSmpChap001`; first row of public playlist `e2eEmbPlList01`) |
| `E2E_BOOST_EPISODE_FEED_PI_ID` (already exported) | 876543247 | `e2eBoostCh01` "E2E Boost Podcast" (episode `e2eBoostEp01`) |

The five ids above were checked against the seeds when this plan was written
(`tools/web/seed-e2e.mjs` lines 91, 126, 197, 279; `tools/web/seed-embed-fixtures.mjs` line 103).
Check again while adding the constants; if one differs, use the seed's value.

## `apps/web/e2e/helpers/seedConstants.ts`

Export these, each beside its show's existing `id_text` constant, with a one-line comment
"Sync with tools/web/seed-e2e.mjs." (or `seed-embed-fixtures.mjs` for the embed one):

```typescript
export const E2E_PODCAST_FEED_PI_ID = 876543211;
export const E2E_LIVESTREAM_FEED_PI_ID = 876543210;
export const E2E_MUSIC_FEED_PI_ID = 876543212;
export const E2E_MUSIC_ARTIST_FEED_PI_ID = 876543218;
export const EMBED_SAMPLE_PODCAST_FEED_PI_ID = 876543220;
```

## `apps/web/e2e/helpers/catalogRestricted.ts` (new)

The lane's settings and the off-list fixtures. Later plans import from here.

```typescript
import {
  E2E_BOOST_EPISODE_CHANNEL_ID_TEXT,
  E2E_BOOST_EPISODE_ITEM_ID_TEXT,
  E2E_LIVESTREAM_FEED_PI_ID,
  E2E_MUSIC_ARTIST_FEED_PI_ID,
  E2E_MUSIC_FEED_PI_ID,
  E2E_PODCAST_FEED_PI_ID,
  EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT,
} from './seedConstants';

/** Podcast Index ids on the catalog-restricted lane's allowlist. */
export const E2E_CATALOG_RESTRICTED_PODCAST_INDEX_IDS: readonly number[] = [
  E2E_PODCAST_FEED_PI_ID,
  E2E_LIVESTREAM_FEED_PI_ID,
  E2E_MUSIC_FEED_PI_ID,
  E2E_MUSIC_ARTIST_FEED_PI_ID,
];

/** A stored podcast off the allowlist, with episodes, a clip, an official clip, and chapters. */
export const E2E_CATALOG_OFF_LIST_PODCAST_CHANNEL_ID_TEXT = EMBED_FIXTURE_PODCAST_CHANNEL_ID_TEXT;

/** A second stored podcast off the allowlist, with one episode. */
export const E2E_CATALOG_OFF_LIST_BOOST_CHANNEL_ID_TEXT = E2E_BOOST_EPISODE_CHANNEL_ID_TEXT;
export const E2E_CATALOG_OFF_LIST_BOOST_EPISODE_ID_TEXT = E2E_BOOST_EPISODE_ITEM_ID_TEXT;
```

Keep it to these exports. Every other id (`E2E_PODCAST_CHANNEL_ID_TEXT`, `E2E_CLIP_ID_TEXT`,
`EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT`, and so on) is imported from `seedConstants.ts` directly; do
not alias it here.

## `apps/web/playwright.e2e-server-env.ts`

Add the option type, one helper, and thread it into the sidecar/app env and the API env:

```typescript
export type E2eCatalogEnvOptions = {
  musicDisabled?: boolean;
  addByRSSDisabled?: boolean;
  podcastIndexIdAllowlist?: readonly number[];
};

export type E2eWebSidecarEnvOptions = {
  cloudflareWebAnalyticsEnabled?: boolean;
  cookieConsentBannerEnabled?: boolean;
  userSignupEmail?: boolean;
  customThemesProfile?: E2eCustomThemesProfile;
  catalog?: E2eCatalogEnvOptions;
};

/** Unprefixed catalog keys; blank unless the lane sets them. */
function buildE2eCatalogEnv(catalog: E2eCatalogEnvOptions | undefined): Record<string, string> {
  return {
    CATALOG_MUSIC_DISABLED: catalog?.musicDisabled === true ? 'true' : '',
    CATALOG_ADD_BY_RSS_DISABLED: catalog?.addByRSSDisabled === true ? 'true' : '',
    CATALOG_PODCAST_INDEX_ID_ALLOWLIST: catalog?.podcastIndexIdAllowlist?.join(',') ?? '',
  };
}
```

- In `buildE2eWebNextPublicEnv`, after `NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE`, spread the same values
  with `NEXT_PUBLIC_` in front:

```typescript
    ...Object.fromEntries(
      Object.entries(buildE2eCatalogEnv(options?.catalog)).map(([key, value]) => [
        `NEXT_PUBLIC_${key}`,
        value,
      ])
    ),
```

  This one function feeds the sidecar prefix, the app start env, and the build env.
- In `buildE2eWebApiEnvPrefix`, after the `ACCOUNT_SIGNUP_MODE` spread and before
  `...PODVERSE_SKIP_DOTENV_ENV`, add `...buildE2eCatalogEnv(options?.catalog),`. Every lane then
  passes the API the same values its sidecar gets (blank for every lane but this one, which
  matches `apiTestEnvBase()`).
- Do not import the e2e helpers into this file; the lane config passes the ids in.

## `apps/web/playwright.catalog-restricted.config.ts` (new)

Copy `playwright.cookie-consent-enabled.config.ts` and change:

- Doc comment: "Catalog-restricted lane: Music off, Add by RSS off, and a Podcast Index id
  allowlist on the web sidecar and the API (see e2e/helpers/catalogRestricted.ts)."
- `outputDir: '../../.artifacts/e2e-test-results/web-catalog-restricted'`
- `testMatch: '**/catalog-restricted-*.spec.ts'`
- `webServer: buildE2eWebServers({ catalog: { musicDisabled: true, addByRSSDisabled: true, podcastIndexIdAllowlist: E2E_CATALOG_RESTRICTED_PODCAST_INDEX_IDS } })`,
  importing the constant from `./e2e/helpers/catalogRestricted`.
- Keep `fullyParallel: false`, `workers: 1`, the retries line, `timeout: 10_000`,
  `reporter: 'list'`, `use.baseURL`, and the chromium project as in the copied file.

## `apps/web/playwright.config.ts`

Add `'**/catalog-restricted-*.spec.ts',` to `testIgnore`, after
`'**/custom-themes-combo.spec.ts'`.

## `apps/web/package.json`

Add, after the last `test:e2e:custom-themes-*` script:

```json
"test:e2e:catalog-restricted": "playwright test -c playwright.catalog-restricted.config.ts",
```

## `makefiles/local/Makefile.local.e2e.mk`

Four edits, each copying the cookie-consent lane's line or block:

1. `e2e_test_playwright`: after the `test:e2e:signup-enabled` line add
   `npm run test:e2e:catalog-restricted -w @podverse/web -- --reporter=list || exit_code=$$?; \`
1. `e2e_test`: the same line after its `test:e2e:signup-enabled` line.
1. `e2e_test_report`:
   - add `WEB_CATALOG_RESTRICTED_REPORT="$$REPORT_BASE/web-catalog-restricted"; \` after
     `WEB_CUSTOM_THEMES_COMBO_REPORT=…`
   - add `"$$WEB_CATALOG_RESTRICTED_REPORT"` to the `mkdir -p` list
   - after the "Web custom themes (combo)" run block, add a block:
     `echo "--- Web catalog-restricted E2E report ---"; \`, then
     `PLAYWRIGHT_HTML_OUTPUT_DIR="$$WEB_CATALOG_RESTRICTED_REPORT" \`,
     `E2E_STEP_SCREENSHOTS=true \`, `PLAYWRIGHT_HTML_OPEN=never \`, and
     `npm run test:e2e:catalog-restricted -w @podverse/web -- --reporter=../../scripts/e2e-html-steps-reporter.ts || exit_code=$$?; \`
   - in the summary echo list, after the custom themes combo line:
     `echo "  Web (catalog restricted):    $$WEB_CATALOG_RESTRICTED_REPORT/index.html"; \`
1. `e2e_test_web_report_spec`: in the `case "$(SPEC)" in` block, add
   `*catalog-restricted-*) WEB_E2E_CMD="npm run test:e2e:catalog-restricted -w @podverse/web" ;; \`
   after the `*custom-themes-combo*` line.

Recipe lines use tabs. Keep each continued line's trailing `; \` exactly as its neighbors do.
`e2e_test_report_scoped` is not routed (it runs only the default lane, as for the other lanes).

## `scripts/e2e-html-hub-report.mjs`

Add `{ id: 'web-catalog-restricted', label: 'Web (catalog restricted)' },` to `KNOWN_SLOTS`
after the `web-custom-themes-combo` entry.

## Tests

Both specs are lane-only. Do not add them to `makefiles/local/e2e-spec-order-web.txt`; that file
orders the default lane only. Titles and steps are full sentences (**e2e-readability**). End each
test with one `capturePageLoad` (from `./helpers/stepScreenshots`) on the last verified element
(**e2e-screenshot-verified-element**).

### `apps/web/e2e/catalog-restricted-runtime-config.spec.ts` (new)

One `test.describe` "Catalog-restricted lane runtime config" with one test:

- Name: "When the catalog settings are set on the sidecar, the page receives them through
  runtime config."
- `await page.goto('/')`, then `await expect(page).toHaveURL('/')`.
- Read the three values with one `page.evaluate` that copies the `Reflect.get` narrowing in
  `expectWebPushConfigured` (`apps/web/e2e/helpers/webPushPermission.ts`): read
  `__PODVERSE_RUNTIME_CONFIG__` from `globalThis`, then `env`, then each
  `NEXT_PUBLIC_CATALOG_*` key, returning `''` for anything that is not a string. Return
  `{ musicDisabled, addByRSSDisabled, allowlist }`. No `as` casts.
- Assert `musicDisabled` is `'true'`, `addByRSSDisabled` is `'true'`, and `allowlist` equals
  `E2E_CATALOG_RESTRICTED_PODCAST_INDEX_IDS.join(',')`.
- `capturePageLoad(page, testInfo, 'Home loads on the catalog-restricted lane with the catalog settings in runtime config.')`.

The values in `__PODVERSE_RUNTIME_CONFIG__` come from the sidecar response, so this spec fails if
the sidecar or the runtime key list misses a key.

### `apps/web/e2e/catalog-restricted-stored-content.spec.ts` (new)

Top-level describe "Catalog-restricted stored content". Build page paths with the `build*Path`
helpers from `@podverse/helpers` (`buildPodcastPath`, `buildEpisodePath`, `buildClipPath`,
`buildOfficialClipPath`, `buildChapterPath`, `buildPodcastLivestreamPath`, `buildAlbumPath`,
`buildArtistPath`, `buildTrackPath`, `buildPlaylistPath`, `buildProfilePath`). Embed paths are
literal `/embed/<kind>/<id>` strings, as in `embed-routes.spec.ts`. Embed assertions come from
`./helpers/embedAssertions` (`expectEmbedSingleShell`, `expectEmbedListShell`). Ids come from
`./helpers/catalogRestricted` and `./helpers/seedConstants`; add nothing to either file beyond
this plan's constants.

One local helper:

- `expectStoredPageOpens(page, path)`: `const response = await page.goto(path)`; expect
  `response?.status()` to be 200; expect
  `page.getByText('This page could not be found.', { exact: true })` to have count 0.

Keep each test to four navigations or fewer so it fits the lane's 10-second budget; the
Subscribe test calls `test.setTimeout(20_000)` because it signs in first. Tests:

1. "When the allowlist is set, stored shows off the list still open with their episodes." —
   `expectStoredPageOpens` for `buildPodcastPath(E2E_CATALOG_OFF_LIST_PODCAST_CHANNEL_ID_TEXT)`
   (then the heading `EMBED_SAMPLE_PODCAST_CHANNEL_TITLE` is visible),
   `buildEpisodePath(EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT)`,
   `buildPodcastPath(E2E_CATALOG_OFF_LIST_BOOST_CHANNEL_ID_TEXT)`, and
   `buildEpisodePath(E2E_CATALOG_OFF_LIST_BOOST_EPISODE_ID_TEXT)`. (R61, R62)
1. "When the allowlist is set, a clip, an official clip, and a chapter of a stored show off the
   list still open." — `buildClipPath(EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT)`,
   `buildOfficialClipPath(EMBED_FIXTURE_SOUNDBITE_ID_TEXT)`,
   `buildChapterPath(EMBED_FIXTURE_CHAPTER_ID_TEXT)`. (R61)
1. "When the allowlist is set, single embeds of a stored show off the list still load." —
   `/embed/episode/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}`,
   `/embed/clip/${EMBED_FIXTURE_CLIP_AUDIO_ID_TEXT}`,
   `/embed/official-clip/${EMBED_FIXTURE_SOUNDBITE_ID_TEXT}`, and
   `/embed/chapter/${EMBED_FIXTURE_CHAPTER_ID_TEXT}` each show `expectEmbedSingleShell`.
   (R61, R64)
1. "When the allowlist is set, list embeds of a stored show off the list and a public playlist
   embed still load." — `/embed/podcast/${E2E_CATALOG_OFF_LIST_PODCAST_CHANNEL_ID_TEXT}`,
   `/embed/episode-chapters/${EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT}`, and
   `/embed/playlist/${E2E_EMBED_PLAYLIST_ID_TEXT}` each show `expectEmbedListShell`. (R61, R64)
1. "Clips, official clips, and chapters of an allowlisted show open." —
   `buildPodcastPath(E2E_PODCAST_CHANNEL_ID_TEXT)` (then the heading
   `E2E_PODCAST_CHANNEL_TITLE` is visible), `buildClipPath(E2E_CLIP_ID_TEXT)`,
   `buildOfficialClipPath(E2E_SOUNDBITE_ID_TEXT)`, and
   `buildChapterPath(E2E_ITEM_CHAPTER_INTRO_ID_TEXT)`. Confirm in `tools/web/seed-e2e.mjs` that
   the clip, official clip, and chapter belong to `e2ePodChnl001`; if one does not, use one that
   does and say so in your final message. (R43)
1. "A podcast livestream of an allowlisted show opens." —
   `buildPodcastLivestreamPath(E2E_LIVESTREAM_ITEM_ID_TEXT)`, then
   `getByText(E2E_LIVESTREAM_ITEM_TITLE).first()` is visible. (R44)
1. "When Music is off, stored album, artist, and track pages still open, and a podcast-style
   track URL still behaves as it does today." — `buildAlbumPath(E2E_MUSIC_ALBUM_ID_TEXT)` (then
   `getByText(E2E_MUSIC_ALBUM_TITLE).first()` is visible),
   `buildArtistPath(E2E_MUSIC_CHANNEL_ID_TEXT)`, `buildTrackPath(E2E_MUSIC_TRACK_ONE_ID_TEXT)`,
   and `buildEpisodePath(E2E_MUSIC_TRACK_ONE_ID_TEXT)`. For the last one assert only that the
   not-found text has count 0 after the load settles; do not assert the final URL (the existing
   redirect, if any, stays as it is). (R63)
1. "When Music is off, stored album and track embeds still load." —
   `/embed/album/${EMBED_FIXTURE_MUSIC_ALBUM_ID_TEXT}` shows `expectEmbedListShell` and
   `/embed/track/${EMBED_FIXTURE_MUSIC_TRACK_AUDIO_ID_TEXT}` shows `expectEmbedSingleShell`. If
   `embed-routes.spec.ts` asserts a different shell for the album embed, use the one it asserts.
   (R63, R64)
1. "When the allowlist is set, a public playlist and a public profile still load, and a playlist
   row for a stored show off the list opens its episode." —
   `expectStoredPageOpens(page, buildPlaylistPath(E2E_EMBED_PLAYLIST_ID_TEXT))`; the first
   `a[href="<path>"]` locator, where `<path>` is
   `buildEpisodePath(EMBED_FIXTURE_PODCAST_EPISODE_AUDIO_ID_TEXT)`, is visible (rows render on
   the client); click it; the URL ends with that episode path and the
   not-found text has count 0. Then
   `expectStoredPageOpens(page, buildProfilePath(E2E_SEO_PUBLIC_PROFILE_ID_TEXT))` and the URL
   still ends with that profile path. If the playlist page renders rows with a different link
   target, use the row's episode link as it renders. (R45, R46, R62)
1. "When the allowlist is set, a signed-in listener still sees Subscribe on an allowlisted show
   and on a stored show off the list." — `test.setTimeout(20_000)`; `loginE2eUser(page)` from
   `./helpers/customThemes`; then for `buildPodcastPath(E2E_PODCAST_CHANNEL_ID_TEXT)` and
   `buildPodcastPath(E2E_CATALOG_OFF_LIST_PODCAST_CHANNEL_ID_TEXT)`, `expectStoredPageOpens` and
   `page.getByRole('button', { name: /^(Subscribe|Unsubscribe)$/ }).first()` is visible (the
   seed user may already subscribe). Do not click it. (R48)

Queue and history rows (R62) open the same episode, clip, and show pages the tests above load,
and no plan gates those pages, so no queue or history fixture is added.

### Default lane

No new spec. The existing detail, embed, playlist, and profile specs run with all three keys
blank and keep proving that unset settings give today's site.

## Release scratchpad

none
