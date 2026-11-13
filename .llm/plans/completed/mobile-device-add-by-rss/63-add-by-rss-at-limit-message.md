**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 63 — At the Add by RSS limit: say so, and point to support

When a signed-in account tries to save one more Add by RSS feed than its limit allows, the API
refuses with a 403 (`add_by_rss_feed_limit_reached`). Today that refusal tells the user to renew
their membership and carries a renew path, and neither client shows a dedicated message: web
returns `null` from `getMembership403ModalProps` for `limit_reached`, and mobile shows the generic
"Limit Reached" gate whose confirm button goes to the Membership screen.

With one shared limit (plan 60) there is nothing to buy at the limit. The refusal says the limit
was reached and that the user can email support to have it raised. It carries the limit number
and no renew path. Web and mobile show that message with an **Email Support** action that opens a
`mailto:` to the app's support address.

The manual-refresh hourly limit (`manual_refresh_hourly_limit_reached`) keeps its renew path and
its current handling. Only the Add by RSS feed limit changes.

## Rows

R27

## Runs after

60, 32

## Files

apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts
apps/api/openapi.yml
apps/api/src/test/account-follows-notifications.test.ts
packages/helpers-requests/src/api/parseMembershipGateError.ts
packages/helpers-requests/src/api/parseMembershipGateError.test.ts
apps/web/src/utils/membership/modalForMembership403.tsx
apps/web/src/utils/membership/modalForMembership403.test.ts (new)
apps/web/src/components/Modal/ModalLoginRequired.tsx
apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx
apps/web/src/components/AddByRSS/Artist/AddByRSSArtistHeader.tsx
apps/web/src/components/AddByRSS/Artist/Album/AddByRSSAlbumHeader.tsx
apps/web/e2e/add-by-rss-feed-limit-reached.spec.ts (new)
makefiles/local/e2e-spec-order-web.txt
apps/mobile/src/membership/MembershipGateProvider.tsx
apps/mobile/src/screens/home/AddByRssHomeDetailScreen.tsx
packages/i18n-catalog/consumer/originals/en-US.json
packages/i18n-catalog/consumer/originals/es.json
packages/i18n-catalog/consumer/originals/fr.json
packages/i18n-catalog/consumer/originals/el-GR.json
packages/i18n-catalog/consumer/overrides/*.json (by `npm run i18n:compile` only)
release-notes/scratchpad.md

## Decisions already made (transcribe, do not revisit)

- The refusal keeps `code: 'add_by_rss_feed_limit_reached'` and
  `i18nKey: 'membership.add_by_rss_feed_limit_reached'`, drops `renewPath`, and adds
  `limit` (the account's resolved limit). Clients render their own localized sentence with their
  own support address; the API `message` is American English structural text.
- Web and mobile show the same title (`membership.gate.title_limit`, "Limit Reached"), the same
  body (`membership.add_by_rss_feed_limit_reached` with `{limit}` and `{contactEmail}`), and a
  confirm labeled `membership.gate.email_support` ("Email Support") that opens
  `mailto:<support address>`. Mobile's cancel is `misc.close`.
- A refusal with this code but no `limit` (an older server) falls back to the existing handling:
  the generic limit gate on mobile and the caller's own error path on web.
- The catalog strings are plain text with no rich tags, because mobile renders them
  (**i18n-user-facing-strings**).

## 1. API

`apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts`, `addOrUpdateRSSChannel`,
inside `if (!alreadySaved && existingCount >= entitlements.maxAddByRSSFeeds)`:

- Delete the `premiumLimitRaw` / `premiumLimitParsed` / `premiumLimit` lines.
- The response becomes:

```ts
const limit = entitlements.maxAddByRSSFeeds;
const contactEmail = config.terms.contactEmail;
res.status(403).json({
  message:
    contactEmail !== ''
      ? `You have reached your limit of ${limit} Add by RSS feeds. To have it raised, email ${contactEmail}.`
      : `You have reached your limit of ${limit} Add by RSS feeds. To have it raised, contact support.`,
  code: 'add_by_rss_feed_limit_reached',
  i18nKey: 'membership.add_by_rss_feed_limit_reached',
  limit,
});
```

- Remove the `APP_ROUTES` import if nothing else in the file uses it.

`apps/api/openapi.yml`, `components.schemas.AuthorizationErrorResponse`: add a `limit` property
(integer, nullable, description "Present on `add_by_rss_feed_limit_reached`: the account's Add by
RSS feed limit."), and append to the `renewPath` description: "Absent on
`add_by_rss_feed_limit_reached`; raising that limit is a support request, not a purchase."

## 2. Shared parser

`packages/helpers-requests/src/api/parseMembershipGateError.ts`:

- `MembershipGateError` gains `limit?: number` (doc: "The account's limit, on refusals that
  carry one (the Add by RSS feed limit)."). `parseMembershipGateError` reads it when
  `data.limit` is a non-negative integer and leaves it `undefined` otherwise.
- Export `ADD_BY_RSS_FEED_LIMIT_REACHED_CODE = 'add_by_rss_feed_limit_reached'`.
- Export `parseAddByRssFeedLimitRefusal(error: unknown): { limit: number } | null`: it calls
  `parseMembershipGateError`, and returns `{ limit }` only when `code` equals that constant and
  `limit` is defined; otherwise `null`.
- In the file's top doc comment, say `renewPath` is present on most membership denials and that
  the Add by RSS feed limit carries `limit` and no `renewPath`.

The package's `api/index.ts` already re-exports this file with `export *`.

## 3. Catalog

Consumer originals, `membership` namespace.

Rewrite `add_by_rss_feed_limit_reached`:

- en-US: `You have reached your limit of {limit} Add by RSS feeds. To have it raised, email {contactEmail}.`
- es: `Has alcanzado tu límite de {limit} feeds de Añadir por RSS. Para ampliarlo, escribe a {contactEmail}.`
- fr: `Vous avez atteint votre limite de {limit} flux Ajouter par RSS. Pour l'augmenter, écrivez à {contactEmail}.`
- el-GR: `Έχετε φτάσει το όριο των {limit} ροών προσθήκης μέσω RSS. Για να αυξηθεί, στείλτε email στο {contactEmail}.`

Add `gate.email_support`, after `gate.sign_up`:

- en-US: `Email Support`
- es: `Escribir a soporte`
- fr: `Écrire au support`
- el-GR: `Email στην υποστήριξη`

Do not edit `overrides/` by hand. Run `npm run i18n:compile` once after the originals change, so
the override files gain the empty `gate.email_support` slot. Leave whatever it writes.

## 4. Web

- `apps/web/src/utils/membership/modalForMembership403.tsx`: the `MembershipTranslator` call
  signature becomes `(key: string, values?: Record<string, string | number>): string`. At the top
  of `getMembership403ModalProps`, before `parseMembershipGateError`, add:

```ts
const feedLimitRefusal = parseAddByRssFeedLimitRefusal(params.error);
if (feedLimitRefusal !== null) {
  return {
    title: params.tMembership('gate.title_limit'),
    message: params.tMembership('add_by_rss_feed_limit_reached', {
      contactEmail: params.contactEmail,
      limit: feedLimitRefusal.limit,
    }),
    messageNode: null,
    actionLabel: params.tMembership('gate.email_support'),
    actionHref: `mailto:${params.contactEmail}`,
  };
}
```

  Change the closing comment to say the remaining `limit_reached` denials (manual refresh, and an
  Add by RSS refusal without `limit`) have no modal here.
- `apps/web/src/components/Modal/ModalLoginRequired.tsx`, `handleActionOnClick`: when
  `actionHref.startsWith('mailto:')`, set `window.location.href = actionHref`; otherwise keep
  `router.push(actionHref)`.
- The three Add by RSS headers. Each gets
  `const { tryHandleMembershipGateError } = useMembershipGate();` (from
  `../../../hooks/useMembershipGate` with the right depth), and in the `catch` of the subscribe
  action, before `console.error` and `window.alert`:
  `if (tryHandleMembershipGateError(error)) { return; }`.
  - `AddByRSSPodcastHeader.tsx`: the `catch (error)` that ends with `window.alert('Error performing action.')` (near line 106).
  - `AddByRSSArtistHeader.tsx`: the `catch (error)` of the subscribe toggle that calls
    `followAddByRSSChannelAndQueue` (near line 134). Leave the unfollow-all catch (near line 170)
    alone.
  - `AddByRSSAlbumHeader.tsx`: the `catch (error)` near line 109.
- `apps/web/src/hooks/useAddByRSSAddFeedFlow.ts` already calls `tryHandleMembershipGateError`
  first in its catch; it needs no edit.

## 5. Mobile

`apps/mobile/src/membership/MembershipGateProvider.tsx`:

- New state `const [feedLimitGate, setFeedLimitGate] = useState<{ limit: number; visible: boolean }>({ limit: 0, visible: false });`
  and `closeFeedLimitGate` that sets `visible: false` and keeps `limit`, so the fade-out does not
  change the number.
- `handleGateError` checks `parseAddByRssFeedLimitRefusal(error)` (from
  `@podverse/helpers-requests`) first. When it returns a value, set
  `{ limit, visible: true }` and return `true`. Otherwise run the existing
  `mapMembershipDenial` path unchanged. `runGated` inherits this.
- `onEmailSupport`: close the dialog, then open the support address the way
  `TrialLimitationsContent.tsx` does (import `Linking` from `react-native` and `getMobileConfig`
  from `../config`):

```ts
void Linking.openURL(`mailto:${getMobileConfig().contactEmail}`);
```
- Render a second `ConfirmDialog` after the existing one:
  `testID="add-by-rss-feed-limit-modal"`, `title={t('membership.gate.title_limit')}`,
  `body={t('membership.add_by_rss_feed_limit_reached', { contactEmail: getMobileConfig().contactEmail, limit: feedLimitGate.limit })}`,
  `confirmLabel={t('membership.gate.email_support')}`,
  `confirmTestID="add-by-rss-feed-limit-email-support"`, `onConfirm={onEmailSupport}`,
  `cancelLabel={t('misc.close')}`, `cancelTestID="add-by-rss-feed-limit-close"`,
  `onCancel={closeFeedLimitGate}`, `visible={feedLimitGate.visible}`.
- Add one bullet to the provider's doc comment: an Add by RSS feed-limit refusal opens its own
  dialog with the limit and an Email Support action instead of the Membership gate.

`apps/mobile/src/screens/home/AddByRssHomeDetailScreen.tsx`, `handleSubscribe` (plan 32 may have
reshaped it; find the `reqAccountFollowAddByRSSChannel` call inside it): take `handleGateError`
from the `useMembershipGate()` call the screen already makes (it takes `openGate` today), and
change the bare `catch { setRemoveErrorKey('errors.generic'); }` around that follow to
`catch (error) { if (handleGateError(error)) { return; } setRemoveErrorKey('errors.generic'); }`.
Add `handleGateError` to that callback's dependency list.

`apps/mobile/src/hooks/useAddByRssAddFlow.ts` already calls `handleGateError` first in its catch;
it needs no edit.

## Tests

- `apps/api/src/test/account-follows-notifications.test.ts`, in
  `describe('POST /follow/add-by-rss-channel'`: a case "returns 403 with the limit and no renew
  path when the account is at its Add by RSS limit". Mock `hasFollowedAddByRSSChannel` to
  `false` and the followed-feed count (`getFollowedAddByRSSChannelCount`; add it to the hoisted
  service mocks if the file has none) to the resolved limit. Assert status 403,
  `code: 'add_by_rss_feed_limit_reached'`, `i18nKey: 'membership.add_by_rss_feed_limit_reached'`,
  `limit` equal to the resolved limit, `renewPath` undefined, and that `addOrUpdateRSSChannel` was
  not called. If the test app runs with `PODVERSE_E2E_FIXTURES=1`, which skips this gate, say so
  in your final message instead of forcing it.
- `packages/helpers-requests/src/api/parseMembershipGateError.test.ts`: the existing limit case
  sends `limit: 100` with no `renewPath` and expects `limit: 100`. New cases for
  `parseAddByRssFeedLimitRefusal`: returns `{ limit: 100 }` for that body; `null` when `limit` is
  missing; `null` for `manual_refresh_hourly_limit_reached` with a `limit`; `null` for a 401.
- `apps/web/src/utils/membership/modalForMembership403.test.ts` (new, vitest): with a stub
  translator that returns the key plus its values, a feed-limit 403 yields title
  `gate.title_limit`, action label `gate.email_support`, and `actionHref`
  `mailto:support@example.com`; a manual-refresh 403 still yields `null`.
- `apps/web/e2e/add-by-rss-feed-limit-reached.spec.ts` (new): `loginSeedUser(page)` from
  `./helpers/addByRSSCredentials`; `page.route('**/account/follow/add-by-rss-channel', …)` fulfills
  status 403 with the body from § 1 and `limit: 100`; go to `/add-by-rss/add`, fill
  `RSS Feed URL` with `https://example.com/e2e-feed-limit.xml`, click `Add Feed`. Assert the
  dialog shows `Limit Reached`, text matching
  `/^You have reached your limit of 100 Add by RSS feeds\. To have it raised, email \S+@\S+\.$/`,
  and a button `Email Support`. Capture the dialog with `capturePageLoad`
  (**e2e-screenshot-verified-element**). Do not click the button. Add the spec to
  `makefiles/local/e2e-spec-order-web.txt` after `apps/web/e2e/add-by-rss-remote-items.spec.ts`.
- No Maestro flow. The mobile E2E API runs with fixtures that skip this gate, so a flow cannot
  reach the refusal; the shared parser tests hold the mobile branch.

## Release scratchpad

```markdown
## At the Add by RSS limit, the app says so and points to support

- Surfaces: api, web, mobile
- Change: Saving an Add by RSS feed past the account's limit returns a 403 `add_by_rss_feed_limit_reached` with the account's `limit` and no `renewPath`. Web and mobile show "Limit Reached" with "You have reached your limit of N Add by RSS feeds. To have it raised, email <support address>." and an Email Support button that opens an email. Web shows this from the add page and from the subscribe buttons on Add by RSS podcast, artist, and album pages, which used to show a generic error. The manual refresh hourly limit is unchanged.
- Who notices: signed-in users at their Add by RSS limit; support, who receive the requests
- Operator steps: set `CONTACT_EMAIL` on the API so its structural message names the address; the clients use their own configured support address either way
```
