**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 44 — Podroll and remote items work signed out on mobile

The Add by RSS podroll and remote-items sections skip the batch lookup when signed out, and a tap
on an unmatched row asks the user to sign in. Plan 40 made both routes answer signed-out callers,
so this plan removes those two sign-in checks: signed out, rows get their directory or provider
match, and a tap resolves the row like it does for a signed-in user.

## Rows

R16, R44

## Runs after

40 (the routes must accept signed-out requests), 32 (signed-out add), and 43 (both edit the
Maestro registration files).

## Files

apps/mobile/src/screens/home/addByRss/AddByRssRemoteItemListSection.tsx
tools/test-assets/assets/e2e/add-by-rss/podroll.xml
apps/mobile/e2e/add-by-rss-anonymous-podroll.yaml
scripts/mobile/e2e-test.sh
apps/mobile/e2e/HOW-TO-RUN.md
docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md
release-notes/scratchpad.md

## Parity source

The signed-in behavior of the same component is the source of truth; the signed-out case now
takes the same code path. `requestWithMobileAuthRefresh` sends no bearer when the access token is
null, so no request helper changes. Web code is not touched; this set changes mobile only, and a
web page that already calls these routes keeps working because a session is now optional, not
forbidden.

## 1. `AddByRssRemoteItemListSection.tsx`

- Line 178: `if (offlineModeEnabled || accessToken === null || !stillReferences) {` becomes
  `if (offlineModeEnabled || !stillReferences) {`.
- Lines 320–323: delete the whole `if (accessToken === null) { onRequestLogin(); return; }` block
  in the `'reference'` case of `openEntry`.
- `openEntry`'s dependency array (around line 383): remove `accessToken` and `onRequestLogin`.
- Line 114: delete `const { onRequestLogin } = useAuthPrompt();`, and delete the
  `import { useAuthPrompt } from '../../../auth/AuthPromptContext';` line (16) when nothing else
  in the file uses it (search the file first).
- Keep `accessToken` in the lookup effect's dependency array (line 223): a sign-in or sign-out
  still reruns the lookup.
- Update any doc comment in the file that says lookups or taps need an account.

- The lookup effect already sends references in chunks of `ADD_BY_RSS_REMOTE_ITEM_LOOKUP_MAX_REFS`
  (100) per request (lines 182–202); keep that loop as is. Lookup has no rate limit (plan 40).
- A tap stays an interactive resolve, not a queued background job: the user is waiting to open
  the row. A 429 on the tap keeps today's notice through `handleRateLimitMessage` (the signed-out
  per-address budget is 120 per minute) and does not retry on its own. Only the artist's
  guid-only albums are resolved by the paced background job (plan 42).

No new copy.

## 2. Fixture — `tools/test-assets/assets/e2e/add-by-rss/podroll.xml`

Served at `http://localhost:2111/e2e/add-by-rss/podroll.xml`. An RSS 2.0 feed declaring the
podcast namespace (`xmlns:podcast="https://podcastindex.org/namespace/1.0"`) and the itunes
namespace, with:

- channel title `E2E Device Podroll Channel`, `<podcast:guid>e2e0de71-0000-4000-8000-0000000000c3</podcast:guid>`,
  `<podcast:medium>podcast</podcast:medium>`, a link and description;
- `<podcast:podroll>` holding one `<podcast:remoteItem feedGuid="11111111-2222-4333-8444-555555555501"/>`
  with no title and no feed URL, so the row's title can only come from the lookup (the guid is
  the seeded directory album; sync with `E2E_MUSIC_ALBUM_PODCAST_GUID` in `tools/web/seed-e2e.mjs`);
- one item `E2E Device Podroll Episode` with guid `e2e-device-podroll-episode`, pubDate
  `Wed, 01 Jan 2025 00:00:00 GMT`, and enclosure
  `http://localhost:2111/e2e/audio/e2e-addbyrss-fresh-60s-440hz.mp3` type `audio/mpeg` length
  `0`.

If plan 42 already created `tools/test-assets/assets/e2e/add-by-rss/`, put the file beside its
fixtures and match their XML layout.

## 3. Maestro — `apps/mobile/e2e/add-by-rss-anonymous-podroll.yaml` (new)

```yaml
appId: com.podverse.app.next
name: Add By RSS Anonymous Podroll
---
# Signed out, a podroll row with only a feed guid gets its title from the public remote-item
# lookup and opens the directory album it names.
#
# Needs flow_needs_e2e_api + flow_needs_test_assets.

- runFlow: shared/launch-and-connect.yaml
- tapOn:
    id: tab-my-library
- tapOn:
    id: library-nav-add-by-rss
- tapOn:
    id: rss-add-button
- tapOn:
    id: rss-url-input
- inputText: http://localhost:2111/e2e/add-by-rss/podroll.xml
- tapOn:
    id: rss-add-submit
- extendedWaitUntil:
    visible:
      id: rss-root-screen
    timeout: ${TIMEOUT_SLOWER}
- extendedWaitUntil:
    visible:
      text: "E2E Device Podroll Channel"
    timeout: ${TIMEOUT_SLOW}
- tapOn:
    text: "E2E Device Podroll Channel"
- extendedWaitUntil:
    visible:
      id: add-by-rss-home-detail-screen
    timeout: ${TIMEOUT_SLOW}
```

Then copy, unchanged, the block in `apps/mobile/e2e/add-by-rss-remote-items.yaml` from the comment
`# Podroll sits after About.` through `tapOn: id: add-by-rss-home-section-podroll` and the
`extendedWaitUntil` for `add-by-rss-podroll-section`, and finish with:

```yaml
- extendedWaitUntil:
    visible:
      text: "E2E Music Album"
    timeout: ${TIMEOUT_SLOW}
- takeScreenshot: add-by-rss-anonymous-podroll
- tapOn:
    text: "E2E Music Album"
- extendedWaitUntil:
    visible:
      id: album-detail-screen
    timeout: ${TIMEOUT_SLOW}
- takeScreenshot: add-by-rss-anonymous-podroll-album
```

Register it after `add-by-rss-anonymous-sections` in `scripts/mobile/e2e-test.sh`
(`flow_needs_e2e_api` and `flow_needs_test_assets`), `apps/mobile/e2e/HOW-TO-RUN.md` § Complete
area list (iOS, Android, and both-platforms lines), and
`docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`.

## Tests

- Maestro: `apps/mobile/e2e/add-by-rss-anonymous-podroll.yaml` (new). `add-by-rss-remote-items.yaml`
  (signed in) is the regression check for the signed-in path and does not change.
- No unit test: the change removes two conditions in a screen component; the pure entry mapping
  (`addByRssRemoteItems.ts`) does not change.

## Release scratchpad

## Add by RSS podroll and remote items work signed out on mobile

- Surfaces: mobile
- Change: signed out, the podroll and remote-items sections of an Add by RSS feed now match their rows against the Podverse directory (up to 100 references per request) and resolve a tapped row instead of asking the user to sign in. A tap that hits the signed-out rate limit shows the existing rate-limit notice.
- Who notices: signed-out mobile users browsing an Add by RSS feed's podroll or remote items
- Operator steps: none
