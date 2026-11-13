**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 34 — Signing up, signing in, and signing out with feeds the signed-out user kept

What happens to the Add by RSS feeds a signed-out user follows on the phone when they sign in to
an account they already have, when they create an account on this phone and log in to it, and
when they sign out again.

## Rows

R19, R20, R39, R40, R55

## Runs after

32 (its flow registration lines come first), 33, 22 (adds
`addByRssCredentialStore.copySignedOutCredentialsAtSignIn` and
`addByRssCredentialStore.settleSignedOutCredentialsAtSignUp`), and 62 (adds
`apps/mobile/src/lib/addByRss/feedLimit.ts` with `fetchAccountAddByRssFeedLimit(context)`).

## Files

apps/mobile/src/data/repositories/subscriptionsSignupMarker.ts
apps/mobile/src/data/repositories/subscriptionsSignupPlan.ts
apps/mobile/src/data/repositories/subscriptionsSignupPlan.test.ts
apps/mobile/src/data/repositories/addByRssDevicePath.ts
apps/mobile/src/data/repositories/addByRssDevicePath.test.ts
apps/mobile/src/data/repositories/addByRssRepository.ts
apps/mobile/src/data/repositories/addByRssLoginSettle.ts
apps/mobile/src/auth/completeMobilePasswordLogin.ts
apps/mobile/src/sync/syncJobs.ts
apps/mobile/src/sync/SyncProvider.tsx
apps/mobile/e2e/add-by-rss-sign-in.yaml
scripts/mobile/e2e-test.sh
apps/mobile/e2e/HOW-TO-RUN.md
docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md
release-notes/scratchpad.md

## Answers from the code

- **Every login goes through `completeMobilePasswordLogin`.** `LoginScreen.tsx` and
  `E2eQuickLogin.tsx` both call it. `SignUpScreen.tsx` does not sign in. It records the email
  with `writeSignupMergeEmail`, and the login that follows on this phone is the "sign-up login".
  The marker is a `kv_meta` row whose `updated_at` is the moment the account was created.
  `runSignupSubscriptionMerge` clears it once the directory merge succeeds, so this plan reads it
  before that call.
- **Hiding needs no step at sign-in.** Plan 30 stamps every follow with its session and filters
  lists by the account snapshot, so a feed the signed-out user followed is hidden from the
  moment `refreshSnapshot` writes the snapshot. It shows again from the moment `clearSession`
  deletes it. Credentials follow the same snapshot (area B).
- **Two kinds of row need settling after a sign-in.** A feed the signed-out user follows and this
  account also follows must belong to the account (shown, refreshed by the server). A row left
  on the phone by an earlier account, which this account does not follow, must not show under
  this account. Both need the account's follow list (`GET /account/follow/add-by-rss-channel/:account_id_text`,
  account tier, so free and lapsed accounts get it too). The list is not available inside the
  login call without holding the spinner, so the login writes a marker and the next
  `add-by-rss-refresh` job does the work. The queue is serial and dedupes only queued jobs
  (`syncQueue.ts`), so requesting a refresh after writing the marker always reaches a run that
  reads it.
- **Sign-up accounts start on a Trial.** `packages/orm/src/services/account/account.ts` creates
  every account with `AccountMembershipEnum.Trial`. The carry still checks the membership and
  the account's limit (area F) rather than assuming either.
- **Area G's screen is where removal is accepted.** Plan 71 shows the warning only when the
  phone's count is over the default limit at the moment sign-up opens, and keeps the acceptance
  in `App.tsx` state only. The carry therefore removes only feeds followed at or before the
  account was created (the marker's `updated_at`). A feed followed between sign-up and the first
  login was never part of that warning. It is kept on the phone for the signed-out user, hidden
  while signed in.

## Behavior (transcribe)

- **Sign-in to an existing account:** nothing is pushed to the account. Feeds the signed-out user
  followed are hidden while signed in, and are not refreshed. After the sign-in settles, a feed
  this account also follows belongs to the account. A row an earlier account left that this
  account does not follow is handed to the signed-out user (hidden now, shown after sign-out).
- **Credentials of a feed that changes hands at sign-in (R55):** for each feed the settle gives
  to the account, the signed-out username and password are copied to the account's entry on this
  phone, unless the account already has a pair for that feed there (plan 22's
  `copySignedOutCredentialsAtSignIn`). The signed-out entry stays and is used again after
  sign-out. Rows handed to the signed-out user get no credential change. Nothing is sent to
  Podverse.
- **Sign-up on this phone, at its first login:** the same settle, then the carry. The
  signed-out user's followed feeds, oldest follow first, up to `fetchAccountAddByRssFeedLimit(context)`,
  are saved as server follows of the new account and stop being the signed-out user's. Their
  saved usernames and passwords move to the account (area B). When there are more than the
  limit, the rest are removed from the phone with their credentials, and nothing retries them.
  With the count at or under the limit, nothing is removed.
- **Sign-out:** `clearSession` is unchanged. The signed-out user's feeds show again and refresh
  on the device (plan 33). Feeds the account followed stay on the phone and show too, because a
  signed-out session lists every followed row.

## 1. Sign-up marker time — `subscriptionsSignupMarker.ts`

Add beside `readSignupMergeEmail` (which stays as it is):

```ts
export type SignupMergeMarker = { email: string; writtenAtMs: number | null };

/** The pending sign-up email and when this device created that account. */
export const readSignupMergeMarker = async (): Promise<SignupMergeMarker | null> => { … };
```

One select of `value` and `updatedAt` for `SIGNUP_MERGE_EMAIL_KEY`. Null when there is no row or
`value` is null. `writtenAtMs` is `updatedAt`.

## 2. `subscriptionsSignupPlan.ts`

Add (named export, pure):

```ts
/** True when this login is the one right after a sign-up on this device for the same email. */
export const isSignupLoginFor = (pendingEmail: string | null, loginEmail: string): boolean =>
  pendingEmail !== null &&
  normalizeSignupMergeEmail(pendingEmail) === normalizeSignupMergeEmail(loginEmail);
```

Use it inside `resolveSignupMergePlan` for the email comparison so both read the same rule
(`pendingEmail === null` → `none`; `!isSignupLoginFor(…)` → `clear`). Behavior of
`resolveSignupMergePlan` does not change.

## 3. Pure rules — `addByRssDevicePath.ts`

```ts
export type AddByRssLoginSettleMarker = {
  accountIdText: string;
  signedUpAtMs: number | null;
  signup: boolean;
};

export const parseAddByRssLoginSettleMarker = (raw: unknown): AddByRssLoginSettleMarker | null => …;

export const mergeAddByRssLoginSettleMarker = (
  existing: AddByRssLoginSettleMarker | null,
  next: AddByRssLoginSettleMarker
): AddByRssLoginSettleMarker => …;

export const planSignInOwnership = (params: {
  accountFeedUrls: readonly string[];
  rows: readonly { feedUrl: string; followedAtMs: number | null; signedOutOwned: boolean }[];
  startedAtMs: number;
}): { claim: string[]; release: string[] } => …;

export type AddByRssSignupCarryPlan = { remove: string[]; save: string[] };

export const planAddByRssSignupCarry = (params: {
  feeds: readonly { feedUrl: string; followedAtMs: number | null }[];
  limit: number;
  signedUpAtMs: number | null;
}): AddByRssSignupCarryPlan => …;

export type SignupCarryFollowOutcome = 'rethrow' | 'skip' | 'stop';

export const classifySignupCarryFollowError = (error: unknown): SignupCarryFollowOutcome => …;
```

- `parseAddByRssLoginSettleMarker`: `isObjectLike` (`@podverse/helpers/guards`) with a non-empty
  string `accountIdText`, a boolean `signup`, and `signedUpAtMs` a finite number or null;
  anything else → null.
- `mergeAddByRssLoginSettleMarker`: when `existing` names the same account with `signup: true`
  and `next.signup` is false, keep `existing` (a second login before the carry ran must not
  cancel it). Otherwise `next`.
- `planSignInOwnership`: `keys` = `addByRssFeedUrlKey` of each account feed URL.
  `claim` = rows with `signedOutOwned` whose key is in `keys`. `release` = rows without
  `signedOutOwned` whose key is not in `keys` and whose `followedAtMs` is null or below
  `startedAtMs`. A feed followed while the settle ran is never released on a stale list. Both
  return stored `feedUrl`s in input order.
- `planAddByRssSignupCarry`: `feeds` arrive oldest first. `save` = the first `max(0, limit)`
  URLs. Of the rest, `remove` holds those with `signedUpAtMs !== null` and
  (`followedAtMs === null` or `followedAtMs <= signedUpAtMs`); the others are in neither list
  and stay the signed-out user's.
- `classifySignupCarryFollowError`: `parseAccessDenialReason(error)` (`@podverse/helpers-requests`)
  is `'limit_reached'`, `'needs_membership'`, or `'membership_expired'` → `'stop'`; else
  `getErrorResponseStatus(error) === 400` (`@podverse/helpers/error`) → `'skip'` (the API
  rejected that URL, so it will never be saved); else `'rethrow'`.

## 4. Repository accessor — `addByRssRepository.ts`

Add after `listSignedOutFollowedFeeds` (plan 30):

- `listFollowedOwnership(): Promise<{ feedUrl: string; followedAtMs: number | null; signedOutOwned: boolean }[]>`:
  every `followed = 1` row, unfiltered, three columns only.

## 5. `apps/mobile/src/data/repositories/addByRssLoginSettle.ts` (new)

Repository layer: `kv_meta` access, one API read, and writes through `addByRssRepository` and
`addByRssCredentialStore`. Named exports only.

```ts
const LOGIN_SETTLE_KEY = 'add_by_rss.login_settle';

export const writeAddByRssLoginSettle = async (next: AddByRssLoginSettleMarker): Promise<void> => { … };

export const runAddByRssLoginSettle = async (
  context: MobileAuthRequestContext,
  account: DTOAccount
): Promise<void> => { … };
```

Private `readMarker` (select by key, `safeJsonParse`, `parseAddByRssLoginSettleMarker`) and
`clearMarker` (delete by key), written the way `subscriptionsSignupMarker.ts` reads and writes
`kv_meta`. `writeAddByRssLoginSettle` reads the existing marker, applies
`mergeAddByRssLoginSettleMarker`, and upserts `JSON.stringify(result)` with `updatedAt: Date.now()`.

Private `afterSessionFeedsChanged()`: `homeFeedRefresh.notify()` (`../../lib/home/homeFeedRefresh`)
and the library car reprojection in the same dynamic-import form `subscriptionsRepository.ts`
uses:

```ts
void import('../nativeCache/carCacheReproject')
  .then(({ reprojectLibraryIndex }) => reprojectLibraryIndex())
  .catch(() => undefined);
```

### `runAddByRssLoginSettle`

1. `const marker = await readMarker();` Null → return. `marker.accountIdText !== account.id_text`
   → `clearMarker()` and return (a marker for another login is stale).
2. `const startedAtMs = Date.now();`
3. Follow list:
   `requestWithMobileAuthRefresh(context, (api) => api.reqAccountGetFollowedAddByRSSChannels({ account_id_text: account.id_text }))`
   (import from `'../../auth/authRequestWithRefresh'`, as `addByRssRepository.ts` does). A
   thrown error propagates: the marker stays, and the next refresh run tries again.
4. `const { claim, release } = planSignInOwnership({ accountFeedUrls: follows.map((follow) => follow.feed_url), rows: await addByRssRepository.listFollowedOwnership(), startedAtMs });`
   Then, in this order:

   ```ts
   if (claim.length > 0) {
     await addByRssCredentialStore.copySignedOutCredentialsAtSignIn({
       accountIdText: account.id_text,
       feedUrls: claim,
     });
   }
   await addByRssRepository.setSignedOutOwned(claim, false);
   await addByRssRepository.setSignedOutOwned(release, true);
   ```

   The copy runs before the rows change hands. If it throws, the error propagates, the marker
   stays, the rows are still the signed-out user's, and the next refresh computes the same
   `claim` and copies again. The copy writes only into an empty account entry, so a rerun after a
   partial copy changes nothing already copied. Import `addByRssCredentialStore` from
   `'./addByRssCredentialStore'`.
5. When `marker.signup`: `const carried = await carrySignedOutFeedsIntoNewAccount(context, account, marker.signedUpAtMs);`
   When it returns `'retry'`, call `afterSessionFeedsChanged()` and return without clearing the
   marker.
6. `clearMarker()`, then `afterSessionFeedsChanged()`.

Doc comment: runs once after each login, from the next Add by RSS refresh. It settles which rows
on the phone belong to the account and which to the signed-out user, copying the signed-out
username and password of a feed that becomes the account's unless the account holds one here.
After a sign-up on this phone it carries the signed-out user's feeds into the new account.

### Private `carrySignedOutFeedsIntoNewAccount(context, account, signedUpAtMs): Promise<'done' | 'retry'>`

1. `evaluateFeatureAccess('add_by_rss_add', deriveMembershipState(account)).allowed` false →
   `'done'`. Nothing is saved or removed; the feeds stay the signed-out user's.
2. `const limit = await fetchAccountAddByRssFeedLimit(context);` (plan 62's `feedLimit.ts`, from
   `'../../lib/addByRss/feedLimit'`). Null or a thrown error → `'retry'`.
3. `const feeds = await addByRssRepository.listSignedOutFollowedFeeds();` (signed in: the rows
   still the signed-out user's after step 4 of the settle, oldest follow first).
4. `const { remove, save } = planAddByRssSignupCarry({ feeds, limit, signedUpAtMs });`
5. Removal first, so a rerun after a failure computes the same split:
   - when `remove.length > 0`:
     `await addByRssCredentialStore.settleSignedOutCredentialsAtSignUp({ accountIdText: account.id_text, savedFeedUrls: [], removedFeedUrls: remove });`
     then `await addByRssRepository.removeFeed(feedUrl)` for each.
6. Save, oldest first, collecting `savedNow: string[]`:

   ```ts
   const savedNow: string[] = [];
   try {
     for (const feed of feeds.filter((entry) => save.includes(entry.feedUrl))) {
       try {
         await requestWithMobileAuthRefresh(context, (api) =>
           api.reqAccountFollowAddByRSSChannel({
             feed_url: feed.feedUrl,
             image_url: null,
             title: feed.title ?? feed.feedUrl,
             ...(feed.requiresCredentials ? { requires_credentials: true } : {}),
           })
         );
         savedNow.push(feed.feedUrl);
       } catch (error) {
         const outcome = classifySignupCarryFollowError(error);
         if (outcome === 'skip') {
           continue;
         }
         if (outcome === 'stop') {
           await appendCarryStoppedLog(error);
           break;
         }
         throw error;
       }
     }
   } finally {
     if (savedNow.length > 0) {
       await addByRssCredentialStore.settleSignedOutCredentialsAtSignUp({
         accountIdText: account.id_text,
         removedFeedUrls: [],
         savedFeedUrls: savedNow,
       });
       await addByRssRepository.setSignedOutOwned(savedNow, false);
     }
   }
   return 'done';
   ```

   The credential settle runs before the rows change hands, for the same reason as the sign-in
   copy: if it throws, the rows are still the signed-out user's, so the retry lists them again
   and repeats both steps.

   `image_url` is null for the same reason the interactive add sends null: the server's own
   parse fills it, and an image URL the API's validator rejects must not block the follow. Use a
   `Set` for `save` membership if the implementer prefers; keep the oldest-first order.
7. `appendCarryStoppedLog(error)`: one `syncEventLogRepository.append` with
   `{ details: {}, errorCode: parseAccessDenialReason(error) === 'limit_reached' ? 'add_by_rss_feed_limit_reached' : 'add_by_rss_membership_required', jobKind: 'add-by-rss-refresh', message: null, occurredAt: Date.now(), outcome: 'skipped' }`.
   Failures are logged, not shown (**mobile-sync-orchestration**). `errorCode` is
   `string | null` in `syncEventLog.ts`, so that file needs no change.

A feed left unsaved by `'stop'` or `'skip'` stays the signed-out user's (hidden while signed in,
shown after sign-out), with its credentials still in the signed-out store.

## 6. `completeMobilePasswordLogin.ts`

- Before `await runSignupSubscriptionMerge(email, authContext);`, read the marker, since a
  successful merge clears it:

  ```ts
  const signupMarker = await readSignupMergeMarker().catch(() => null);
  ```

- Inside the inner `try`, right after `setAccount(account);`:

  ```ts
  await markAddByRssLoginSettle(account.id_text, signupMarker, email);
  ```

- Private function above `completeMobilePasswordLogin`:

  ```ts
  /**
   * The next Add by RSS refresh settles which feeds on the phone belong to this account, and after
   * a sign-up on this phone carries the signed-out user's feeds into it. Never throws: the login
   * succeeds either way.
   */
  const markAddByRssLoginSettle = async (
    accountIdText: string,
    signupMarker: SignupMergeMarker | null,
    email: string
  ): Promise<void> => {
    try {
      const signup = isSignupLoginFor(signupMarker?.email ?? null, email);
      await writeAddByRssLoginSettle({
        accountIdText,
        signedUpAtMs: signup ? (signupMarker?.writtenAtMs ?? null) : null,
        signup,
      });
      requestAddByRssRefresh();
    } catch (error) {
      console.warn('Failed to mark the Add by RSS sign-in settle', error);
    }
  };
  ```

- Imports: `readSignupMergeMarker` and `import type { SignupMergeMarker }` from
  `'../data/repositories/subscriptionsSignupMarker'`, `isSignupLoginFor` from
  `'../data/repositories/subscriptionsSignupPlan'`, `writeAddByRssLoginSettle` from
  `'../data/repositories/addByRssLoginSettle'`, `requestAddByRssRefresh` from
  `'../sync/requestAddByRssRefresh'`. Keep `import type` lines separate
  (**type-imports-separate-line**).
- Nothing about Add by RSS credentials is called here. The sign-in copy for shared feeds runs in
  `runAddByRssLoginSettle` (section 5), once the account's follow list is known.
- The comment above `runSignupSubscriptionMerge` stays true for directory subscriptions; leave it.

## 7. Refresh job — `syncJobs.ts`

In the signed-in branch of `createAddByRssRefreshJob` (plan 33), right after the
`account === null` return and before `splitStoredUserinfo`:

```ts
await runAddByRssLoginSettle(authContext, account);
```

It runs before the membership check, because the settle applies to free and lapsed accounts too.
It runs before `splitStoredUserinfo`, so a row just handed to the signed-out user is not split
into this account's credential store. Import from `'../data/repositories/addByRssLoginSettle'`.
Add one sentence to the job's doc comment: the first run after a login settles the phone's
feeds for that account first.

## 8. Sign-out shows the signed-out user's feeds again — `SyncProvider.tsx`

In the `status === 'anonymous'` effect, after `nowPlayingAddByRssSections.reset();`:

```ts
homeFeedRefresh.notify();
void import('../data/nativeCache/carCacheReproject')
  .then(({ reprojectLibraryIndex }) => reprojectLibraryIndex())
  .catch(() => undefined);
```

Extend the effect's comment: Add by RSS feeds the signed-out user kept are listed again once
signed out, so Home and the car library reload. Import `homeFeedRefresh` from
`'../lib/home/homeFeedRefresh'` if the file does not already. Library screens re-read on focus
and need nothing.

## Tests

- `apps/mobile/src/data/repositories/subscriptionsSignupPlan.test.ts`: `isSignupLoginFor`. A
  null marker → false; the same email with different case and surrounding spaces → true; a
  different email → false. The existing `resolveSignupMergePlan` cases keep passing unchanged.
- `apps/mobile/src/data/repositories/addByRssDevicePath.test.ts`:
  - `parseAddByRssLoginSettleMarker`: a valid value; a missing account; a string `signup`; a
    non-number `signedUpAtMs`.
  - `mergeAddByRssLoginSettleMarker`: a pending sign-up kept against a plain login for the same
    account; replaced for another account; a plain marker replaced by a sign-up.
  - `planSignInOwnership`: a both-follow row claimed (canonical-URL match too); an earlier
    account's row released; a row followed after `startedAtMs` not released; a signed-out row
    the account does not follow left alone; `claim` holds the stored `feedUrl` (not the
    account's spelling of it), since that list is what the settle passes to the credential copy.
  - `planAddByRssSignupCarry`: count under the limit saves all and removes none; over the limit
    saves the first `limit`; extras followed after `signedUpAtMs` are kept; null `signedUpAtMs`
    removes none; a null `followedAtMs` counts as before sign-up; limit 0 saves none.
  - `classifySignupCarryFollowError`: limit 403 (`membership.add_by_rss_feed_limit_reached`) →
    stop; expired 403 → stop; feature-not-available 403 → stop; 400 → skip; 500 → rethrow; a
    network error with no response → rethrow.
- Maestro `apps/mobile/e2e/add-by-rss-sign-in.yaml` (new; section 9). The carry is not run in
  Maestro: a sign-up flow would create an account per run against the E2E API. Its decisions
  are the pure helpers above (**mobile-test-economics**).
- R55: the copy rule (account pair wins, signed-out pair kept, repeats are no-ops) is plan 22's
  `copySignedOutAddByRssCredentialsToAccount` unit cases. This plan only calls it with `claim`
  before `setSignedOutOwned`; that wiring sits in a SQLite and API repository with no Vitest
  suite, and the seeded account follows no protected feed, so no Maestro case covers it.

## 9. Maestro — `apps/mobile/e2e/add-by-rss-sign-in.yaml` (new)

The seeded account follows `http://localhost:2111/feeds/feed-podcast-1.rss` only
(`tools/web/seed-e2e.mjs`, title `Vitium amitto volup traho praesentium tantillus totam balbus balbus paulatim.`).
`feed-1.rss` is a test-assets feed the seeded account does not follow. Feed rows carry
`rss-feed-row-<id>-swipe` test IDs, so the flow counts rows with `index`. Use `${TIMEOUT_*}` from
`shared/timeouts.env` (**mobile-maestro-timeouts**).

```yaml
appId: com.podverse.app.next
name: Add By RSS Sign In
---
# A feed added signed out is hidden while an account is signed in and listed again after sign-out.
# The account's own follow is listed while signed in and stays on the phone after sign-out.
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
- tapOn:
    id: rss-add-button
- assertVisible:
    id: rss-add-screen
- tapOn:
    id: rss-url-input
- inputText: http://localhost:2111/feeds/feed-1.rss
- tapOn:
    id: rss-add-submit
- extendedWaitUntil:
    visible:
      id: rss-root-screen
    timeout: ${TIMEOUT_SLOWER}
- extendedWaitUntil:
    visible:
      id: "rss-feed-row-.*-swipe"
    timeout: ${TIMEOUT_SLOW}
- assertNotVisible:
    id: "rss-feed-row-.*-swipe"
    index: 1
- takeScreenshot: add-by-rss-sign-in-signed-out-feed

# Signed in, the account's follow is listed and the signed-out feed is not.
- runFlow: shared/login-seeded-user.yaml
- tapOn:
    id: tab-my-library
- runFlow:
    when:
      notVisible:
        id: rss-root-screen
    commands:
      - tapOn:
          id: library-nav-add-by-rss
- extendedWaitUntil:
    visible: "Vitium amitto volup traho praesentium tantillus totam balbus balbus paulatim."
    timeout: ${TIMEOUT_SLOWER}
- assertNotVisible:
    id: "rss-feed-row-.*-swipe"
    index: 1
- takeScreenshot: add-by-rss-sign-in-account-feeds

# Signed out again, both feeds are listed.
- tapOn:
    id: tab-more
- assertVisible:
    id: more-screen
- tapOn:
    id: more-nav-logout
- extendedWaitUntil:
    visible:
      id: anonymous-login-cta
    timeout: ${TIMEOUT_FAST}
- tapOn:
    id: tab-my-library
- runFlow:
    when:
      notVisible:
        id: rss-root-screen
    commands:
      - tapOn:
          id: library-nav-add-by-rss
- extendedWaitUntil:
    visible:
      id: "rss-feed-row-.*-swipe"
      index: 1
    timeout: ${TIMEOUT_SLOW}
- takeScreenshot: add-by-rss-sign-in-after-sign-out
```

`more-nav-logout` and `anonymous-login-cta` are the IDs `auth-logout.yaml` uses. If More's logout
row sits below the fold on a small device, scroll to it the way `auth-logout.yaml` reaches it.
`launch-and-connect.yaml` relaunches with `clearState: true`, so no cleanup step is needed.

### Registration

- `scripts/mobile/e2e-test.sh`: add `add-by-rss-sign-in` to the `flow_needs_e2e_api` and
  `flow_needs_test_assets` cases, after plan 32's `add-by-rss-anonymous`.
- `apps/mobile/e2e/HOW-TO-RUN.md` § Complete area list: add the iOS, Android, and both-platforms
  lines for `add-by-rss-sign-in` after plan 32's `add-by-rss-anonymous` lines.
- `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`: add
  `npm run mobile:e2e:test -- add-by-rss-sign-in` after the `add-by-rss-anonymous` line.

## Release scratchpad

```markdown
## Mobile Add by RSS feeds across sign-up, sign-in, and sign-out

- Surfaces: mobile
- Change: Add by RSS feeds followed while signed out are hidden while an account is signed in,
  are not refreshed then, and are listed and refreshed on the phone again after sign-out.
  Signing in to an existing account adds nothing to it. After a sign-in, a feed that both the
  signed-out user and the account follow belongs to the account, and its username and password
  saved while signed out are copied to the account on this phone unless the account already has
  a pair for it there; the signed-out copy stays for after sign-out, and neither leaves the
  phone. Feeds an earlier account left on the phone are hidden under a different account.
  Creating an account in the app and
  logging in to it saves the signed-out user's feeds to the new account, oldest follow first, up
  to the account's Add by RSS limit, and moves their saved usernames and passwords to the account.
  When there were more feeds than the limit at sign-up, the rest are removed from the phone with
  their saved usernames and passwords, and are not added later. Feeds followed after sign-up and
  before that first login are never removed by it.
- Who notices: people who use Add by RSS signed out and then sign in or sign up on the same phone
- Operator steps: none
```
