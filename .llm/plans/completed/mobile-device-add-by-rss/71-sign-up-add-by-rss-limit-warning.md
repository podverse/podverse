**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# 71 — Warning before sign-up when device feeds exceed the limit

A signed-out user who follows more Add by RSS feeds on the phone than a new account can hold
sees one screen before the sign-up form. It states the limit, warns that feeds over it may be
lost, offers Export OPML in place, has a show/hide section with the details, names the support
email, and keeps Continue disabled until a checkbox accepts the loss. Continue opens the sign-up
form. This screen is the only place the user accepts the removal that area C's sign-up carry
performs (§ Seams for the second pass, "Sign-up carry").

## Rows

R32, R33, R34, R35, R36, R37, R38

## Runs after

70; 62 (adds `apps/mobile/src/lib/addByRss/feedLimit.ts`, `fetchAddByRssDefaultFeedLimit`); 30
(adds `addByRssRepository.listSignedOutFollowedFeeds()`).

## Files

apps/mobile/App.tsx
apps/mobile/src/auth/signUpAddByRssLimitGate.ts
apps/mobile/src/auth/signUpAddByRssLimitGate.test.ts
apps/mobile/src/auth/signUpAddByRssLimitCheck.ts
apps/mobile/src/screens/auth/SignUpAddByRssLimitScreen.tsx
apps/mobile/src/components/content/ContactEmailText.tsx
apps/mobile/src/auth/VerificationEmailNotSentMessage.tsx
apps/mobile/src/components/membership/TrialLimitationsContent.tsx
packages/i18n-catalog/mobile/originals/en-US.json
packages/i18n-catalog/mobile/originals/es.json
packages/i18n-catalog/mobile/originals/fr.json
packages/i18n-catalog/mobile/originals/el-GR.json
apps/mobile/e2e/signup-add-by-rss-limit.yaml
scripts/mobile/e2e-test.sh
.cursor/skills/mobile-test-economics/SKILL.md
release-notes/scratchpad.md

## Answers from the code

- **Every route to sign-up goes through `App.tsx`.** `AppBody` holds `authMode`
  (`'anonymous' | 'forgot-password' | 'login' | 'signup'`) and opens the full-screen auth `Modal`
  with `openAuthSheet(mode)`. Sign-up is requested from three places, all in that file: the
  `AuthPromptProvider` `onRequestSignUp` (membership gate and other prompts), the
  `MobileTabNavigator` `onRequestSignUp` prop (More › Sign Up row `anonymous-signup-cta`, the
  Hello World screen), and `LoginScreen`'s `onSwitchToSignUp` link. `SignUpScreen` itself needs
  no change.
- **The warning lives in the auth sheet, not in a second modal.** The sheet is an RN `Modal` with
  `presentationStyle="fullScreen"`. Presenting another full-screen modal while it opens wedges
  iOS (**mobile-modal-presentation-lifecycle**), and an `AppOverlay` raised from inside it renders
  under it (**mobile-overlays-in-tree** § The one boundary). So the warning is another `authMode`
  rendered inside the same `Modal`, and Continue swaps the sheet's content to `SignUpScreen`.
- **Export OPML can run on the warning itself.** Plan 70's `useOpmlExport` exports every feed the
  signed-out user follows: the Add by RSS feeds on the device, plus the directory subscriptions,
  whose feed URLs it looks up from the public channel route. Its notice is a catalog key with
  counts (progress, and how many directory podcasts were left out), and leaving the screen
  aborts a running export. The OS share sheet presents over the auth `Modal`. The app's swallow layer (`ShareSheetPassthroughOverlay`) is mounted
  outside the `Modal`, so a second instance goes inside the sheet to catch the tap that dismisses
  the share sheet.
- **Support address.** `getMobileConfig().contactEmail`; it is `''` on a build without one, as
  `signupSuccessCopy` already handles. The email-inside-a-sentence link is written out twice today
  (`VerificationEmailNotSentMessage`, `TrialLimitationsContent`'s `MissingContentBullet`); this
  plan extracts it and uses it a third time (**mobile-reusable-components**).

## Behavior

The check runs every time sign-up is requested while signed out, until the user accepts in the
current sheet:

1. Count `listSignedOutFollowedFeeds()`. A count of 0 opens the sign-up form with no network
   request.
1. Otherwise read `fetchAddByRssDefaultFeedLimit()` (public endpoint; null when unreachable).
1. More feeds than the limit: show the warning. At or under the limit: open the sign-up form.
1. **Limit unavailable** (null, a thrown error, Offline Mode, or a failed count): show a
   retryable error in the sheet, with no way to continue to sign-up. Retry runs the check again.
   Sign-up needs the server anyway (terms load and account create), and skipping the warning
   would let the carry remove feeds the user never agreed to lose.

While the check runs, the sheet shows a centered spinner under the `Sign Up` header, so a count
of 0 reads as the sign-up form loading.

Accepting is remembered while the sheet stays open: switching to Login and back to Sign Up goes
straight to the form. Dismissing the sheet (chevron, drag, Android back) or signing in clears it.

## Change

### 1. Pure gate

`apps/mobile/src/auth/signUpAddByRssLimitGate.ts`, with no React Native, Expo, or repository
imports:

```typescript
export type SignUpAddByRssLimitGate =
  | { kind: 'sign_up' }
  | { feedCount: number; kind: 'warn'; limit: number }
  | { kind: 'limit_unavailable' };

export const resolveSignUpAddByRssLimitGate = ({
  feedCount,
  limit,
}: {
  feedCount: number;
  limit: number | null;
}): SignUpAddByRssLimitGate => {
  if (feedCount === 0) {
    return { kind: 'sign_up' };
  }
  if (limit === null) {
    return { kind: 'limit_unavailable' };
  }
  return feedCount > limit ? { feedCount, kind: 'warn', limit } : { kind: 'sign_up' };
};
```

### 2. The check

`apps/mobile/src/auth/signUpAddByRssLimitCheck.ts`:

```typescript
/**
 * The E2E API's default limit is the production default, and lowering it there would refuse the
 * signed-in Add by RSS flows. Under the harness the sign-up check uses this limit instead, so a
 * flow can exceed it with two device feeds.
 */
export const MOBILE_E2E_SIGNUP_ADD_BY_RSS_FEED_LIMIT = 1;

export const checkSignUpAddByRssLimit = async (): Promise<SignUpAddByRssLimitGate> => { … };
```

- Read the count with `(await addByRssRepository.listSignedOutFollowedFeeds()).length`. On a
  thrown error, `console.warn('[signup-add-by-rss-limit] feed count failed', error)` and return
  `{ kind: 'limit_unavailable' }`.
- Count 0: return `{ kind: 'sign_up' }` before any limit read.
- Limit: `isMobileE2eFromEnv()` (from `config/e2eEnv`) → `MOBILE_E2E_SIGNUP_ADD_BY_RSS_FEED_LIMIT`;
  otherwise `await fetchAddByRssDefaultFeedLimit()`, treating a thrown error as null.
- Return `resolveSignUpAddByRssLimitGate({ feedCount, limit })`.

### 3. `ContactEmailText`

`apps/mobile/src/components/content/ContactEmailText.tsx`, named export:

```typescript
type ContactEmailTextProps = {
  email: string;
  linkStyle: StyleProp<TextStyle>;
  linkTestID?: string;
  style: StyleProp<TextStyle>;
  /** Already-localized text that contains `email` once. */
  text: string;
  testID?: string;
};
```

Renders one `Text` with `style` and `testID`. When `email` is non-empty and `text` contains it,
the email is a nested `Text` with `accessibilityRole="link"`, `linkStyle`, `linkTestID`, and
`onPress={() => { void Linking.openURL(`mailto:${email}`); }}`, between the text before and after
it. Otherwise it renders `text` plainly.

Migrate both existing copies, keeping their output and test IDs exactly:

- `VerificationEmailNotSentMessage`: the body `Text` becomes
  `<ContactEmailText email={contactEmail} linkStyle={styles.emailLink} linkTestID={contactTestID} style={styles.body} testID={testID} text={body} />`
  when `copy.showContactLink`, else pass `email=""`. Keep the outer
  `View accessibilityLiveRegion="polite"` and the optional title.
- `TrialLimitationsContent`: `MissingContentBullet` renders
  `<ContactEmailText email={email} linkStyle={emailLinkStyle} style={textStyle} testID="trial-limitations-missing-content" text={`• ${message}`} />`.

### 4. `SignUpAddByRssLimitScreen`

`apps/mobile/src/screens/auth/SignUpAddByRssLimitScreen.tsx`, named export:

```typescript
type SignUpAddByRssLimitScreenProps = {
  onDismiss: () => void;
  /** Downward drag from the header band. Skips the Modal slide so the drag is the only motion. */
  onDragDismiss: () => void;
  onProceed: (reason: 'accepted' | 'within_limit') => void;
};
```

State: `gate` (`{ kind: 'checking' }` or a `SignUpAddByRssLimitGate` other than `sign_up`), and
`accepted` (boolean, starts false). `runCheck` sets `gate` to checking, awaits
`checkSignUpAddByRssLimit()`, and drops the result when a newer run started (request-id ref) or
the screen unmounted. A `sign_up` result calls `onProceed('within_limit')`. Run it once on mount
and from Retry.

Frame, matching `SignUpScreen`: `SlideUpDismissGesture enabled onDismiss={onDragDismiss}` around a
root `View` (`testID="signup-add-by-rss-limit-screen"`, screen background, `flex: 1`), then
`HeaderBarChrome` with `backAccessibilityLabel={t('misc.dismiss')}`, `backIcon="chevron-down"`,
`backTestID="auth-dismiss"`, `onBack={onDismiss}`. Title: `t('authentication.sign_up')` while
checking, else `t('authentication.signup_add_by_rss_limit.title')`.

Body by `gate.kind`:

- `checking`: `<LoadingSection testID="signup-add-by-rss-limit-checking" />`.
- `limit_unavailable`: `MobileScreenContainer` (`testID="signup-add-by-rss-limit-body"`) holding
  `<RetryableError errorKey="authentication.signup_add_by_rss_limit.limit_unavailable" onRetry={runCheck} testID="signup-add-by-rss-limit-unavailable" />`.
- `warn`: `MobileScreenContainer` (`testID="signup-add-by-rss-limit-body"`), in this order. This is
  a static form-style screen (**mobile-screen-layout** § Static form-style screens):
  1. A `View` with `gap: tokens.spacing.base` holding the reading copy, all `typography.prose` in
     primary text color:
     - summary, `t('…summary', { feed_count: gate.feedCount, limit: gate.limit })`,
       `testID="signup-add-by-rss-limit-summary"`, `accessibilityLiveRegion="polite"`;
     - export recommendation, `t('…export_recommendation')`.
  1. `Button` `size="form"`, `variant="secondary"`, `fullWidth`, label
     `t('settings.opml.export_button')`, `loading` and `disabled` from `useOpmlExport().isExporting`,
     `onPress={() => { void opmlExport.exportOpml(); }}`,
     `testID="signup-add-by-rss-limit-export"`, `marginTop: tokens.spacing.base`. Under it, when
     set, the hook's notice, rendered as `t(opmlExport.notice.key, opmlExport.notice.params)`
     (`testID="signup-add-by-rss-limit-export-notice"`), or its error, `t(opmlExport.errorKey)`
     (`testID="signup-add-by-rss-limit-export-error"`), in `typography.body`, secondary color,
     `marginTop: tokens.spacing.md`, `accessibilityLiveRegion="polite"`. The hook owns the
     result copy (plan 70 § Copy); this screen adds none.
  1. `Accordion` (`components/primitives`), `title={t('…details_title')}`,
     `testID="signup-add-by-rss-limit-details"` (its toggle is
     `signup-add-by-rss-limit-details-toggle` and already carries role `button` and
     `expanded`), wrapped in a `View` with `marginTop: formActionsTopGap(tokens.spacing)` as
     `SignUpScreen`'s terms accordion is. Accordion content: a `View` with `gap: tokens.spacing.base`
     holding six `typography.prose` paragraphs: `details_kept` (with `{ limit }`),
     `details_removed` (`testID="signup-add-by-rss-limit-details-removed"`), `details_server`,
     `details_subscriptions`, `details_restore` (with `{ limit }`), `details_alternatives`.
  1. When `getMobileConfig().contactEmail !== ''`: `ContactEmailText` with
     `text={t('…contact', { email })}`, `typography.body` in secondary color, link style
     `{ color: tokens.text.link, textDecorationLine: 'underline' }`,
     `testID="signup-add-by-rss-limit-contact"`,
     `linkTestID="signup-add-by-rss-limit-contact-email"`, `marginTop: tokens.spacing.lg`. Leave
     it out when the address is empty.
  1. `CheckboxRow` `checked={accepted}`, `label={t('…accept_label')}`, toggling `accepted`,
     `testID="signup-add-by-rss-limit-accept"`, `marginTop: formActionsTopGap(tokens.spacing)`.
  1. `FormActions` with one action: `label: t('misc.continue')`,
     `disabled: !accepted || opmlExport.isExporting` (continuing unmounts this screen, which
     would abort a running export),
     `onPress: () => { onProceed('accepted'); }`, `testID: 'signup-add-by-rss-limit-continue'`;
     `style` `marginTop: formActionsTopGap(tokens.spacing)`. No Cancel button: the chevron and
     drag are the way out, as on Login and Sign Up.

Build the styles once per theme (`useMemo` over `themeStyles` and `tokens`, as `MoreOpmlScreen`
does). Use tokens and `typography` roles only; no raw font sizes or hex.

**Screen reader:** the header title, the checkbox (role `checkbox`, `checked`), Continue
(`disabled` until checked), the Export button (`busy` while exporting, from `Button` `loading`),
the details toggle (`expanded`), and the email link (role `link`) all come from the shared
components above. When `gate` turns `warn`, call
`AccessibilityInfo.announceForAccessibility(summaryText)` once, because the content replaces a
spinner without a focus change.

### 5. `App.tsx`

In `AppBody`:

- Widen the mode type to
  `'anonymous' | 'forgot-password' | 'login' | 'signup' | 'signup-add-by-rss-limit'`, and add
  `const [signUpLimitAccepted, setSignUpLimitAccepted] = useState(false);`.
- Add `openSignUp`:

```typescript
const openSignUp = () => {
  openAuthSheet(signUpLimitAccepted ? 'signup' : 'signup-add-by-rss-limit');
};
```

- Replace all three `openAuthSheet('signup')` calls (the `AuthPromptProvider` and
  `MobileTabNavigator` `onRequestSignUp` callbacks, after their `status !== 'anonymous'` guard,
  and `LoginScreen`'s `onSwitchToSignUp`) with `openSignUp()`. The signed-up screen's
  `onSwitchToLogin` stays `openAuthSheet('login')`.
- `dismissAuthSheet`, `dismissAuthSheetByDrag`, and the `status === 'authenticated'` effect also
  call `setSignUpLimitAccepted(false)`.
- `showAuthSheet` includes `authMode === 'signup-add-by-rss-limit'`.
- Inside the `Modal`'s `SafeAreaProvider`, the first branch becomes:

```tsx
{authMode === 'signup-add-by-rss-limit' ? (
  <SignUpAddByRssLimitScreen
    onDismiss={dismissAuthSheet}
    onDragDismiss={dismissAuthSheetByDrag}
    onProceed={(reason) => {
      if (reason === 'accepted') {
        setSignUpLimitAccepted(true);
      }
      setAuthMode('signup');
    }}
  />
) : authMode === 'signup' ? (
  …existing branches unchanged…
```

- Mount `<ShareSheetPassthroughOverlay />` as the last element inside the `Modal`'s
  `View style={styles.authSheet}`, after `SafeAreaProvider`. Keep the root instance where it is.
- The `Modal` stays mounted and driven by `visible` only. Do not wrap it or its content in a new
  condition, and do not open any other modal from these callbacks.

### 6. Copy

Mobile layer, `packages/i18n-catalog/mobile/originals/*.json`, under
`authentication.signup_add_by_rss_limit` (new leaf paths; the layer already holds other
`authentication.*` keys). The title is chrome in title case; the rest are sentences
(**ui-copy-casing**). Reuse `authentication.sign_up`, `misc.dismiss`, `misc.continue`, and
`settings.opml.export_button`.

| Key | en-US |
| --- | --- |
| `title` | Add by RSS Limit |
| `summary` | New accounts can keep up to {limit} Add by RSS feeds, and this device has {feed_count}. If you sign up, Add by RSS may not work as expected, and you may lose the feed URLs over the limit. |
| `export_recommendation` | Export OPML first to keep a copy of your Add by RSS feeds. You can import the file later to restore them. |
| `details_title` | More Details |
| `details_kept` | Your new account keeps the first {limit} Add by RSS feeds you followed on this device. |
| `details_removed` | The rest are removed from this device the first time you log in to the new account, along with any usernames and passwords saved for them. They are not added later. |
| `details_server` | After that, the server checks the feeds your account keeps for updates instead of this device, and they appear on your other signed-in devices. |
| `details_subscriptions` | Podcasts you subscribed to from the directory are all kept. |
| `details_restore` | To restore feeds later, log in and import your OPML file from More › OPML. Your account still holds no more than {limit} Add by RSS feeds. |
| `details_alternatives` | To keep every feed on this device, stay signed out. Logging in to an account you already have does not remove any feeds from this device. |
| `contact` | Questions? Contact {email}. |
| `accept_label` | I understand that Add by RSS feeds over the limit will be removed from this device. |
| `limit_unavailable` | Couldn't load the Add by RSS limit. Check your connection, then try again. |

Write `es`, `fr`, and `el-GR` in the same layer with the same placeholders, each in its own
capitalization. Keep "Add by RSS", "OPML", and "More › OPML" as written (`nav.menu.opml` is
"OPML" on mobile). Do not touch `overrides/` or `compiled/`. Insert the block beside the
existing `authentication.account_created_*` keys with StrReplace (**large-file-reading**); never
rewrite a catalog file.

## What must stay true

- The warning appears only signed out, only when the count is over the limit, and before the
  sign-up form. Continue is unreachable until the checkbox is checked, and while an export runs.
- With no limit, nothing opens the sign-up form from this sheet except Retry succeeding.
- One full-screen `Modal`, driven by `visible`. No new overlay or modal.
- `SignUpScreen`, Login, Forgot Password, and the signed-up success screen behave as before.
- Web has no warning: web has no signed-out Add by RSS library to carry. Intentional divergence.

## Tests

- `apps/mobile/src/auth/signUpAddByRssLimitGate.test.ts` — count 0 with a null limit is
  `sign_up`; count 3, limit null is `limit_unavailable`; count 3, limit 3 is `sign_up`; count 4,
  limit 3 is `warn` with both numbers.
- Maestro `apps/mobile/e2e/signup-add-by-rss-limit.yaml` (new; one platform proves the wiring per
  **mobile-test-economics**). Use `${TIMEOUT_*}` from `shared/timeouts.env`
  (**mobile-maestro-timeouts**). Signed out, no login:
  1. `runFlow: shared/launch-and-connect.yaml`.
  1. Add two Add by RSS feeds signed out: `tab-my-library` → `library-nav-add-by-rss` →
     `rss-add-button` → `rss-url-input` → `inputText: http://localhost:2111/feeds/feed-podcast-1.rss`
     → `rss-add-submit` → wait for `rss-root-screen` (`${TIMEOUT_SLOWER}`); repeat with
     `http://localhost:2111/feeds/feed-1.rss`. Copy any extra step area C's signed-out add flow
     needs.
  1. `tab-more` → `more-nav-opml` → assert `opml-export-button` `enabled: true` → tap → assert
     `opml-export-notice` → `runFlow: shared/stack-back.yaml`.
  1. `scrollUntilVisible` `anonymous-signup-cta` on More, tap it, wait for
     `signup-add-by-rss-limit-summary`. Assert `signup-add-by-rss-limit-continue` with
     `enabled: false`. Screenshot.
  1. Tap `signup-add-by-rss-limit-export`, assert `signup-add-by-rss-limit-export-notice`.
  1. Tap `signup-add-by-rss-limit-details-toggle`, assert
     `signup-add-by-rss-limit-details-removed`. Screenshot.
  1. `scrollUntilVisible` and tap `signup-add-by-rss-limit-accept`; assert the Continue control
     with `enabled: true`; tap it; assert `signup-form`. Screenshot.
  1. Tap `auth-switch-login` (scroll to it), assert `login-screen`, tap `auth-switch-signup`,
     assert `signup-form` (accepted in this sheet, so no warning). Tap `auth-dismiss`, assert
     `more-screen`.
- `scripts/mobile/e2e-test.sh`: add `signup-add-by-rss-limit` to `flow_needs_e2e_api` (the
  sign-up form loads terms) and to `flow_needs_test_assets` (the device fetches `:2111` feeds).
- `.cursor/skills/mobile-test-economics/SKILL.md`: add `signup-add-by-rss-limit` to the "Auth and
  membership" row's area list.

## Release scratchpad

```markdown
## Mobile sign-up warns when device Add by RSS feeds exceed the limit

- Surfaces: mobile
- Change: signed out on mobile, tapping Sign Up first counts the Add by RSS feeds followed on
  this device. When there are more than the server's default Add by RSS limit (read from the
  public limit endpoint), a screen states the limit and the count, warns that feeds over the
  limit may be lost, offers Export OPML right there, has a More Details section, names the
  support email, and keeps Continue disabled until a checkbox accepts the removal. Continue opens
  the sign-up form. When the limit cannot be loaded, the screen shows a retry and does not open
  sign-up. A device at or under the limit goes straight to the sign-up form.
- Who notices: signed-out mobile users with many Add by RSS feeds who create an account
- Operator steps: none
```
