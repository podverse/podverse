**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Rows

R38

## Runs after

11

## Files

- packages/v4v-metaboost/src/boostEligibility.ts
- packages/v4v-metaboost/src/boostEligibility.test.ts
- tools/web/seed-e2e.mjs
- apps/web/e2e/helpers/seedConstants.ts
- apps/web/e2e/boost-eligibility.spec.ts
- makefiles/local/e2e-spec-order-web.txt

## Tests

- Update `packages/v4v-metaboost/src/boostEligibility.test.ts` (existing `npm run test -w @podverse/v4v-metaboost`).
- Add `apps/web/e2e/boost-eligibility.spec.ts`. Register it in `makefiles/local/e2e-spec-order-web.txt` on the line after `apps/web/e2e/boost-signed-out-form.spec.ts`.
- No Maestro flow. Mobile screens already call this function. Areas D and E pass `itemValues` later. This plan does not edit those screens.

## Release scratchpad

Append this when the prompt runs alone. When it runs in a phase with other prompts, put the same entry in the final message under "Release notes entry" and do not edit `release-notes/scratchpad.md`.

```markdown
## Boost shows for a lightning recipient without MetaBoost

- Surfaces: web, mobile
- Change: The boost action shows for a lightning node or Lightning Address recipient even when the channel has no MetaBoost URL. The public received-boost list still needs mbrss-v1. A PayPal-only channel with no MetaBoost standard stays without a Boost button.
- Who notices: listeners on a show that has lightning value recipients and no MetaBoost tag
- Operator steps: none
```

# Boost action eligibility

Plan 10 pays a lightning `node` or `lnaddress` recipient when the MetaBoost URL is missing, and it skips the post. This plan changes the button that opens that form (R38). The public received-boost list is unchanged: `canShowBoostMessagesTab` still needs `mbrss-v1`.

`getBoostEligibilityForContent` in `packages/v4v-metaboost/src/boostEligibility.ts` is the function web and mobile already call. Extend it. Do not add a second function. Do not edit the callers in this plan. A caller that omits `itemValues` keeps the channel value list.

The lightning check uses the item value list when that array is non-empty, and the channel value list otherwise. v4 uses the episode list when it is non-empty and the channel list otherwise. The MetaBoost rule stays on the channel: any `channel_values` row plus standard `mbrss-v1` or `mb-v1` still shows the action, including a PayPal block with MetaBoost. A PayPal-only channel with no MetaBoost standard stays hidden.

## Function

Replace the doc comment and the action decision. Leave the `mbrssMessagesScope` block as it is. Do not read `item_values` off `item`. `item` stays the guid used for the message scope.

```typescript
export type BoostEligibilityRecipient = {
  type: string;
};

export type BoostEligibilityValueBlock = {
  type: string;
  channel_value_recipients?: readonly BoostEligibilityRecipient[] | null;
  item_value_recipients?: readonly BoostEligibilityRecipient[] | null;
};

type BoostEligibilityInput = {
  channel: BoostEligibilityChannel | null;
  item?: BoostEligibilityItem | null;
  itemGuid?: string | null;
  /** Non-empty: lightning check uses this list. Empty or omitted: lightning check uses channel_values. */
  itemValues?: readonly BoostEligibilityValueBlock[] | null;
};

const normalizedType = (value: string): string => value.trim().toLowerCase();

const recipientsOf = (
  block: BoostEligibilityValueBlock
): readonly BoostEligibilityRecipient[] => {
  if (block.channel_value_recipients !== null && block.channel_value_recipients !== undefined) {
    return block.channel_value_recipients;
  }
  if (block.item_value_recipients !== null && block.item_value_recipients !== undefined) {
    return block.item_value_recipients;
  }
  return [];
};

const listHasLightningNodeOrLnaddress = (
  blocks: readonly BoostEligibilityValueBlock[] | null | undefined
): boolean =>
  (blocks ?? []).some((block) => {
    if (normalizedType(block.type) !== 'lightning') {
      return false;
    }
    return recipientsOf(block).some((recipient) => {
      const recipientType = normalizedType(recipient.type);
      return recipientType === 'node' || recipientType === 'lnaddress';
    });
  });
```

Inside `getBoostEligibilityForContent`, after `resolvedStandard` is set:

```typescript
const itemList = itemValues ?? [];
const channelList = channel?.channel_values ?? [];
const effectiveList = itemList.length > 0 ? itemList : channelList;
const hasLightningRecipient = listHasLightningNodeOrLnaddress(effectiveList);
const hasChannelValueRow = channelList.length > 0;
const hasSupportedMetaBoost = resolvedStandard === 'mbrss-v1' || resolvedStandard === 'mb-v1';
```

`canShowBoostAction` is `hasLightningRecipient || (hasChannelValueRow && hasSupportedMetaBoost)`.

`channel_values` on `DTOChannel` and `item_values` on `DTOItem` both match `BoostEligibilityValueBlock`. No type assertion.

Doc comment on the function:

```typescript
/**
 * The boost action shows when the effective value list has a lightning recipient
 * of type `node` or `lnaddress`, or when the channel has any value row and a
 * MetaBoost standard of `mbrss-v1` or `mb-v1`.
 * The effective list is `itemValues` when that array is non-empty, and the channel
 * value rows otherwise.
 * The public message list still requires `mbrss-v1`.
 */
```

## Unit tests

Keep the existing case that has a lightning value, an empty recipient list, standard `mbrss-v1`, and `canShowBoostAction` true. That is the channel-value-row rule.

Replace the second test's title. Its fixture is a lightning value with an empty recipient list and no MetaBoost tag. `canShowBoostAction` stays false. `canShowBoostMessagesTab` is false.

Add:

- Lightning value, recipient type `node`, no `channel_meta_boost`: `canShowBoostAction` true, `canShowBoostMessagesTab` false.
- The same with recipient type `LNAddress`: action true, messages tab false.
- Lightning value, recipient type `paypal`, no MetaBoost tag: action false.
- Value type `paypal`, recipient type `node`, no MetaBoost tag: action false.
- Value type `paypal`, one recipient, standard `mbrss-v1`, and a `podcast_guid`: action true, messages tab true.
- `itemValues` with a lightning `node` recipient, `channel` null: action true, messages tab false.
- The same item list omitted, channel values empty, no MetaBoost tag: action false.
- `itemValues` is `[]`, channel has a lightning `node` and no MetaBoost tag: action true.
- `itemValues` is a non-empty paypal block, channel has a lightning `node` and no MetaBoost tag: action false.
- `itemValues` is a non-empty paypal block, channel has any value row and standard `mb-v1`: action true. Messages tab stays false because the standard is not `mbrss-v1`.

Use the same value-block shape the current test uses (`id`, `method`, `suggested`, `type`, and the recipient array). Put the recipient `type` on `channel_value_recipients` for a channel list and on `item_value_recipients` for `itemValues`.

## Seed

`tools/web/seed-e2e.mjs` is large. Search for `seedBoostChannelFixture` from plan 11 and add two fixtures beside it. Do not rewrite the file. Do not change `e2eBstCh00001`, `e2eBoostCh01`, or `e2eBoostEp01`.

Grep the file before using these ids. If one is taken, pick the next free integer or the next 13-character `e2eBst` id.

- Node channel: `E2E_BOOST_NODE_CHANNEL_ID_TEXT = 'e2eBstNd00001'`, `E2E_BOOST_NODE_FEED_PI_ID = 876543241`, feed URL `https://e2e-seed-boost-node.example/podcast.xml`, title `E2E Boost Node Channel`. Copy the feed, policy, channel, about, description, and image inserts from `seedBoostChannelFixture`. Do not insert `channel_meta_boost`. One `channel_value` of `type` `lightning`, `method` `keysend`, `suggested` null. One `channel_value_recipient`: `type` `node`, `address` `03e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2e2`, `split` 100, `name` `Host`, `fee` false.
- PayPal channel: `E2E_BOOST_PAYPAL_CHANNEL_ID_TEXT = 'e2eBstPp00001'`, `E2E_BOOST_PAYPAL_FEED_PI_ID = 876543242`, feed URL `https://e2e-seed-boost-paypal.example/podcast.xml`, title `E2E Boost PayPal Channel`. Same channel inserts. No `channel_meta_boost`. One `channel_value` of `type` `paypal`, `method` `send`, `suggested` null. One recipient: `type` `paypal`, `address` `host@example.com`, `split` 100, `name` `Host`, `fee` false.

Export both channel ids from `apps/web/e2e/helpers/seedConstants.ts`.

Call both seed functions from the same function that calls `seedBoostChannelFixture`.

## Playwright

`apps/web/e2e/boost-eligibility.spec.ts`. `capturePageLoad` from `e2e/helpers/stepScreenshots.ts`. Login matches plan 11's spec (`page.request.post` to `http://localhost:4030/api/v2/auth/login` with `e2e-user@example.com` / `Test!1Aa`). Top-level `test.describe` title: `Boost action without a MetaBoost tag`. Test titles are full sentences.

The header control is the button named `Boost`. The public-list chip, when present, is also labeled `Boost` inside `getByTestId('podcast-detail-chips')`.

Node channel, signed out, one test: open `/podcast/e2eBstNd00001`. Expect exactly one button named `Boost`. Expect `podcast-detail-chips` to contain no element whose text is `Boost`. Record requests whose URL contains `metaboost` and expect none. Click `Boost`. The dialog is named `Boost`. The spinbutton named `Send to Creator` is enabled. The textbox named `Your Name` is disabled. The textbox named `Message` is disabled. The text `Log in to use this feature.` is absent. Do not click Submit. `capturePageLoad`, scrolling to the `Boost` button, before opening the dialog is enough for the page. After the dialog assertions, `capturePageLoad` scrolling to `Your Name`.

Node channel, signed in, one test: log in before `page.goto`, open the same page, click `Boost`. `Your Name` and `Message` are enabled. That channel has a node recipient and no MetaBoost tag, so the fields are not replaced by the lnaddress notice. Do not click Submit.

PayPal channel, one test: open `/podcast/e2eBstPp00001`. Expect zero buttons named `Boost`. Expect `podcast-detail-chips` to contain no element whose text is `Boost`. `capturePageLoad`, scrolling to `podcast-detail-chips`.

## Do not

- Do not edit `sendManualBoost`, `BoostFormBase.tsx`, or `useBoostPayments.ts`. Plans 10 and 11 own those.
- Do not change `canShowBoostMessagesTab` or `mbrssMessagesScope`.
- Do not edit `apps/mobile` or the i18n catalogs.
- Do not pass `itemValues` from a screen in this plan. Areas D and E do that.
