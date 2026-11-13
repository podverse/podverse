**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 32 — Add, check, subscribe, and remove pick the parse path

Every interactive Add by RSS action on mobile picks the server parse or the device parse through
`resolveAddByRssParsePath`. Signed out, the action runs on the phone with no gate and no feed
limit. Signed in, it runs on the server with today's membership gate, including while the
account snapshot is still loading; a server refusal opens the gate as today. The Library list
leaves out the signed-out user's feeds while signed in without claiming them, and removing a
feed signed out makes no account request.

## Rows

R1, R2, R5, R8, R23, R24, R25, R26

## Runs after

31

## Files

apps/mobile/src/hooks/useAddByRssParsePath.ts
apps/mobile/src/data/repositories/addByRssRepository.ts
apps/mobile/src/hooks/useAddByRssAddFlow.ts
apps/mobile/src/screens/home/addByRss/useAddByRssFeedCheck.ts
apps/mobile/src/screens/rss/useAddByRssCredentialsForm.ts
apps/mobile/src/screens/rss/AddByRssRootScreen.tsx
apps/mobile/src/screens/home/AddByRssHomeDetailScreen.tsx
apps/mobile/src/hooks/useAddByRssFeeds.ts
apps/mobile/src/screens/rss/AddByRssCredentialsScreen.tsx
apps/mobile/e2e/membership-gate.yaml
apps/mobile/e2e/add-by-rss-anonymous.yaml
scripts/mobile/e2e-test.sh
apps/mobile/e2e/HOW-TO-RUN.md
docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md
release-notes/scratchpad.md

## Decisions already made (transcribe, do not revisit)

- Signed out: no membership gate and no feed limit on add, check, credentials check, or listed
  album subscribe. The feed is fetched and parsed on the phone and stays on the phone.
- Signed in, whatever the membership: the server parse and server follow, as today. Free and
  lapsed accounts see the membership gate on add, as today. There is no device parse, no
  fallback to the device, and no saved-for-later state for them.
- While the account snapshot is loading (`isTierKnown` false), a signed-in action does not open
  the gate from the unknown tier. It sends the request, and a 403 goes through
  `handleGateError` (including `limit_reached`, which keeps opening the existing limit gate;
  area F owns that copy).
- Credential storage stays exactly as it is in these files (written only when there is an
  `account.id_text`). Area B owns where a signed-out user's username and password are kept and
  adds that branch to the same lines.
- The playlist screens (`useAddToPlaylist.tsx`, `LibraryPlaylistsScreen.tsx`) keep their
  `evaluateFeature('add_by_rss_add')` calls. Do not touch them.
- `offlineModeViews.ts` keeps `add_by_rss_add` as an offline-unavailable surface: the device
  parse needs the network too.

## The signed-in gate, one rule for every site

```ts
const access = evaluateFeature(feature);
if (parsePath === 'server' && isTierKnown && !access.allowed) {
  openGate(access.reason);
  return;
}
```

`feature` is the one each site checks today. `isTierKnown` comes from `useAccessTier()` beside
`evaluateFeature`. Signed out, `parsePath` is `'device'` and nothing is checked. The existing
`catch` blocks keep calling `handleGateError(error)` first.

## 1. `apps/mobile/src/hooks/useAddByRssParsePath.ts` (new)

```ts
import { useMemo } from 'react';

import { useAuth } from '../auth/AuthProvider';
import type { AddByRssParsePath } from '../lib/addByRss/parsePath';
import { resolveAddByRssParsePath } from '../lib/addByRss/parsePath';

/** Which parse this user's Add by RSS actions use right now. */
export const useAddByRssParsePath = (): AddByRssParsePath => {
  const { account, status } = useAuth();
  return useMemo(
    () => resolveAddByRssParsePath(account, { isAuthenticated: status === 'authenticated' }),
    [account, status]
  );
};
```

## 2. `parseNowByPath` in `addByRssRepository.ts`

Add right after `parseNowOnDevice` (plan 31):

```ts
parseNowByPath: async (
  context: MobileAuthRequestContext,
  feedUrl: string,
  credentials: AddByRssCredentials | null,
  options: { followed?: boolean; path: AddByRssParsePath }
): Promise<{ requestId: string | null; result: AddByRssPollResult }> => {
  const followedOption =
    options.followed !== undefined ? { followed: options.followed } : undefined;
  return options.path === 'device'
    ? addByRssRepository.parseNowOnDevice(context, feedUrl, credentials, followedOption)
    : addByRssRepository.parseNow(context, feedUrl, credentials, followedOption);
},
```

`import type { AddByRssParsePath } from '../../lib/addByRss/parsePath';` on its own line. Doc
comment: the one interactive parse every screen calls; the path comes from
`resolveAddByRssParsePath`. The server path is never retried on the device.

## 3. `apps/mobile/src/hooks/useAddByRssAddFlow.ts`

- `const { evaluateFeature, isTierKnown } = useAccessTier();` and
  `const parsePath = useAddByRssParsePath();`.
- Replace the comment above `addAccess` with: signed in, adding needs server-side parsing, so it
  is membership-tier, and feeds already added stay visible and playable when a membership lapses.
  Signed out, the phone parses the feed and nothing is gated.
- The `if (!addAccess.allowed)` block becomes
  `if (parsePath === 'server' && isTierKnown && !addAccess.allowed) { openGate(addAccess.reason); return; }`.
- Inside the `try`, wrap the follow request in `if (parsePath === 'server') { … }` with this
  comment above it: signed in, the server follow is what the server parses and every device of
  the account syncs; signed out, the feed stays on this phone. Keep the existing comment about
  the username and password inside the block.
- Keep the credential save block exactly as it is.
- Replace `addByRssRepository.parseNow(authContext, feedUrl, credentials, { followed: true })`
  with `addByRssRepository.parseNowByPath(authContext, feedUrl, credentials, { followed: true, path: parsePath })`.
- The failure log, notices, `onAfterAdd`, `homeFeedRefresh.notify()`, and the `catch` stay as
  they are. `requestId` may now be null; plan 31 made the log builder accept it.
- Add `isTierKnown` and `parsePath` to `addFeed`'s dependency list. `addAccess` stays in the
  return object.

## 4. `apps/mobile/src/screens/home/addByRss/useAddByRssFeedCheck.ts`

- `const { evaluateFeature, isTierKnown } = useAccessTier();` and
  `const parsePath = useAddByRssParsePath();`.
- The access block becomes:

  ```ts
  const access = evaluateFeature('add_by_rss_refresh');
  if (parsePath === 'server' && isTierKnown && !access.allowed) {
    if (mode === 'pull') {
      await onChecked();
    } else {
      openGate(access.reason);
    }
    return;
  }
  ```

- `addByRssRepository.parseNowByPath(authContext, feedUrl, credentials, { path: parsePath })`.
- Failure log `jobKind`: `parsePath === 'device' ? 'add-by-rss-device-parse' : 'add-by-rss-parse'`.
- Add `isTierKnown` and `parsePath` to `checkFeed`'s dependency list.
- Rewrite the hook's doc comment as the code stands: credentials are read from the device store
  and sent only to the feed host (signed out, the phone parses) or on the parse request (signed
  in, the server parses). Signed in, an interactive check asks for membership first, and a pull
  while refresh is not allowed re-reads the device copy without asking the server, the same way
  a lapsed membership keeps feeds readable and stops refreshing them. Signed out, nothing is
  gated.

## 5. `apps/mobile/src/screens/rss/useAddByRssCredentialsForm.ts`

- `const { evaluateFeature, isTierKnown } = useAccessTier();` and
  `const parsePath = useAddByRssParsePath();`.
- The `checkAccess` block follows the signed-in gate rule with `'add_by_rss_add'`.
- Keep the `accountIdText === undefined` branch and the `addByRssCredentialStore.set` call as
  they are (area B changes both for signed-out storage).
- `addByRssRepository.parseNowByPath(authContext, feed.feedUrl, credentials, { path: parsePath })`.
- Add `isTierKnown` and `parsePath` to `saveAndCheck`'s dependency list.

## 6. `apps/mobile/src/screens/rss/AddByRssRootScreen.tsx`

Large file; edit by anchor.

- `const parsePath = useAddByRssParsePath();` and `isTierKnown` from the existing
  `useAccessTier()` destructure.
- `handleAddPress`: follows the signed-in gate rule with `addAccess`; then navigate as today.
  Dependency list `[addAccess, isTierKnown, navigation, openGate, parsePath]`.
- `handleCheckUpdates`: body is `void loadFeed('refresh');`; dependency list `[loadFeed]`. The
  refresh request reaches the device refresh signed out (plan 33).
- Remove `useAuthPrompt` / `onRequestLogin` and their import **only** when a file-wide search
  shows no other use. `status` stays (the unsubscribe call reads it).

## 7. `apps/mobile/src/screens/home/AddByRssHomeDetailScreen.tsx`

Large file; edit by anchor.

- `const parsePath = useAddByRssParsePath();` with the other hooks, and `isTierKnown` from the
  existing `useAccessTier()` destructure.
- `handleSubscribe`:
  - Early return becomes `if (detailForRoute === null || isRemoving) return;`.
  - The `add_by_rss_add` block follows the signed-in gate rule.
  - Inside the `try`, wrap the follow request in `if (parsePath === 'server') { … }`. The
    following `setFollowed(feed.feedUrl, true)`, `homeFeedRefresh.notify()`, and reload stay for
    both paths. Signed out, `setFollowed` stamps the album as the signed-out user's (plan 30).
  - Dependency list: add `isTierKnown` and `parsePath`; drop `status` if nothing inside reads it.
- Header actions: `if (isListedOnly)` shows the Subscribe button for every state; delete the
  `else if (isListedOnly) { headerActions = null; }` branch.

## 8. `apps/mobile/src/hooks/useAddByRssFeeds.ts`

Signed in, the merge must neither list nor claim the signed-out user's rows.

- In `reloadFeeds`, after the signed-out early return, before the `try`:

  ```ts
  // Feeds the signed-out user kept are inputs for id reuse only: listed and written back as
  // followed, they would be claimed by this account.
  const hiddenFeedUrls = await addByRssRepository.listHiddenFeedUrls();
  const mergeInput = allFeeds.map((feed) =>
    hiddenFeedUrls.has(feed.feedUrl) ? { ...feed, followed: false } : feed
  );
  const visibleFollowedFeeds = followedFeeds.filter((feed) => !hiddenFeedUrls.has(feed.feedUrl));
  ```

  Pass `mergeInput` to `mergeLocalAndRemoteAddByRssFeeds`, and use `visibleFollowedFeeds` in the
  offline fallback. A hidden feed the account also follows comes back from the merge as the
  account's follow and is written as such, which is how a feed both of them follow becomes the
  account's (plan 30, "Both follow the same feed").
- Update the comment above the signed-out branch: viewing is anonymous tier; signed out the
  phone's own feeds are the whole list; signed in, the account's follow list is merged in.
- `removeFeed`: run the `reqAccountUnfollowAddByRSSChannel` request only when
  `status === 'authenticated'`; signed out there is no account to tell, and the `errors.generic`
  notice would be wrong. Add `status` to its dependency list.

## 9. `apps/mobile/src/screens/rss/AddByRssCredentialsScreen.tsx`

- Add `status` to the `useAuth()` destructure.
- In `handleRemove`, run the unfollow request only when `status === 'authenticated'`; the
  `removeFeed` call and the rest stay. Add `status` to the dependency list.

## 10. Maestro

### `apps/mobile/e2e/membership-gate.yaml`

Replace the "Anonymous tier: Add by RSS is membership-tier…" block (the comment and the steps
from `tapOn: tab-my-library` through the `premium-gate-modal` `notVisible` wait) with:

```yaml
# Anonymous tier: signed out, Add by RSS parses on this device, so the plus opens the add form
# with no gate. Search stays at its root for the Trial 403 check below.
- tapOn:
    id: tab-my-library
- assertVisible:
    id: library-hub-screen
- tapOn:
    id: library-nav-add-by-rss
- assertVisible:
    id: rss-root-screen
- tapOn:
    id: rss-add-button
- assertVisible:
    id: rss-add-screen
- assertNotVisible:
    id: premium-gate-modal
- takeScreenshot: membership-gate-anonymous-add-by-rss
- runFlow: shared/stack-back.yaml
- assertVisible:
    id: rss-root-screen
```

The rest of the flow (the episode deep link and the make-clip gate) is unchanged.

### `apps/mobile/e2e/add-by-rss-anonymous.yaml` (new)

Signed-out add through the device parse. Never runs `shared/login-seeded-user.yaml`.

```yaml
appId: com.podverse.app.next
name: Add By RSS Anonymous
---
# Signed out, Add by RSS fetches and parses the feed on this device: no gate, no account, and no
# Podverse parse request. The feed is the test-assets feed on :2111; on Android the device fetch
# reaches the host through the same E2E loopback rewrite media uses (resolveE2eMediaUrl).
# Needs flow_needs_e2e_api + flow_needs_test_assets.

- runFlow: shared/launch-and-connect.yaml

- tapOn:
    id: tab-my-library
- assertVisible:
    id: library-hub-screen
- tapOn:
    id: library-nav-add-by-rss
- assertVisible:
    id: rss-root-screen
- assertVisible:
    id: rss-feeds-empty
- takeScreenshot: add-by-rss-anonymous-empty

- tapOn:
    id: rss-add-button
- assertVisible:
    id: rss-add-screen
- assertNotVisible:
    id: premium-gate-modal
- tapOn:
    id: rss-url-input
- inputText: http://localhost:2111/feeds/feed-podcast-1.rss
- assertVisible:
    id: rss-add-submit
    enabled: true
- tapOn:
    id: rss-add-submit

# The form pops back to the library list once the device parse has stored the feed.
- extendedWaitUntil:
    visible:
      id: rss-root-screen
    timeout: ${TIMEOUT_SLOWER}
- extendedWaitUntil:
    notVisible:
      id: rss-feeds-empty
    timeout: ${TIMEOUT_SLOW}
- takeScreenshot: add-by-rss-anonymous-feed-listed

# Check for Updates refreshes on this device instead of asking a signed-out user to sign in.
- tapOn:
    id: rss-check-updates
- assertVisible:
    id: rss-root-screen
- takeScreenshot: add-by-rss-anonymous-after-check
```

`launch-and-connect.yaml` relaunches with `clearState: true`, so no cleanup step is needed.

### Registration

- `scripts/mobile/e2e-test.sh`: add `add-by-rss-anonymous` to the `flow_needs_e2e_api` case
  (after `add-by-rss-livestream`) and to the `flow_needs_test_assets` case (after
  `add-by-rss-livestream`).
- `apps/mobile/e2e/HOW-TO-RUN.md` § Complete area list: add
  `npm run mobile:e2e:test -- --platform ios add-by-rss-anonymous` after the iOS
  `add-by-rss-credentials` line, and the `--platform android` line after the Android one; add
  `npm run mobile:e2e:test -- add-by-rss-anonymous` after the `add-by-rss-credentials` line in the
  both-platforms list.
- `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`: add
  `npm run mobile:e2e:test -- add-by-rss-anonymous` after `npm run mobile:e2e:test -- add-by-rss`
  in the both-platforms list.

## Tests

- Maestro: `apps/mobile/e2e/add-by-rss-anonymous.yaml` (new) and
  `apps/mobile/e2e/membership-gate.yaml` (updated). The signed-in flows (`add-by-rss.yaml`,
  `add-by-rss-credentials.yaml`, and the other `add-by-rss-*.yaml`) sign in the seeded user, a
  valid Trial member, so they stay on the server path and keep passing unchanged; that is the
  server-path regression check. Plan 34's `add-by-rss-sign-in.yaml` covers the Library list
  while signed in.
- Unit: the path decision and the hidden-row rule are covered in plan 30; nothing here adds pure
  logic.

## Release scratchpad

```markdown
## Mobile Add by RSS works signed out

- Surfaces: mobile
- Change: Signed out, adding a feed by RSS, checking a feed for updates, saving a feed's username
  and password, and subscribing to an album an artist lists no longer ask the user to sign in or
  get a membership. The phone fetches and parses the feed itself, makes no Podverse server
  request for it, and applies no feed limit. Check for Updates no longer asks a signed-out user to
  sign in, and removing a feed signed out makes no account request. Signed in, nothing changes:
  every account uses the server parse and server follow, free and lapsed accounts see the
  membership prompt on add as before, and an action taken while the account is still loading
  sends the request and shows the server's answer instead of a sign-in prompt. Web is unchanged.
- Who notices: signed-out mobile users; the Add by RSS plus button no longer opens the membership
  modal for them
- Operator steps: none
```
