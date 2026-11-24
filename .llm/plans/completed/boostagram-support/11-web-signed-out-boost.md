**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Rows

R31, R40, R41

## Runs after

10

## Files

- packages/v4v-helpers/src/boostFormRules.ts
- packages/v4v-helpers/src/boostFormRules.test.ts
- packages/v4v-helpers/src/index.ts
- apps/web/src/components/Boost/BoostFormBase.tsx
- apps/web/src/components/Boost/BoostFormFields.tsx
- apps/web/src/components/Boost/hooks/useBoostPayments.ts
- tools/web/seed-e2e.mjs
- apps/web/e2e/helpers/seedConstants.ts
- apps/web/e2e/boost-signed-out-form.spec.ts
- makefiles/local/e2e-spec-order-web.txt

## Tests

- Add `packages/v4v-helpers/src/boostFormRules.test.ts` (existing `npm run test -w @podverse/v4v-helpers`).
- Add `apps/web/e2e/boost-signed-out-form.spec.ts`. Register it in `makefiles/local/e2e-spec-order-web.txt` on the line after `apps/web/e2e/podcast-podroll-stubs.spec.ts`.
- The spec does not click Submit. WebLN is not available in the browser test.

## Release scratchpad

Append this when the prompt runs alone. When it runs in a phase with other prompts, put the same entry in the final message under "Release notes entry" and do not edit `release-notes/scratchpad.md`.

```markdown
## Signed-out listeners can pay a web boost

- Surfaces: web
- Change: A signed-out visitor can pay a channel boost, an item boost, and a /donate tip. The name and message stay locked until Podverse login, including when there is no MetaBoost post. The form does not fill the name from the account display name. A typed name is remembered in the boost form defaults, and an empty name is sent as no name. The MetaBoost capability request and the public post wait until login and use the sender id.
- Who notices: listeners sending a boost or a tip in the browser without an account
- Operator steps: none
```

# Signed-out boost payments on web

Plan 10 leaves the web form sign-in gated. This plan lets a signed-out visitor pay a channel boost, an item boost, and `/donate` (R31, R41). The name and message stay locked until Podverse login on every one of those forms, including when there is no MetaBoost post. The amount and Submit stay available.

`boostPaymentScope` in `apps/web/src/components/Boost/boostPaymentScope.ts` is `creator_only` for `BoostForm` (channel and item) and `app_only` for `BoostAppDonateForm` (`/donate`). Both scopes lose the sign-in gate on payment. Do not leave `app_only` gated.

The MetaBoost sender id is already on the account. `AccountController.getLoggedInAccount` in `apps/api/src/controllers/account/account.ts` sets `sender_guid` from `AccountMetaboostService.getSenderGuidByAccountId` when a row exists. Signup inserts that row (`packages/orm/src/services/account/account.ts`). Do not add a field, a route, or a column. Plan 10's post already returns without posting when the guid is blank. This plan passes a blank guid while the visitor is signed out, so the public mbrss-v1 or mb-v1 post waits until login and then uses that sender id.

Reuse the existing boost form defaults in `useLocalSettings` (`apps/web/src/contexts/LocalSettings.tsx`, cookie field `bfd` in `apps/web/src/utils/localSettings/localSettings.ts`). That store already loads and saves `yourName` per value tab. Do not add a store. Do not call the browser `localStorage` API.

## Form rules

New file `packages/v4v-helpers/src/boostFormRules.ts`. Append `export * from './boostFormRules.js';` to `packages/v4v-helpers/src/index.ts`. Do not rewrite that file. Do not add `resolveBoostSenderName`. Do not read `account_profile.display_name` anywhere in this plan.

```typescript
/** A signed-out payment carries no name and no message. A signed-in payment carries the field values, including blanks. */
export const boostFieldsForPayment = (
  isLoggedIn: boolean,
  yourName: string,
  message: string
): { message: string; yourName: string } => {
  if (!isLoggedIn) {
    return { message: '', yourName: '' };
  }
  return { message, yourName };
};

/**
 * Name and message show when MetaBoost is present, or when a node recipient can carry them on a keysend.
 * An lnaddress-only payment with no MetaBoost keeps the existing notice and hides the fields.
 */
export const showBoostNameAndMessageFields = (input: {
  hasLnaddressRecipient: boolean;
  hasNodeRecipient: boolean;
  hasMetaBoost: boolean;
}): boolean => {
  if (input.hasMetaBoost) {
    return true;
  }
  if (input.hasNodeRecipient) {
    return true;
  }
  return !input.hasLnaddressRecipient;
};
```

`boostFormRules.test.ts`:

- `boostFieldsForPayment(false, 'Ada', 'hi')` is `{ yourName: '', message: '' }`.
- `boostFieldsForPayment(true, 'Ada', 'hi')` is `{ yourName: 'Ada', message: 'hi' }`.
- `boostFieldsForPayment(true, '', '')` is `{ yourName: '', message: '' }`.
- `boostFieldsForPayment(true, '  Ada  ', '  ')` returns those same strings. It does not trim, and it does not replace a blank with `Anonymous` or a display name.
- `showBoostNameAndMessageFields` is true for `{ hasMetaBoost: false, hasNodeRecipient: true, hasLnaddressRecipient: true }`, for `{ hasMetaBoost: false, hasNodeRecipient: true, hasLnaddressRecipient: false }`, for `{ hasMetaBoost: true, hasNodeRecipient: false, hasLnaddressRecipient: true }`, and for `{ hasMetaBoost: false, hasNodeRecipient: false, hasLnaddressRecipient: false }`.
- It is false only for `{ hasMetaBoost: false, hasNodeRecipient: false, hasLnaddressRecipient: true }`.

## Form

In `BoostFormBase.tsx`:

- Delete the callout that renders `value.boost_messages.login_required_to_send_boosts`. Do not show it on `creator_only` or `app_only`. Leave the catalog key in place. Do not edit catalogs.
- Submit's `disabled` is `isSubmitting || totalAmountZeroOrLess`. Remove `loggedInAccount === null`.
- Keep the `useState` initializer and the `selectedValueKey` effect that set `yourName` from `boostFormDefaults[selectedValueKey].yourName`. Keep the effect that writes `yourName` back through `setBoostFormDefaults`. Do not add an effect on `loggedInAccount` or `account_profile`. An empty stored name leaves the field empty. The placeholder is already `tMisc('anonymous')` (`Anonymous`) on the name input in `BoostFormFields.tsx`. Leave that placeholder. An empty field sends no name: `boostFieldsForPayment` passes `''`, and plan 10's bLIP builder and `buildMbrssV1CreateBoostRequest` omit a blank `sender_name`. Do not send the word `Anonymous`.
- A signed-out visit still displays a stored name in the disabled field. The payment does not use it. Pass `boostFieldsForPayment(loggedInAccount !== null, yourName, message)` into `useBoostPayments` as `yourName` and `message`.
- Replace `shouldShowBoostMessageNotice` with `showNameAndMessage = showBoostNameAndMessageFields(...)`. `hasLnaddressRecipient` stays `paymentRecipients.some((recipient) => isLnaddressRecipient(recipient.recipient_type ?? ''))`. `hasNodeRecipient` is `paymentRecipients.some((recipient) => recipient.recipient_type === 'node')`. `hasMetaBoost` is `metaBoost !== null`. Pass `showNameAndMessage` into `BoostFormFields`. Render `BoostMessageNotice` when `showNameAndMessage` is false. That is the lnaddress-only, no-MetaBoost case. A node recipient, including one beside an lnaddress recipient, shows the fields so the signed-in keysend can carry them. Plan 10 puts them on the bLIP record and still sends the invoice with no bLIP record.
- Capability fetch stays behind login. `senderGuid` is `loggedInAccount?.sender_guid?.trim() ?? ''`. `fetchEnabled` is `metaBoost !== null && loggedInAccount !== null && senderGuid !== ''`. Pass that trimmed guid, or null when it is empty. A signed-out visit does not send the capability request. A signed-in visit with a blank sender id does not send it either. Do not fetch with an empty `sender_guid` query.
- Pass `mbrssV1SenderGuid` as that same trimmed guid or null. Plan 10 then skips the public post until a signed-in account with a sender id submits.

In `BoostFormFields.tsx`, do not add `requireSignIn`. Keep `isLoggedIn`. Change the `isLoggedIn` prop comment so it says a signed-out visitor can edit the amount, and the name and message stay read-only until Podverse login, including when there is no MetaBoost post. `nameMessageFieldsDisabled` keeps `!isLoggedIn`. On both amount `TextInputNumber` `disabled` expressions, remove `|| !isLoggedIn`. Leave `isSubmitting || hasStatusUpdates`.

In `useBoostPayments.ts` `submitBoost`, delete the `if (!isLoggedIn)` return. Do not replace it with an `app_only` check. `boostPaymentScope` stays a parameter and is unused for that gate. Leave the rate-limit preflight, which already runs only when a sender guid is present. Leave the post calls. Plan 10 skips them without a guid.

## Seed

`tools/web/seed-e2e.mjs` is large. Search for `E2E_LIVESTREAM_FEED_PI_ID` and insert beside those constants. Do not rewrite the file.

- `E2E_BOOST_CHANNEL_ID_TEXT = 'e2eBstCh00001'` (13 characters, inside `nano_id_v2`).
- `E2E_BOOST_FEED_PI_ID = 876543240`. Grep the file for `876543240` first and pick the next free integer if it is taken.
- `E2E_BOOST_SENDER_GUID = '11111111-1111-4111-8111-111111111111'`.
- Export the same channel id from `apps/web/e2e/helpers/seedConstants.ts`.

`resolveSeedAccountId` returns the `e2e-user@example.com` account id from more than one branch. Before every `return` of that id, call a helper that runs:

```sql
INSERT INTO "account_metaboost" (account_id, sender_guid)
VALUES ($1, '11111111-1111-4111-8111-111111111111')
ON CONFLICT (account_id) DO UPDATE SET sender_guid = EXCLUDED.sender_guid
```

Do not set `display_name` on `e2e-user@example.com`. The navbar shows that name. Do not insert `account_profile` for that account. The signed-in spec expects an empty name field because the form does not read a display name.

Add `seedBoostChannelFixture(client)` and call it from the same function that calls `seedLiveAvFixtures` (the call is next to `await seedHlsVodFixture(client)`). The fixture:

- Deletes previous rows for this channel id before insert: `channel_value_recipient` for its `channel_value` rows, then `channel_value`, then `channel_meta_boost`, then `DELETE FROM feed WHERE podcast_index_id =` the new id (the livestream fixture deletes its feed the same way).
- Inserts a feed (`https://e2e-seed-boost.example/podcast.xml`, that podcast index id), `feed_policy` with `parse_allowed`, `public_visible`, and `add_allowed` true, a podcast `channel` titled `E2E Boost Channel`, `channel_about`, a `channel_description`, and a `channel_image`. Copy the column list from the livestream insert in `seedMediaPlayerAndEmbedFixtures` (search `E2E_LIVESTREAM_CHANNEL_ID_TEXT`). No item is required.
- Inserts `channel_meta_boost` with `standard` `mbrss-v1` and `node` `https://metaboost.example/v1/standard/mbrss-v1/boost/e2eBst/`.
- Inserts `channel_value` with `type` `lightning`, `method` `keysend`, `suggested` null. Two `channel_value_recipient` rows: `type` `lnaddress`, `address` `boost@example.com`, `split` 60, `name` `Show`, `fee` false; and `type` `node`, `address` `02e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2`, `split` 40, `name` `Host`, `fee` false.

## Playwright

`apps/web/e2e/boost-signed-out-form.spec.ts`. Follow `apps/web/e2e/podcast-channel-rss-parse-status.spec.ts` for login (`page.request.post` to `http://localhost:4030/api/v2/auth/login` with `e2e-user@example.com` / `Test!1Aa`) and `capturePageLoad` from `e2e/helpers/stepScreenshots.ts`. Top-level `test.describe` title: `Boost form without sign-in`. Test titles are full sentences.

Before `page.goto`, `page.route` any request whose URL starts with `https://metaboost.example/` and fulfill JSON. Count those requests.

```json
{
  "schema": "mbrss-v1",
  "message_char_limit": 500,
  "terms_of_service_url": "https://metaboost.example/terms"
}
```

Open `/podcast/e2eBstCh00001`. Expect one button named `Boost`. Click it. The dialog is named `Boost`.

The amount control is the spinbutton named `Send to Creator`. The name control is the textbox named `Your Name`. The message control is the textbox named `Message`.

Signed-out test: `page.goto` with no login. The spinbutton is enabled, `Your Name` is disabled and empty, `Message` is disabled, the button named `Submit` is enabled, and the text `Log in to use this feature.` is absent. The metaboost route count is 0. Do not click Submit. `capturePageLoad` after those assertions, scrolling to the Submit button.

Signed-in test: log in before `page.goto`, then open the dialog. Wait until `Your Name` is enabled. It is empty, and its placeholder is `Anonymous`. `Message` is enabled. At least one metaboost request has run, and every metaboost request URL contains `sender_guid=11111111-1111-4111-8111-111111111111`. Fill `Your Name` with `Ada`, click `Cancel`, click `Boost` again, and expect `Your Name` to have value `Ada`. That is the boost form defaults cookie. Do not call `localStorage`. Do not click Submit. `capturePageLoad` after the reopened field shows `Ada`, scrolling to that textbox.

Do not add a `/donate` spec. The E2E web env does not set an app Lightning recipient, so that page shows the not-configured sentence instead of the form. `/donate` uses this same `BoostFormBase` path.

## Do not

- Do not change `BoostPaymentProvider`, `sendManualBoost`, or the mbrss-v1 post function from plan 10.
- Do not keep a sign-in return on `app_only` or `creator_only`.
- Do not prefill `account_profile.display_name`.
- Do not call `localStorage`.
- Do not edit `apps/mobile`, `getBoostEligibilityForContent`, or the i18n catalogs.
