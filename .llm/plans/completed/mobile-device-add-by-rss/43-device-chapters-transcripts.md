**Cursor model:** Opus 5.5 · **Reasoning:** high

# 43 — Chapters and transcripts on the device

An Add by RSS episode's chapters and transcript come from
`POST /account/add-by-rss/chapters-transcript` today: the API fetches the two files (with the
feed's credentials when they are in scope) and returns chapter rows and transcript text. That
route needs a session, so a signed-out user gets nothing.

After this plan, a signed-out user fetches both files on the phone and builds the same rows with
the shared builder from plan 41. A signed-in user always uses the API, whatever the membership.

## Rows

R15, R48

## Runs after

30 (the shared signed-out read filter), 41, and 21 (the device feed parse). 21 did not
export a resource fetch; this plan splits that fetch out of the same parse. 42 as well, because
both edit the Maestro registration files.

## Files

apps/mobile/src/lib/addByRss/deviceParse.ts
apps/mobile/src/lib/addByRss/deviceParseEngine.ts
apps/mobile/src/lib/addByRss/deviceParseEngine.test.ts
apps/mobile/src/lib/addByRss/deviceItemSections.ts
apps/mobile/src/lib/addByRss/deviceItemSections.test.ts
apps/mobile/src/data/repositories/segmentsRepository.ts
apps/mobile/e2e/add-by-rss-anonymous-sections.yaml
scripts/mobile/e2e-test.sh
apps/mobile/e2e/HOW-TO-RUN.md
docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md
release-notes/scratchpad.md

## Parity source

`apps/api/src/controllers/account/accountAddByRSSChaptersTranscript.ts`: chapters JSON →
`buildAddByRSSChapterResponses` (plan 41); transcript body → text. On mobile,
`toAddByRssItemSections` in `apps/mobile/src/lib/addByRss/itemSections.ts` already maps that
answer to `AddByRssItemSections`; the device branch feeds it the same shape, so the episode page,
the full player, and `nowPlayingAddByRssSections.ts` see no difference.

## Decisions fixed here

- **Route by sign-in.** `context.accessToken !== null` → the API; otherwise the phone. This is the
  same split as `resolveAddByRssParsePath` (plan 30), which returns `'device'` only with no
  signed-in session, so no account snapshot read is needed.
- **Hidden feeds give nothing while signed in.** A feed the shared signed-out read filter hides in
  this session (`signed_out_owned = 1` while signed in, § Seams for the second pass) is not used
  for chapters and transcripts: return empty sections without a request.
- **Credentials only through area B's fetch.** A credentialed request must use the device fetch
  that re-checks credential scope on every redirect hop and never sends an eager Authorization
  header through a stack whose redirect handling is unverified
  (**add-by-rss-client-held-credentials**). Do not use axios `request` or raw `fetch` for these
  files.
- **Same failure behavior as the API path.** The API answers an error when either file fails, and
  `segmentsRepository` lets it propagate. The device branch throws on a non-2xx answer or a network
  error the same way, so the hooks show what they show today.

## The device fetch

Plan 21 left the redirect loop private inside `runAddByRssDeviceParse`
(`deviceParseEngine.ts`). This plan pulls that loop into one shared fetch and has the feed parse
call it. Do not add a second redirect or credential stack, and do not stop because the export is
missing.

Engine (`deviceParseEngine.ts`), exported, with no React Native or Expo imports. It follows
redirects one hop at a time (at most `ADD_BY_RSS_DEVICE_MAX_REDIRECTS`), re-checks credential
scope on every hop through the existing redirect tracker, applies `deps.rewriteUrl` on each hop,
and uses the caller's pacer, User-Agent, timeout, and abort signal. It returns
`{ status, body }` for the final response. It does not send conditional-cache headers, hash the
body, enforce `MAX_FEED_BODY_BYTES`, or parse RSS. A transport failure or abort throws.

`runAddByRssDeviceParse` calls this fetch for the feed URL, then keeps its current 304, hash,
body-size, and parse classification. A transport failure on the feed parse is still
`status: 'failed'`. The caller's abort is still the only throw from `parseAddByRssFeedOnDevice`
besides Offline Mode. Existing `deviceParseEngine.test.ts` cases stay green.

Wrapper (`deviceParse.ts`): `fetchAddByRssResourceOnDevice`, below. It throws
`OfflineModeEnabledError` while Offline Mode is on, then calls the engine with the same
`expo/fetch`, host pacer, User-Agent, E2E rewrite, insecure-credentials flag, and timeout that
`parseAddByRssFeedOnDevice` already passes.

```ts
fetchAddByRssResourceOnDevice(input: {
  url: string;
  feedUrl: string; // credential scope is decided against this feed
  credentials: AddByRssCredentials | null;
  signal?: AbortSignal;
}): Promise<{ status: number; body: string }>;
```

`fetchAddByRssItemSectionsOnDevice` calls this wrapper. A credentialed request does not use axios
`request` or raw `fetch`.

## 1. `apps/mobile/src/lib/addByRss/deviceItemSections.ts` (new)

- Pure, unit-tested: `itemSectionsFromDeviceBodies(input: { itemIdText: string; chaptersBody: string | null; transcriptBody: string | null }): AddByRssItemSections`.
  - Chapters: `safeJsonParse` from `apps/mobile/src/data/db/serialization` (as `publisherRefs.ts`
    imports it), take `chapters` when it
    is an array, else `[]`; `buildAddByRSSChapterResponses(itemIdText, chapters)`.
  - Transcript: the body as text (`undefined` when null).
  - Return `toAddByRssItemSections({ chapters, transcriptText })`. Do not repeat its
    table-of-contents filter.
- Effectful: `fetchAddByRssItemSectionsOnDevice(input: { feedUrl; itemIdText; urls: AddByRssItemSectionUrls; credentials: AddByRssCredentials | null; signal? })`
  fetches `urls.chaptersFeedUrl` and `urls.transcriptUrl` (each only when defined, one after the
  other), throws an `Error` naming the resource and status for a non-2xx answer, and returns
  `itemSectionsFromDeviceBodies(…)`.

## 2. `apps/mobile/src/data/repositories/segmentsRepository.ts`

In `getAddByRssChaptersAndTranscript` (line 40):

- Keep the URL and credential reads as they are (`addByRssItemSectionUrls`,
  `hasUrlInCredentialScope`, `getForCurrentAccount`).
- Signed in (`context.accessToken !== null`): first ask whether `input.feedUrl` is hidden in this
  session through the shared signed-out read filter area C names in `addByRssDevicePath.ts` or
  `addByRssRepository.ts`; hidden → `return { chapters: [], transcriptRows: [] }`. Otherwise the
  existing API call, unchanged.
- Signed out → `return fetchAddByRssItemSectionsOnDevice({ feedUrl, itemIdText, urls, credentials })`.
- Update the function's doc comment: signed in uses the API, signed out fetches on the phone, and
  a hidden feed gives empty sections.

Both callers (`useAddByRssItemSections.ts`, `nowPlayingAddByRssSections.ts`) stay unchanged.

## 3. Maestro

New `apps/mobile/e2e/add-by-rss-anonymous-sections.yaml`: signed out (no
`shared/login-seeded-user.yaml`), add `http://localhost:2111/feeds/feed-podcast-1.rss` (every item
in the generated test-assets feeds links a chapters file and transcripts), open the channel
(`text: "Vitium amitto volup.*"`), open the episode
`text: "Tamdiu deinde doloribus.*"` (the feed's first item; both titles are the seeded values
mirrored in `E2E_TEST_ASSETS_PARSED_FEED` in `apps/api/src/controllers/account/accountAddByRSSParse.ts`),
then follow `add-by-rss-episode-sections.yaml` from the chapters tab through the
`add-by-rss-episode-sections-transcript` screenshot, asserting
`add-by-rss-episode-detail-chapter-row` and `add-by-rss-episode-detail-tab-transcript-content`
by id only (the generated text is not asserted). Screenshots
`add-by-rss-anonymous-sections-chapters` and `add-by-rss-anonymous-sections-transcript`. Header
comment: signed out, the device fetches the episode's chapters and transcript itself.

Register it after `add-by-rss-anonymous-artist` in the same three places plan 42 lists
(`scripts/mobile/e2e-test.sh` `flow_needs_e2e_api` and `flow_needs_test_assets`,
`apps/mobile/e2e/HOW-TO-RUN.md`, `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`).

## Tests

- `apps/mobile/src/lib/addByRss/deviceParseEngine.test.ts`: a non-feed response comes back as
  status and body and is not parsed; a redirect that leaves the feed's credential scope drops
  the Authorization header. The existing feed-parse cases stay the regression for that path.
- `apps/mobile/src/lib/addByRss/deviceItemSections.test.ts`: a chapters body with two
  table-of-contents chapters gives two chapters with ids `<itemIdText>-ch-0` / `-ch-1` and the
  first's end time from the second's start; a body that is not JSON, or JSON without a `chapters`
  array, gives no chapters; a VTT transcript body gives rows; both bodies null gives empty
  sections.
- Maestro: `apps/mobile/e2e/add-by-rss-anonymous-sections.yaml` (new).
  `add-by-rss-episode-sections.yaml` (signed-in member, API path) is the signed-in regression
  check and does not change.
- No unit test for the hidden-feed branch: `segmentsRepository.ts` reads the `expo-sqlite`
  repository; the branch is one early return on area C's filter.

## Release scratchpad

## Add by RSS chapters and transcripts load on the phone when signed out

- Surfaces: mobile
- Change: signed out, Add by RSS episode chapters and transcripts are fetched by the phone from the feed's host instead of through the Podverse API. Private feed credentials go only to hosts in the feed's credential scope, checked on every redirect. Signed-in users still load them through the API, whatever their membership.
- Who notices: signed-out mobile users now see chapters and transcripts on Add by RSS episodes
- Operator steps: none
