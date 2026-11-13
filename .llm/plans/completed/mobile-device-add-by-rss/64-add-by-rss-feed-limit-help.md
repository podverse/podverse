**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 64 — State the account's Add by RSS limit on the mobile Add by RSS screen

While signed in, the My Library › Add by RSS screen (`AddByRssRootScreen`) shows one help line
under the Add Feed action band:

> Add by RSS holds up to {max_feeds} feeds.

The number is the signed-in account's own limit (its override, or the shared default from plan
60), read with `fetchAccountAddByRssFeedLimit()` from plan 62. The line replaces the Trial
limitations sentence plan 60 removes from the membership comparison.

## Rows

R51

## Runs after

32, 62

## Files

apps/mobile/src/screens/rss/AddByRssRootScreen.tsx
apps/mobile/src/components/form/ChipRowWithActions.tsx
packages/i18n-catalog/mobile/originals/en-US.json
packages/i18n-catalog/mobile/originals/es.json
packages/i18n-catalog/mobile/originals/fr.json
packages/i18n-catalog/mobile/originals/el-GR.json
packages/i18n-catalog/mobile/overrides/*.json (by `npm run i18n:compile` only)
apps/mobile/e2e/add-by-rss.yaml
apps/mobile/e2e/add-by-rss-anonymous.yaml
release-notes/scratchpad.md

## Decisions already made (transcribe, do not revisit)

- **Placement.** The line sits on `AddByRssRootScreen` between the action band (Add Feed and
  Check for Updates, `rss-list-actions`) and the media type chips. Not on `AddByRssAddScreen`
  under `rss-url-input`.
- **When it shows.** Only while `status === 'authenticated'` and the reader returned a number.
  - Signed out, there is no limit (R24), so nothing shows and nothing is fetched.
  - `null` hides the line. The reader returns `null` for offline, Offline Mode, a 401, any 403
    (a free account with no membership, or a lapsed one, gets `membership_expired`), and an
    invalid value. So only a valid Trial or Premium member sees it.
  - No cache and no placeholder number. The line appears when the read answers and is absent
    until then. The read never blocks first paint or the list.
- **When it is read.** Once when the screen mounts or the auth inputs change, and again on every
  `focus` of the screen, so an override changed elsewhere shows on return. While a read is in
  flight the last value stays on screen. A request id drops answers that arrive after a newer
  read started or after sign-out.
- **Copy.** Mobile-only, so it goes in the `mobile/` catalog layer
  (**i18n-user-facing-strings**: shared → consumer → mobile, no duplicate key paths). It is a
  sentence, so sentence case (**ui-copy-casing**); "Add by RSS" keeps its capitals. Mobile
  placeholders use single braces.
- **Component.** `HelperNote` at its default `compact` scale (**mobile-screen-layout**), placed
  through a new optional slot on `ChipRowWithActions` so the layout's one `rowGap` spaces it
  (**even-content-spacing**).

## Intentional divergence between surfaces

Web shows no Add by RSS limit sentence anywhere: plan 60 removes it from the membership page and
the API comparison document, and web's Add by RSS pages do not gain one. A web user learns the
number from the at-limit refusal (plan 63). Mobile states it here, signed in only. This is
intended; the limit is per account, and the operator asked for the sentence on the mobile Add by
RSS screen only. Do not add a web counterpart.

## 1. Catalog

In each mobile original, add `feed_limit_help` as the last key of `features.add_by_rss`, after
`credentials_remove_feed_confirm` (add the comma to that line). Use StrReplace on that block
only; never rewrite a catalog file (**large-file-reading**). Plan 51 inserts
`credentials_page_host_note` beside `credentials_mobile_media_note` in the same block; leave it
as you find it.

- en-US: `Add by RSS holds up to {max_feeds} feeds.`
- es: `Añadir por RSS admite hasta {max_feeds} feeds.`
- fr: `Ajouter par RSS accepte jusqu'à {max_feeds} flux.`
- el-GR: `Η προσθήκη μέσω RSS δέχεται έως {max_feeds} ροές.`

Then run `npm run i18n:compile` (it adds the empty override slots) and `npm run i18n:validate`.
Never hand-edit `overrides/`.

## 2. `ChipRowWithActions`

`apps/mobile/src/components/form/ChipRowWithActions.tsx`. `AddByRssRootScreen` is its only
caller.

- Add to `ChipRowWithActionsProps`, after `actionsTestID`:

  ```ts
  /** Shown under the action band, above the chips. */
  actionsNote?: ReactNode;
  ```

- Destructure `actionsNote`. Add a style `note: { alignSelf: 'stretch' }`.
- Render it between the actions `View` and the chips `View`:

  ```tsx
  {actionsNote !== undefined && actionsNote !== null ? (
    <View style={styles.note}>{actionsNote}</View>
  ) : null}
  ```

  With no note the rendered tree is the same as before. Spacing comes from the layout's existing
  `rowGap`; add no margin.
- Update the component doc comment to mention the optional note under the actions.

## 3. `AddByRssRootScreen`

`apps/mobile/src/screens/rss/AddByRssRootScreen.tsx`, after plan 32 has edited it. Plan 32 keeps
`useAuth()`'s `accessToken`, `clearSession`, `refreshToken`, `setTokens`, and `status`; if any of
them is gone when you start, take it from `useAuth()` again.

Imports:

```ts
import { HelperNote } from '../../components/feedback/HelperNote';
import { fetchAccountAddByRssFeedLimit } from '../../lib/addByRss/feedLimit';
```

State, beside `feedRequestIdRef`:

```ts
const [feedLimit, setFeedLimit] = useState<number | null>(null);
const feedLimitRequestIdRef = useRef(0);
```

Reader and effect, after the effect that runs `loadFeed('initial')`:

```ts
const loadFeedLimit = useCallback(async () => {
  feedLimitRequestIdRef.current += 1;
  const requestId = feedLimitRequestIdRef.current;
  if (status !== 'authenticated') {
    setFeedLimit(null);
    return;
  }
  const limit = await fetchAccountAddByRssFeedLimit({
    accessToken,
    clearSession,
    refreshToken,
    setTokens,
  });
  if (requestId === feedLimitRequestIdRef.current) {
    setFeedLimit(limit);
  }
}, [accessToken, clearSession, refreshToken, setTokens, status]);

useEffect(() => {
  void loadFeedLimit();
  return navigation.addListener('focus', () => {
    void loadFeedLimit();
  });
}, [loadFeedLimit, navigation]);
```

`fetchAccountAddByRssFeedLimit` never throws (plan 62), so there is no `try`. A token refresh
changes `accessToken` and causes one more read; that is fine. `navigation` is the screen's prop.

Render: pass the note to the existing `ChipRowWithActions`, between `actions` and
`actionsTestID`:

```tsx
actionsNote={
  status === 'authenticated' && feedLimit !== null ? (
    <HelperNote
      message={t('features.add_by_rss.feed_limit_help', { max_feeds: feedLimit })}
      testID="rss-feed-limit-help"
    />
  ) : undefined
}
```

`HelperNote` is a single accessible element whose label is the message, so screen readers read
the sentence once.

## Tests

The visibility rule is one condition, and plan 62's `feedLimit.test.ts` already covers every
`null` case of the reader, so there is no new unit test (**mobile-test-economics**: Maestro owns
the wiring and the signed-in gate).

- `apps/mobile/e2e/add-by-rss.yaml` (signed in as the seeded Trial member). After
  `assertVisible: id: rss-root-screen` and before `takeScreenshot: add-by-rss-library-initial`:

  ```yaml
  # Signed in, the line under Add Feed states this account's Add by RSS limit from the server.
  - extendedWaitUntil:
      visible:
        id: rss-feed-limit-help
        text: "Add by RSS holds up to [0-9]+ feeds\\."
      timeout: ${TIMEOUT_SLOW}
  ```

  The pattern does not pin 100, so a seed or override change does not break the flow.
- `apps/mobile/e2e/add-by-rss-anonymous.yaml` (created by plan 32). After
  `takeScreenshot: add-by-rss-anonymous-feed-listed`:

  ```yaml
  # Signed out there is no Add by RSS limit, so the limit line is absent.
  - assertNotVisible:
      id: rss-feed-limit-help
  ```

## Release scratchpad

```markdown
## Mobile Add by RSS screen states the account's feed limit

- Surfaces: mobile
- Change: While signed in, My Library › Add by RSS shows "Add by RSS holds up to N feeds." under the Add Feed button, where N is the account's own limit read from the server (its override, or the shared default). The line is hidden when signed out (signed-out adds have no limit), when the server cannot answer (offline, Offline Mode), and for accounts without a valid membership. It is re-read each time the screen opens. The website's Add by RSS pages do not show this line; web states the number only when an add is refused at the limit.
- Who notices: signed-in Trial and Premium mobile users of Add by RSS
- Operator steps: none
```
