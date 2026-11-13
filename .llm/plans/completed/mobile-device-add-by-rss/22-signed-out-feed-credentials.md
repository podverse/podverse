**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 22 — Feed usernames and passwords for signed-out users

Password-protected Add by RSS feeds work while signed out (R11). The username and password a
signed-out user enters are kept in SecureStore under a fixed signed-out owner instead of an
account id. They stay with that owner when someone signs in to an existing account (R42). When
plan 34's sign-in settle makes a feed that both the signed-out user and the account follow the
account's feed, the signed-out pair is copied to the account's entry on this phone unless the
account already has one, and the signed-out entry stays (R55). They move to the new account at
sign-up only for the feeds the sign-up carry saves, and are deleted for the feeds it removes
(R41). Sign-out clears the account's credentials and keeps the signed-out owner's (R43). A
Maestro flow checks storage, the cross-host redirect rule on the device parse (R12), and that the
signed-out credentials survive a sign-in and the sign-out after it, on iOS and Android.

## Rows

R11, R12, R41, R42, R43, R55

## Runs after

21, 32

Plan 34 runs after this plan: its sign-in settle calls `copySignedOutCredentialsAtSignIn` and
its sign-up carry calls `settleSignedOutCredentialsAtSignUp`.

## Files

apps/mobile/src/lib/addByRss/credentials.ts
apps/mobile/src/lib/addByRss/credentials.test.ts
apps/mobile/src/data/repositories/addByRssCredentialStore.ts
apps/mobile/src/auth/AuthProvider.tsx
apps/mobile/src/hooks/useAddByRssAddFlow.ts
apps/mobile/src/screens/rss/useAddByRssCredentialsForm.ts
apps/mobile/e2e/add-by-rss-device-credentials.yaml
scripts/mobile/e2e-test.sh
apps/mobile/e2e/HOW-TO-RUN.md
docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md
release-notes/scratchpad.md

## Behavior (transcribe, do not revisit)

- **Signed out.** Credentials are saved and read under `SIGNED_OUT_CREDENTIAL_OWNER`. The device
  parse (plan 31), device refresh (plan 33), listed albums (plan 42), chapters and transcripts
  (plan 43), and media playback all read them through the existing `*ForCurrentAccount` methods.
- **Sign-in to an existing account.** Nothing moves. The signed-out owner's entries stay as they
  are. While signed in, every "current" read returns the account's entries. The feeds those
  signed-out entries belong to are hidden and not refreshed while signed in (plans 30 and 33), so
  nothing needs them. After sign-out they are read again. The one write at sign-in is the copy
  for shared feeds below.
- **A feed the signed-out user and the account both follow (R55).** Plan 34's sign-in settle
  makes the row the account's. Before it does, it calls
  `copySignedOutCredentialsAtSignIn({ accountIdText, feedUrls })` with the feeds that change
  hands. For each feed, when the signed-out owner holds a pair and the account holds none on this
  phone, the signed-out pair is written under the account. When the account already holds a pair
  there, it is kept and nothing is written. The signed-out entry is never deleted by this copy:
  it stays and is used again after sign-out (R42). While signed in, the feed reads the account's
  entry, so with a copied pair the feed stays out of the Needs username and password section and
  the server refresh sends that pair with the request, as for any pair the account saved here. A
  feed with no signed-out pair and no account pair sits in that section until the user enters
  one. The copy is SecureStore to SecureStore on this phone; nothing is
  sent to Podverse (**add-by-rss-client-held-credentials**).
- **Sign-up on this phone.** Plan 34's carry calls
  `settleSignedOutCredentialsAtSignUp({ accountIdText, savedFeedUrls, removedFeedUrls })`, once
  with only `removedFeedUrls` (before it removes those feeds) and once with only
  `savedFeedUrls` (after it saves those feeds to the account). Removed feeds' signed-out entries
  are deleted. Saved feeds' signed-out entries are written under the account, then deleted from
  the signed-out owner. A feed in neither list keeps its signed-out entry.
- **Sign-out.** `clearSession` removes every entry whose owner is not
  `SIGNED_OUT_CREDENTIAL_OWNER`, the snapshot's account and any other, and keeps the signed-out
  owner's. The account's feeds stay on the phone after sign-out (plan 30), so a protected one
  shows in the signed-out Needs username and password section until the user enters the pair
  again; that pair is saved under the signed-out owner.

## Decisions already made (transcribe, do not revisit)

- **Owner, not a new table.** The SecureStore key and the `add_by_rss_credential_index` row keep
  their shape; the owner segment is `signed-out-device` for the signed-out user. Account
  `id_text` values are nano ids of 7–15 characters (**e2e-seed-nano-id-limits**), so a
  17-character value cannot name an account, and it matches the SecureStore key segment pattern
  (`[A-Za-z0-9_-]+`), so `buildAddByRssCredentialKey` uses it as is.
- **Reads follow the account snapshot.** `getForCurrentAccount`, `deleteForCurrentAccount`, and
  `listFeedUrlsForCurrentAccount` resolve the owner from `readCurrentAccountIdText()`, null →
  signed-out owner. That is the same signed-in test plan 30's `isSignedInSession` uses for the
  list filter, so rows and credentials always agree on who is signed in.
- **Screen writes follow the parse path.** `useAddByRssAddFlow` and `useAddByRssCredentialsForm`
  save under `resolveAddByRssCredentialWriteOwner(parsePath, account?.id_text ?? null)`: the
  device path saves under the signed-out owner, the server path under the account. Right after
  sign-in, before the account snapshot lands, the path is `'server'` and the account id is
  unknown, so the owner is null and nothing is saved, as today. A signed-in user's password
  therefore never lands in the signed-out owner's bucket, which now outlives sign-out.
- **The settle and copy rules are pure functions over an injected store** (`credentials.ts`), so
  Vitest covers R41 and R55. Each store method only passes its own `get`, `set`, and `delete`.
- **The sign-in copy is a copy, not a move.** The signed-out pair belongs to whoever uses this
  phone signed out, and after sign-out that user needs it again for the same feed. Deleting it at
  sign-in would break R42.
- **The account's pair wins at sign-in.** A pair the account saved on this phone is the one the
  account last used with the server parse, so the copy never overwrites it. This differs from the
  sign-up settle, where the account was just created and the signed-out pair replaces anything
  there.
- **The sign-in copy tolerates repeats.** It writes only when the account holds no pair, so once a
  pair is copied a rerun reads it and writes nothing. Plan 34 calls it before it flips the rows'
  ownership, so a thrown error leaves the rows signed-out owned and the next refresh retries both.
- **The settle tolerates repeats.** Each saved entry is written under the account before it is
  deleted from the signed-out owner. A missing signed-out entry is skipped, so a rerun after a
  failure finishes the rest and changes nothing already moved. When the account already holds a
  pair for a saved feed, the signed-out pair replaces it (the account was just created on this
  phone, so its bucket is empty in practice).
- **Account deletion** ends the session through `clearSession` like every other sign-out, so it
  follows the sign-out rule.
- No i18n change. The `credentials_check_failed` notice in the credentials form stays only for
  the signed-in loading window.

## 1. `apps/mobile/src/lib/addByRss/credentials.ts`

- Add `import type { AddByRssParsePath } from './parsePath';` on its own line after the
  `../../prefs/addByRSSFeeds` type import (plan 30 creates `parsePath.ts`).
- Module doc comment becomes: device-local add-by-RSS Basic Auth credentials. Pure helpers, plus
  the signed-out sign-up settle and sign-in copy rules over an injected store: SecureStore and
  SQLite access live in `addByRssCredentialStore`, so everything here runs under the node unit
  tests.
- Below `SECURE_STORE_KEY_SEGMENT`:

```ts
/**
 * Owner of credentials saved while signed out. Longer than any account `id_text` (7–15
 * characters), so it never names an account, and inside the SecureStore key alphabet. Its entries
 * belong to whoever uses this phone signed out: sign-in leaves them alone and sign-out keeps them.
 */
export const SIGNED_OUT_CREDENTIAL_OWNER = 'signed-out-device';

/** Whose credentials "current" means: the signed-in account, or the signed-out user. */
export const resolveAddByRssCredentialOwner = (accountIdText: string | null): string =>
  accountIdText ?? SIGNED_OUT_CREDENTIAL_OWNER;

/**
 * The owner a screen saves a typed username and password under. It follows the parse path, so
 * the parse that uses the pair and the later reads agree. Null while a signed-in account is still
 * loading: the caller passes the pair to this one parse and saves nothing.
 */
export const resolveAddByRssCredentialWriteOwner = (
  parsePath: AddByRssParsePath,
  accountIdText: string | null
): string | null => (parsePath === 'device' ? SIGNED_OUT_CREDENTIAL_OWNER : accountIdText);

/** True for an account's entries, which end with its session; false for the signed-out user's. */
export const isAccountCredentialOwner = (owner: string): boolean =>
  owner !== SIGNED_OUT_CREDENTIAL_OWNER;
```

- At the end of the file:

```ts
/** The store operations the signed-out settle needs, keyed by owner and feed URL. */
export type AddByRssCredentialOwnerStore = {
  delete: (owner: string, feedUrl: string) => Promise<void>;
  get: (owner: string, feedUrl: string) => Promise<AddByRssCredentials | null>;
  set: (owner: string, feedUrl: string, credentials: AddByRssCredentials) => Promise<void>;
};

export type SignedOutCredentialSettle = {
  accountIdText: string;
  removedFeedUrls: readonly string[];
  savedFeedUrls: readonly string[];
};

/**
 * Sign-up on this phone: the saved feeds' signed-out credentials move to the new account and the
 * removed feeds' are deleted. Each saved entry is written under the account before it leaves the
 * signed-out owner, and a missing entry is skipped, so a repeated call finishes what an
 * interrupted one started.
 */
export const settleSignedOutAddByRssCredentials = async (
  store: AddByRssCredentialOwnerStore,
  { accountIdText, removedFeedUrls, savedFeedUrls }: SignedOutCredentialSettle
): Promise<void> => {
  if (accountIdText === '' || !isAccountCredentialOwner(accountIdText)) {
    return;
  }
  for (const feedUrl of removedFeedUrls) {
    await store.delete(SIGNED_OUT_CREDENTIAL_OWNER, feedUrl);
  }
  for (const feedUrl of savedFeedUrls) {
    const credentials = await store.get(SIGNED_OUT_CREDENTIAL_OWNER, feedUrl);
    if (credentials === null) {
      continue;
    }
    await store.set(accountIdText, feedUrl, credentials);
    await store.delete(SIGNED_OUT_CREDENTIAL_OWNER, feedUrl);
  }
};

export type SignedOutCredentialCopy = {
  accountIdText: string;
  feedUrls: readonly string[];
};

/**
 * Sign-in on this phone: for each feed that just became the account's, the signed-out pair is
 * copied to the account unless the account already holds one here. The signed-out pair stays,
 * because the signed-out user needs it again after sign-out. Writing only into an empty account
 * entry makes a repeated call a no-op.
 */
export const copySignedOutAddByRssCredentialsToAccount = async (
  store: AddByRssCredentialOwnerStore,
  { accountIdText, feedUrls }: SignedOutCredentialCopy
): Promise<void> => {
  if (accountIdText === '' || !isAccountCredentialOwner(accountIdText)) {
    return;
  }
  for (const feedUrl of feedUrls) {
    const credentials = await store.get(SIGNED_OUT_CREDENTIAL_OWNER, feedUrl);
    if (credentials === null) {
      continue;
    }
    if ((await store.get(accountIdText, feedUrl)) !== null) {
      continue;
    }
    await store.set(accountIdText, feedUrl, credentials);
  }
};
```

The store's `get`, `set`, and `delete` canonicalize the feed URL themselves
(`toAddByRssCredentialFeedUrl`, `buildAddByRssCredentialKey`), so the settle and the copy pass
URLs through as given.

## 2. `apps/mobile/src/data/repositories/addByRssCredentialStore.ts`

- Extend the existing value import from `'../../lib/addByRss/credentials'` with
  `copySignedOutAddByRssCredentialsToAccount`, `isAccountCredentialOwner`,
  `resolveAddByRssCredentialOwner`, and `settleSignedOutAddByRssCredentials`. Add
  `SignedOutCredentialCopy` and `SignedOutCredentialSettle` to the existing `import type` line
  from the same module.
- Private helper below `readCurrentAccountIdText`:

  ```ts
  const readCurrentOwner = async (): Promise<string> =>
    resolveAddByRssCredentialOwner(await readCurrentAccountIdText());
  ```

- `getForCurrentAccount`: `return addByRssCredentialStore.get(await readCurrentOwner(), feedUrl);`
- `deleteForCurrentAccount`: `await addByRssCredentialStore.delete(await readCurrentOwner(), feedUrl);`
- `listFeedUrlsForCurrentAccount`: `return addByRssCredentialStore.listFeedUrls(await readCurrentOwner());`
  Its comment becomes: canonical feed URLs the signed-in account, or the signed-out user, holds
  credentials for on this device.
- Two new methods right after `readAllForAccount`, in this order:

  ```ts
  /** Sign-in settle: see `copySignedOutAddByRssCredentialsToAccount`. */
  copySignedOutCredentialsAtSignIn: async (params: SignedOutCredentialCopy): Promise<void> => {
    await copySignedOutAddByRssCredentialsToAccount(
      {
        delete: addByRssCredentialStore.delete,
        get: addByRssCredentialStore.get,
        set: addByRssCredentialStore.set,
      },
      params
    );
  },

  /** Sign-up carry: see `settleSignedOutAddByRssCredentials`. */
  settleSignedOutCredentialsAtSignUp: async (params: SignedOutCredentialSettle): Promise<void> => {
    await settleSignedOutAddByRssCredentials(
      {
        delete: addByRssCredentialStore.delete,
        get: addByRssCredentialStore.get,
        set: addByRssCredentialStore.set,
      },
      params
    );
  },
  ```

- Replace `clearAll` with `clearAccountCredentials` (same position, same body shape; the
  index `select` keeps both columns and has no `where`):

  ```ts
  /**
   * Sign-out path. Removes every account's entries rather than only the snapshot's, because the
   * snapshot can already be gone (or never written) by the time a session ends. The signed-out
   * user's entries stay.
   */
  clearAccountCredentials: async (): Promise<void> => {
    await initializeDatabase();
    const rows = (
      await getDb()
        .select({
          accountIdText: schema.addByRssCredentialIndex.accountIdText,
          feedUrl: schema.addByRssCredentialIndex.feedUrl,
        })
        .from(schema.addByRssCredentialIndex)
    ).filter((row) => isAccountCredentialOwner(row.accountIdText));
    await Promise.allSettled(rows.map((row) => deleteSecret(row.accountIdText, row.feedUrl)));
    await deleteIndexRows(rows);
  },
  ```

  `clearAll` has one caller (`AuthProvider.tsx`, section 3); remove it.
- Object doc comment, as the code stands: device-local Basic Auth credentials for add-by-RSS
  feeds, keyed by owner (the account, or `SIGNED_OUT_CREDENTIAL_OWNER` for the signed-out user)
  and canonical feed URL. Keep the SecureStore/SQLite sentence and the "never logged" sentence.
  Replace the account-data paragraph with: an account's entries end with its session
  (`clearSession`); the signed-out user's entries stay through sign-in and sign-out. At sign-in a
  signed-out pair is copied to the account for a feed both follow, unless the account holds one
  here; at sign-up it moves to the account for the feeds the sign-up carry saves. Feed rows stay
  on the device either way.

## 3. `apps/mobile/src/auth/AuthProvider.tsx`

In `clearSession`, replace `await addByRssCredentialStore.clearAll();` with
`await addByRssCredentialStore.clearAccountCredentials();`. Keep the `try`/`catch` and its
`console.warn`. The comment above becomes:

```ts
// Add-by-RSS feed credentials an account saved end with its session. The feeds stay, and so do
// the credentials saved while signed out, which belong to whoever uses this phone signed out.
```

Leave the account-data comment further down as it is.

## 4. `apps/mobile/src/hooks/useAddByRssAddFlow.ts`

Plan 32 kept the credential save block as it was and added `parsePath`. Replace

```ts
const accountIdText = account?.id_text;
if (credentials !== null && accountIdText !== undefined) {
  await addByRssCredentialStore.set(accountIdText, feedUrl, credentials);
}
```

with

```ts
const credentialOwner = resolveAddByRssCredentialWriteOwner(parsePath, account?.id_text ?? null);
if (credentials !== null && credentialOwner !== null) {
  await addByRssCredentialStore.set(credentialOwner, feedUrl, credentials);
}
```

Keep the comment above it ("Saved before the parse so a rejected pair stays available…").
Import `resolveAddByRssCredentialWriteOwner` from `'../lib/addByRss/credentials'` (extend an
existing import from that module if the file has one). `account` and `parsePath` are already in
`addFeed`'s dependency list after plan 32; confirm both are there.

## 5. `apps/mobile/src/screens/rss/useAddByRssCredentialsForm.ts`

In `saveAndCheck`, replace

```ts
const accountIdText = account?.id_text;
if (accountIdText === undefined) {
  setNoticeKey('features.add_by_rss.credentials_check_failed');
  return;
}
```

with

```ts
const credentialOwner = resolveAddByRssCredentialWriteOwner(parsePath, account?.id_text ?? null);
if (credentialOwner === null) {
  setNoticeKey('features.add_by_rss.credentials_check_failed');
  return;
}
```

and `addByRssCredentialStore.set(accountIdText, feed.feedUrl, credentials)` with
`addByRssCredentialStore.set(credentialOwner, feed.feedUrl, credentials)`.

- Add `resolveAddByRssCredentialWriteOwner` to the existing
  `import { credentialNoticeKeyForParse, toAddByRssCredentials } from '../../lib/addByRss/credentials';`.
- Keep `account` in the `useAuth()` destructure and `account?.id_text` plus `parsePath` (plan 32)
  in `saveAndCheck`'s dependency list.
- Doc comment: after "kept on this device", add "for the signed-in account, or for the signed-out
  user".

## 6. Maestro — `apps/mobile/e2e/add-by-rss-device-credentials.yaml` (new)

Pattern sources: `add-by-rss-credentials.yaml` (basic-auth fields, keyboard handling, tab
popping), plan 32's `add-by-rss-anonymous.yaml` (signed-out device add), plan 34's
`add-by-rss-sign-in.yaml` (sign in from Library, sign out from More, reopen the Add by RSS
library), `error-log.yaml` (reaching the Error Log). Use `${TIMEOUT_*}` from
`shared/timeouts.env` (**mobile-maestro-timeouts**).

Fixtures (test-assets on `:2111`, user `username`, password `password`):

- `http://localhost:2111/basic-auth/variants/feed-public-media.rss` — gated feed; the device
  parse gives it the channel title with ` (public media)` appended (`buildBasicAuthFeedVariant`
  in `tools/test-assets/src/asset-server.ts`), so the title alone proves a real parse with the
  credentials.
- `http://localhost:2111/redirect/other-host/basic-auth/variants/feed-public-media.rss` — 302 to
  the same feed on the other loopback host. With the device parse's E2E rewrite (plan 21), the hop
  is cross-host on both platforms, the credentials are withheld, and the feed answers 401.
- The seeded account follows `http://localhost:2111/feeds/feed-podcast-1.rss` only, title
  `Vitium amitto volup traho praesentium tantillus totam balbus balbus paulatim.`
  (`tools/web/seed-e2e.mjs`), which needs no credentials.

Header:

```yaml
appId: com.podverse.app.next
name: Add By RSS Device Credentials
---
# Signed out, a password-protected feed is added and parsed on this device. The username and
# password stay on the phone for the signed-out user, and a redirect to another host does not get
# them. Signing in to an existing account hides the feed and moves nothing; after sign-out the
# feed is listed again and still has its username and password.
# Needs flow_needs_e2e_api + flow_needs_test_assets.
```

Steps, in order:

1. `runFlow: shared/launch-and-connect.yaml` (clean, signed out).
2. Library → Add by RSS (`tab-my-library`, `library-hub-screen`, `library-nav-add-by-rss`,
   `rss-root-screen`) → `rss-add-button` → `rss-add-screen`. Type the gated feed URL into
   `rss-url-input`, tap `rss-basic-auth-toggle-toggle`, fill `rss-username-input` /
   `rss-password-input` with the same keyboard steps as `add-by-rss-credentials.yaml` (tap
   `rss-basic-auth-description` between fields), tap `rss-add-submit`.
   `extendedWaitUntil` `rss-root-screen` visible (`${TIMEOUT_SLOWER}`), then
   `extendedWaitUntil` visible text `".*\\(public media\\)"` with `childOf: { id: rss-feed-list }`
   (`${TIMEOUT_SLOW}`), then `assertNotVisible: { id: rss-needs-credentials }`. The row flags
   credentials as required, so it would sit in the needs-credentials section if the signed-out
   owner held nothing. `takeScreenshot: add-by-rss-device-credentials-listed`.
3. Add the redirect URL the same way, with the same username and password. Wait for
   `rss-root-screen`. Then More → Advanced → Error Log exactly as `error-log.yaml` does (scroll to
   `more-nav-advanced`, `more-advanced-error-log`, `error-log-screen`), `tapOn` id
   `"error-log-row-[0-9]+"` with `index: 0`, `assertVisible: { id: error-log-detail-screen }`, then
   `assertVisible: ".*credentials_withheld_other_domain.*"` (the device parse leaves `serverError`
   null, so the row's message is the failure reason).
   `takeScreenshot: add-by-rss-device-credentials-withheld`.
4. Return to a tab root (pop the More stack the way `add-by-rss-credentials.yaml` pops Library,
   with `runFlow` `when notVisible`), then `runFlow: shared/login-seeded-user.yaml`. Open
   Library → Add by RSS the way plan 34's flow does after its login (`tab-my-library`, then
   `library-nav-add-by-rss` inside `runFlow` `when notVisible: { id: rss-root-screen }`).
   `extendedWaitUntil` the seeded account's feed title visible (`${TIMEOUT_SLOWER}`), then
   `assertNotVisible: ".*\\(public media\\)"`: the signed-out user's feed is hidden while signed
   in. `takeScreenshot: add-by-rss-device-credentials-signed-in`.
5. Sign out exactly as plan 34's flow does (`tab-more`, `more-screen`, `more-nav-logout`,
   `extendedWaitUntil` `anonymous-login-cta` with `${TIMEOUT_FAST}`; scroll to the logout row the
   way `auth-logout.yaml` reaches it if it sits below the fold). Open Library → Add by RSS the same
   way as step 4. `extendedWaitUntil` visible text `".*\\(public media\\)"` with
   `childOf: { id: rss-feed-list }` (`${TIMEOUT_SLOW}`), then
   `assertNotVisible: { id: rss-needs-credentials }`: the signed-out credentials lasted through
   the sign-in and the sign-out. `takeScreenshot: add-by-rss-device-credentials-after-sign-out`.

Signing in to an existing account pushes nothing to it (plan 34), so the flow leaves no server
state; `launch-and-connect.yaml` relaunches with `clearState: true` on the next run. Read
`shared/login-seeded-user.yaml` and `E2eQuickLogin.tsx` before finishing to confirm the
`e2e-quick-login` control is reachable from the Library tab, as plan 34's flow assumes.

## 7. Registration

- `scripts/mobile/e2e-test.sh`: add `add-by-rss-device-credentials` right after
  `add-by-rss-anonymous` (plan 32) in both the `flow_needs_e2e_api` case and the
  `flow_needs_test_assets` case.
- `apps/mobile/e2e/HOW-TO-RUN.md` § Complete area list: after each `add-by-rss-anonymous` line
  plan 32 added (iOS, Android, both-platforms lists), the matching
  `npm run mobile:e2e:test -- [--platform ios|--platform android] add-by-rss-device-credentials`
  line. Below the existing `add-by-rss-credentials` description paragraph, one sentence:
  `add-by-rss-device-credentials` adds a protected feed while signed out, checks that a redirect
  to another host does not receive the username and password, and checks that they are still on
  the phone after signing in and signing out again.
- `docs/testing/FULL-REPO-VERIFICATION-COMMANDS.md`: add
  `npm run mobile:e2e:test -- add-by-rss-device-credentials` after the `add-by-rss-anonymous` line
  plan 32 added.

## Tests

- `apps/mobile/src/lib/addByRss/credentials.test.ts` (extend). An in-memory fake store
  (`Map` keyed by `` `${owner}|${feedUrl}` ``) implements `AddByRssCredentialOwnerStore`.
  - `resolveAddByRssCredentialOwner(null)` is `SIGNED_OUT_CREDENTIAL_OWNER`;
    `resolveAddByRssCredentialOwner('abc1234')` is `'abc1234'`;
    `SIGNED_OUT_CREDENTIAL_OWNER.length` is greater than 15; `buildAddByRssCredentialKey` with the
    owner keeps it unhashed (`abrss-cred.signed-out-device.` prefix).
  - `resolveAddByRssCredentialWriteOwner`: `('device', null)` and `('device', 'abc1234')` →
    the signed-out owner; `('server', 'abc1234')` → `'abc1234'`; `('server', null)` → null.
  - `isAccountCredentialOwner`: false for the signed-out owner, true for `'abc1234'`.
  - `settleSignedOutAddByRssCredentials`:
    - a saved feed's pair ends under the account and is gone from the signed-out owner;
    - a removed feed's signed-out pair is deleted and nothing is written under the account;
    - a signed-out feed in neither list keeps its pair;
    - a saved feed with no signed-out pair leaves the account's existing pair alone;
    - calling twice with the same arguments gives the same store as calling once;
    - `accountIdText` equal to the signed-out owner, or `''`, changes nothing.
  - `copySignedOutAddByRssCredentialsToAccount` (R55):
    - a listed feed with a signed-out pair and no account pair ends with the same pair under the
      account, and the signed-out pair is still there;
    - a listed feed whose account already holds a different pair keeps the account's pair, and
      the signed-out pair is unchanged;
    - a listed feed with no signed-out pair writes nothing under the account;
    - a signed-out feed not in `feedUrls` is not copied;
    - calling twice with the same arguments gives the same store as calling once;
    - `accountIdText` equal to the signed-out owner, or `''`, changes nothing;
    - the store's `delete` is never called (wrap the fake's `delete` in `vi.fn()` and assert no
      calls; add `vi` to the file's `vitest` import).
- Maestro: `apps/mobile/e2e/add-by-rss-device-credentials.yaml` (new), both platforms. It covers
  signed-out storage, the redirect rule on a real device stack, R42 (hidden while signed in,
  nothing moved), and the signed-out half of R43 (the pair survives sign-out). The SecureStore
  and SQLite wrapper has no Vitest suite; the pure rules above hold the settle, the copy, and the
  owner filter (**mobile-test-economics**). Plan 34 does not run the sign-up carry in Maestro, so
  R41 rests on the settle unit cases. The seeded account follows no protected feed, so R55 rests
  on the copy unit cases and on plan 34's call order; a Maestro case would need a seed change that
  every web E2E spec shares.
- `add-by-rss-credentials.yaml` (signed in, server path) passes unchanged.

## Release scratchpad

```markdown
## Mobile Add by RSS keeps feed passwords while signed out

- Surfaces: mobile
- Change: A username and password entered for a protected Add by RSS feed while signed out are
  kept on the phone (in the device's secure storage, never sent to Podverse) and used when the
  phone fetches that feed or plays its media. Signing in to an existing account moves nothing:
  those feeds and their passwords stay on the phone, hidden while signed in, and are used again
  after sign-out. When the account also follows one of those feeds, the username and password
  saved while signed out are copied to the account on this phone, unless the account already has
  a pair for that feed there, so the feed does not ask for them again while signed in. The copy
  stays on the phone, and the signed-out copy is kept for after sign-out. Creating an account in
  the app moves the passwords of the feeds saved to the
  new account into it, and deletes the passwords of the feeds removed because of the account's
  Add by RSS limit. Signing out removes the passwords the account saved on the phone and keeps
  the ones saved while signed out. A feed the account followed stays on the phone after sign-out
  and asks for its password again there.
- Who notices: signed-out mobile users with password-protected feeds
- Operator steps: none
```
