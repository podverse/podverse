**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Rows

R4, R6, R8, R10, R17, R19, R20, R25, R27, R34, R35, R39

## Runs after

none

## Files

- packages/v4v-btc-ln/src/boostPaymentProvider.ts
- packages/v4v-btc-ln/src/sendManualBoost.ts
- packages/v4v-btc-ln/src/sendManualBoost.test.ts
- packages/v4v-btc-ln/src/payments.ts
- packages/v4v-btc-ln/src/index.ts
- packages/v4v-btc-ln/package.json
- packages/v4v-btc-ln/tsconfig.json
- packages/v4v-btc-ln/vitest.config.ts
- package-lock.json
- packages/v4v-metaboost/src/mbrssV1PostBoost.ts
- packages/v4v-metaboost/src/mbrssV1PostBoost.test.ts
- packages/v4v-metaboost/src/index.ts
- apps/web/src/utils/value/webln.ts
- apps/web/src/components/Boost/hooks/useBoostPayments.ts
- apps/web/src/components/Boost/payments/mbrssV1/mbrssV1RequestMetadata.ts
- apps/web/src/components/Boost/payments/boostBlipCustomRecords.ts
- docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md

## Tests

- Add `packages/v4v-btc-ln/src/sendManualBoost.test.ts` (new vitest script on `@podverse/v4v-btc-ln`).
- Add `packages/v4v-metaboost/src/mbrssV1PostBoost.test.ts` (existing `npm run test -w @podverse/v4v-metaboost`).
- No Playwright spec. This change keeps the signed-in web form, its login gate, and the /donate path. A browser run cannot complete WebLN. The signed-out form is plan 11.

## Release scratchpad

Append this when the prompt runs alone. When it runs in a phase with other prompts, put the same entry in the final message under "Release notes entry" and do not edit `release-notes/scratchpad.md`.

```markdown
## Keysend boosts without MetaBoost carry the typed message

- Surfaces: web
- Change: A signed-in keysend with no MetaBoost post includes the typed message and the sender name on the bLIP record when each is non-empty. A Lightning Address invoice still carries no bLIP record. A missing MetaBoost URL skips the public post, and the Lightning payment still runs.
- Who notices: listeners who boost a show that has a lightning node and no MetaBoost tag, and the node that receives that keysend
- Operator steps: none
```

# Shared manual boost send

Web already sends both kinds of Lightning payment from `useBoostPayments` in `apps/web/src/components/Boost/hooks/useBoostPayments.ts` (R4). An `lnaddress` recipient goes through `sendLnaddressPayment` (LUD-16 invoice, then WebLN `sendPayment`). A `node` recipient goes through `sendKeysendPayment` (WebLN `keysend`). That is the v5 path. This plan moves that loop into shared packages behind a provider contract, and points the web hook at a WebLN adapter (R6, R10, R17, R34, R35). It does not add a second payment algorithm.

`resolveLnaddressKeysendDetails` in `packages/v4v-btc-ln/src/lnaddress.ts` is not called by the send path. Leave the function in the package. Do not call it from `sendManualBoost`.

Do not add a dependency from `@podverse/v4v-btc-ln` to `@podverse/v4v-metaboost`. The bLIP action in the lightning package is the string `boost`. The mbrss-v1 post uses `V4V_ACTION_TYPE.BOOST` from `@podverse/v4v-metaboost`, which is the same string. There is no `stream` parameter on either function.

## Provider contract

New file `packages/v4v-btc-ln/src/boostPaymentProvider.ts`. Export it from `packages/v4v-btc-ln/src/index.ts` with `export * from './boostPaymentProvider.js';`.

This is the whole contract a later provider implements. WebLN and Alby are adapters. The boost operation calls only these two methods. It does not know which product is behind them.

```typescript
/** Keysend of a whole number of sats. `customRecords` values are strings, keyed by TLV type. */
export type BoostKeysendPayment = {
  destination: string;
  amountSats: number;
  customRecords?: Record<string, string>;
};

/**
 * Pays one Lightning recipient. `payInvoice` pays a BOLT11 invoice string.
 * `keysend` sends sats to a node pubkey. Both methods are required.
 * A wallet that cannot keysend rejects `keysend` with an Error.
 * There is no enable, login, or connect method here. The app does that
 * before it calls `sendManualBoost`, and it does not call `sendManualBoost`
 * when it has no provider.
 */
export type BoostPaymentProvider = {
  payInvoice: (invoice: string) => Promise<void>;
  keysend: (payment: BoostKeysendPayment) => Promise<void>;
};
```

`sendLnaddressPayment` and `sendKeysendPayment` in `packages/v4v-btc-ln/src/payments.ts` take `provider: BoostPaymentProvider` instead of `WeblnProvider`. Delete the `WeblnProvider` type from that file. `payInvoice` replaces `provider.sendPayment(invoice.pr)`. `sendKeysendPayment` calls `provider.keysend({ destination, amountSats, customRecords })` and no longer checks for a missing `keysend` function. The thrown message `WebLN keysend is not available.` moves to the web adapter below.

Area G writes the Alby adapter. It returns a `BoostPaymentProvider`. Area C's client keeps whatever function names area C chooses. The adapter is the translation. `payInvoice` receives the BOLT11 `pr` string. `keysend` receives sats, not millisats. The adapter does not choose lnaddress versus node, and it does not fetch a Lightning Address.

## Method rule

New file `packages/v4v-btc-ln/src/sendManualBoost.ts`. Export `boostRecipientPaymentMethod` and `sendManualBoost` from `packages/v4v-btc-ln/src/index.ts`.

```typescript
export type BoostRecipientPaymentMethod = 'lnaddress_invoice' | 'node_keysend';

/** `lightning` + `lnaddress` is an invoice. `lightning` + `node` is keysend. Anything else is unpaid. The value-block method attribute is not an input. */
export const boostRecipientPaymentMethod = (
  valueType: string,
  recipientType: string | null
): BoostRecipientPaymentMethod | null => {
  if (valueType !== 'lightning') {
    return null;
  }
  if (recipientType === 'lnaddress') {
    return 'lnaddress_invoice';
  }
  if (recipientType === 'node') {
    return 'node_keysend';
  }
  return null;
};
```

An lnaddress recipient is never sent as keysend. A node recipient is never sent as an invoice. A failed attempt does not retry the other method (R19, R20).

## sendManualBoost

```typescript
export type ManualBoostRecipientInput = {
  id: string;
  valueType: string;
  recipientType: string | null;
  address: string;
  name: string | null;
  customKey: string | null;
  customValue: string | null;
  normalizedSplit: number;
  split: number;
  finalAmountSats: number;
};

export type ManualBoostRecipientEvent =
  | { type: 'paying'; id: string }
  | { type: 'attempt_failed'; id: string; attemptNumber: number; message: string }
  | { type: 'success'; id: string }
  | { type: 'failed'; id: string; error: unknown };

export type SendManualBoostParams = {
  provider: BoostPaymentProvider;
  recipients: ManualBoostRecipientInput[];
  /** LNURL comment. Null on the no-MetaBoost path. */
  paymentDescription: string | null;
  message: string;
  senderName: string;
  allowBlipFallback: boolean;
  appName: string;
  feedGuid?: string;
  feedTitle?: string;
  itemGuid?: string;
  itemTitle?: string;
  onRecipientEvent: (event: ManualBoostRecipientEvent) => void;
};

export type SendManualBoostResult = {
  anyRecipientFailed: boolean;
  /** First recipient in input order among finalAmountSats > 0 with the greatest split. Null when every amount is 0. */
  largestSplitRecipientId: string | null;
  largestSplitSucceeded: boolean;
  totalMsat: number;
};
```

Behavior, matching `useBoostPayments` today:

- `totalMsat` is `Math.max(0, Math.round(totalSats * 1000))`, where `totalSats` is the sum of `finalAmountSats` on rows with `finalAmountSats > 0`. Same expression the hook uses for `totalMsat`.
- Send order is `sortRecipientsBySplitDescending` from `@podverse/v4v-helpers`. Skip `finalAmountSats <= 0` with no event.
- The largest-split id walks the **input** array, not the sorted array. Skip non-positive amounts. Split key is `normalizedSplit`, then `split`. Strict `>` so the earlier input row wins a tie. `largestSplitSucceeded` is true only when that row's payment resolves. A later failure does not clear it. A failure of that row leaves it false. Other rows are still attempted.
- `lnaddress_invoice`: emit `paying`, then `sendLnaddressPayment` with `amountMsat = Math.max(0, Math.round(finalAmountSats * 1000))`, `desc: paymentDescription`, and `onAttemptFailed` emitting `attempt_failed`. Then emit `success`.
- `node_keysend`: emit `paying`, then build the bLIP payload below, then `sendKeysendPayment` with `amountSats = Math.max(0, Math.round(finalAmountSats))` and `destination` equal to `address` (the node pubkey from the feed, not a resolved Lightning Address). Then emit `success`.
- Any other method: throw `new Error('Unsupported recipient type.')`, which the catch turns into `failed`. Do not call the provider.
- On a throw, emit `failed` with the caught value and continue the loop. Set `anyRecipientFailed`. Do not translate, and do not call `t()`. The app maps the error.
- Do not call `onBoostSuccess`, do not post to MetaBoost, and do not touch React state.

bLIP for a node recipient. `MANUAL_BOOST_ACTION` is `'boost'`.

```typescript
const shouldIncludeBlip = paymentDescription !== null || allowBlipFallback;
const blipMessage = buildBlipMessage(paymentDescription, allowBlipFallback, message);
const senderNameForRecord = senderName.trim();
```

When `shouldIncludeBlip` is true, `serializeBlip10Metadata(buildBlip10Metadata({...}))` with `action: 'boost'`, `value_msat_total: totalMsat`, `value_msat: amountMsat`, `app_name: appName`, `sender_name: senderNameForRecord`, `message: blipMessage`, `guid: feedGuid`, `podcast: feedTitle`, `episode: itemTitle`, `episode_guid: itemGuid`, `name: recipient.name ?? undefined`. Do not set `sender_id`, `app_version`, `ts`, `time`, `url`, or `feedID`. `buildBlip10Metadata` omits an empty `sender_name` and an empty `message`. When `shouldIncludeBlip` is false, the payload is null.

Custom records: `buildCustomRecords(blipPayload, recipient.customKey, recipient.customValue)` from `blip10.ts`.

`sendManualBoost` has no `isLoggedIn` parameter. Do not add one, and do not add a method to `BoostPaymentProvider`. The caller passes the strings. Plan 11 passes `message: ''` and `senderName: ''` for a signed-out web submit, and the typed values for a signed-in submit. Do not substitute the word `Anonymous`. Do not read `account_profile.display_name`.

A signed-in keysend with no MetaBoost post is `allowBlipFallback === true` and `paymentDescription === null` (R39). `buildBlipMessage` then returns the trimmed typed message when it is non-empty, and undefined when it is blank. The bLIP record still attaches, with `action` `boost`. It includes `sender_name` and `message` only when those values are non-empty.

A Lightning Address invoice never gets this payload. `lnaddress_invoice` calls `sendLnaddressPayment` with `desc: paymentDescription` and does not pass custom records. When `paymentDescription` is null, that invoice request has no LNURL comment and no bLIP record. When `paymentDescription` is set, the comment is still that description, and there is still no bLIP record.

## WebLN adapter

In `apps/web/src/utils/value/webln.ts`, keep the local window `WeblnProvider` (`enable`, `sendPayment`, optional `keysend`). Add:

```typescript
export const createWeblnBoostPaymentProvider = (
  webln: WeblnProvider
): BoostPaymentProvider => ({
  payInvoice: async (invoice: string) => {
    await webln.sendPayment(invoice);
  },
  keysend: async (payment: BoostKeysendPayment) => {
    if (typeof webln.keysend !== 'function') {
      throw new Error('WebLN keysend is not available.');
    }
    await webln.keysend({
      destination: payment.destination,
      amount: payment.amountSats,
      customRecords: payment.customRecords,
    });
  },
});
```

`useBoostPayments` still calls `ensureWeblnEnabled()`. When that returns null, keep the current path: mark every recipient `failed` with `WebLN wallet not available.` and return before `sendManualBoost`. When it returns a wallet, pass `createWeblnBoostPaymentProvider(webln)` into `sendManualBoost`.

## Web hook

`useBoostPayments` keeps the login return, the mint rate-limit preflight, the mb-v1 branch, the MetaBoost error modals, and `onBoostSuccess`. Plan 11 changes the login return. Do not change it here.

Replace the per-recipient loop and `getLargestSplitRecipient` with `sendManualBoost`. Map each `PaymentRecipient` to `ManualBoostRecipientInput`:

- `valueType: recipient.type`
- `recipientType: recipient.recipient_type ?? null`
- `customKey: recipient.custom_key ?? null`
- `customValue: recipient.custom_value ?? null`
- `normalizedSplit: recipient.normalized_split`
- `split: recipient.split ?? 0`
- `finalAmountSats: recipient.final_amount`
- `address`, `name`, `id` unchanged

`onRecipientEvent` updates React state and the local `finalRecipientStatuses` array the same way the hook does today:

- `paying` and `attempt_failed` call the existing `updateRecipientStatus` / `setLocalRecipientStatus` paying updates. `attempt_failed` appends `message` to `errorDetails`.
- `success` marks success.
- `failed` runs the existing catch body on `event.error` (timeout copy, `PROVIDER_FAILURE_PROP`, retry prefix, dev `console.warn`). Do not rewrite those strings.

Pass `paymentDescription: desc`, `message: effectiveMessage`, `senderName: yourName`, and the same `allowBlipFallback` the hook already computes. Pass feed and item fields from `channel?.podcast_guid`, `channel?.title`, `item?.guid`, `item?.title` (undefined when missing). `appName` is `config.public.brand.name`.

After the call, `anyFailed` is `result.anyRecipientFailed`. The MetaBoost block runs when `shouldPostMetaboostStandard && metaBoost !== null && result.largestSplitSucceeded`, and still requires a non-empty `mbrssV1SenderGuid` before either post. Inside that block, `useMbV1Post` still calls `postMbV1BoostMessage`. Otherwise, when `boostPaymentScope !== 'app_only'`, call `postMbrssV1BoostMessage`. Pass `result.totalMsat` as `metaboostTotalMsat`. The error modal catch stays in the hook.

A missing MetaBoost URL leaves `metaBoost` null. Lightning `node` and `lnaddress` recipients are still paid. Do not call either post when `metaBoost` is null. A blank `mbrssV1SenderGuid` also skips both posts. Plan 11 passes that blank guid for a signed-out visitor. The boost button and the public list are plan 12. Do not change `getBoostEligibilityForContent` here.

Delete `apps/web/src/components/Boost/payments/boostBlipCustomRecords.ts` after nothing imports it.

## mbrss-v1 post

New file `packages/v4v-metaboost/src/mbrssV1PostBoost.ts`. Append `export * from './mbrssV1PostBoost.js';` to `packages/v4v-metaboost/src/index.ts` with a one-line edit. Do not rewrite that file. Area F may append other export lines.

```typescript
export type PostMbrssV1BoostTransport = {
  mintAppAssertion: (params: {
    ingestUrl: string;
    bodyJson: string;
  }) => Promise<{ authorization: string; ingestUrl: string }>;
  postIngest: (params: {
    ingestUrl: string;
    authorization: string;
    bodyJson: string;
  }) => Promise<unknown>;
};

export type PostMbrssV1BoostResult =
  | { posted: false }
  | { posted: true; messageGuid: string };
```

`postMbrssV1BoostAfterLargestSplit` parameters: `largestSplitSucceeded`, `metaBoost: MetaBoost`, `senderGuid: string | null`, `totalMsat`, `appName`, `appVersion?: string`, `feedGuid: string | null | undefined`, `feedTitle: string | null | undefined`, `itemGuid?: string`, `itemTitle?: string`, `message`, `yourName`, `transport`, `onMetaboostUnreachable: () => Promise<void>`.

- Return `{ posted: false }` immediately when `largestSplitSucceeded` is false, or when `senderGuid` is null or trims to empty. Do not call the transport or `onMetaboostUnreachable`.
- Otherwise follow the current body of `postMbrssV1BoostMessage`: `fetchMbrssV1BoostCapability(metaBoost.node, { senderGuid })`; on failure, `await onMetaboostUnreachable()` and throw `new MetaboostCapabilityPreflightError()`.
- Require a trimmed feed guid and feed title, or throw the same `Error` messages the wrapper throws today (`MetaBoost mbrss-v1 boost requires feed_guid` / `feed_title`).
- Build the body with `buildMbrssV1CreateBoostRequest` and `action: V4V_ACTION_TYPE.BOOST`. Set `sender_guid` to `senderGuid`. Pass `appVersion` through when it is non-empty.
- `ingestUrl` for the mint call is `normalizeMetaboostMbrssV1IngestNodeUrl(metaBoost.node)`. POST to `mint.ingestUrl` (the URL the mint response returns), with `mint.authorization` and the JSON string. On a throw from `postIngest`, call `throwKnownMetaboostPostError` and then rethrow.
- When the response fails `isMetaboostMbrssV1CreateBoostResponse`, throw `new Error('Invalid MetaBoost mbrss-v1 response')`.
- One mint and one POST. Do not change the mint route, the ingest JSON fields, or any MetaBoost server (R25, R27).

`postMbrssV1BoostMessage` in `mbrssV1RequestMetadata.ts` becomes the web transport. It still takes its current parameters plus `largestSplitSucceeded: boolean`, builds the transport with `getApiRequestService().reqMetaboostMbrssV1MintAppAssertion` and `request` from `@podverse/helpers-requests` (same headers as today: `Authorization` and `Content-Type: application/json`, `data: bodyJson`), calls `postMbrssV1BoostAfterLargestSplit`, and returns `messageGuid` when `posted` is true. When `posted` is false, return without throwing. Keep `getMbrssV1PaymentDesc` in this file. Keep `WEB_APP_VERSION` as `appVersion`. Do not change `payments/mbV1/mbV1RequestMetadata.ts`.

## Docs

In `docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md`, replace the two bullets that say an lnaddress under `method="keysend"` is resolved through `/.well-known/keysend/<user>` and that the app follows the RSS method. The replacement:

- `type="lnaddress"` is always a Lightning Address invoice (LUD-16, then `payInvoice`). `type="node"` is always keysend to that recipient's address. The send path does not switch a recipient from one method to the other, and it does not call `/.well-known/keysend/`.
- Web pays with a `BoostPaymentProvider` adapter around WebLN (`sendPayment` for invoices, `keysend` for nodes). A later provider implements the same two methods with its own client.

In `## Keysend (bLIP-0010) fallback`, keep the record on TLV `7629169`. Say a signed-in keysend with no MetaBoost post includes the typed message and the sender name on that record when each value is non-empty, and omits each one when it is empty. The record's `action` stays `boost`.

In `## LNAddress behavior when metaBoost is absent`, keep the notice and the payment without message metadata. Add that a Lightning Address invoice carries no bLIP record, with or without MetaBoost.

In the manual test checklist, extend the keysend-without-metaBoost bullet with the typed message and sender name, and extend the LNAddress bullet with no bLIP record.

Leave the rest of that doc's MetaBoost steps (one POST after the largest split succeeds).

## Package test setup

`@podverse/v4v-btc-ln` has no test script. Copy `packages/v4v-helpers/vitest.config.ts` to `packages/v4v-btc-ln/vitest.config.ts`. Add `"test": "vitest run"` and devDependency `"vitest": "^5.1.0"` to match `@podverse/v4v-helpers`. Exclude `**/*.test.ts` from `packages/v4v-btc-ln/tsconfig.json` the way `@podverse/v4v-metaboost` does, so `tsc` does not compile the tests. From the repo root, update the lockfile with `./scripts/development/update-lockfile-linux.sh`.

## Tests to write

`sendManualBoost.test.ts`. Mock with `vi.mock('@podverse/helpers-requests', async () => ({ ...(await vi.importActual('@podverse/helpers-requests')), request }))` so other exports stay. `request` returns `{ status: 200, data: { callback: 'https://ln.example/callback', maxSendable: 100000000000, minSendable: 1000, metadata: '[]', tag: 'payRequest', commentAllowed: 200 } }` when the URL contains `/.well-known/lnurlp/`, and `{ status: 200, data: { pr: 'lnbc1test', routes: [] } }` otherwise.

- `boostRecipientPaymentMethod('lightning', 'lnaddress')` is `lnaddress_invoice`. `('lightning', 'node')` is `node_keysend`. `('lightning', 'paypal')`, `('lightning', null)`, and `('paypal', 'node')` are null.
- An lnaddress recipient of 1 sat calls `payInvoice('lnbc1test')` and never `keysend`.
- A node recipient calls `keysend` with `destination` equal to that address and `amountSats` 1, and does not call `request`.
- A list with a 40% lnaddress row first and a 60% node row second sends the node first, then the invoice. `largestSplitRecipientId` is the node row. `largestSplitSucceeded` is true when both succeed.
- Two rows with the same split: `largestSplitRecipientId` is the earlier input id.
- When the largest recipient's `keysend` rejects, the smaller lnaddress is still paid, `largestSplitSucceeded` is false, and `anyRecipientFailed` is true.
- `finalAmountSats: 0` emits no event and is not the largest row.
- A `valueType` of `paypal` emits `failed` and does not call the provider.
- The node bLIP record under TLV `7629169` has `"action":"boost"`. When `allowBlipFallback` is true, `paymentDescription` is null, `message` is `hello`, and `senderName` is `Ada`, the record has `"message":"hello"` and `"sender_name":"Ada"`. When those two strings are empty, the same record has `"action":"boost"` and does not contain `message`, `sender_name`, or `Anonymous`.
- When `allowBlipFallback` is false, `paymentDescription` is `from-meta`, and `senderName` is `Ada`, the record message is `from-meta` and `sender_name` is `Ada`.
- An lnaddress recipient with `message` `hello`, `senderName` `Ada`, and `paymentDescription` null calls `payInvoice('lnbc1test')`, never calls `keysend`, and none of the `request` URLs contain `comment=`.
- No test uses the word stream as an action, and no call passes `action: 'stream'`.

`mbrssV1PostBoost.test.ts`. Stub `fetch` the way `mbrssV1FetchCapability.test.ts` does, with `schema: 'mbrss-v1'`, a numeric `message_char_limit`, and an https `terms_of_service_url`.

- `largestSplitSucceeded: false` does not call the transport.
- A blank `senderGuid` does not call the transport.
- A success calls `mintAppAssertion` once and `postIngest` once. The JSON has `action: 'boost'`, `sender_guid` equal to the guid, `amount` equal to `totalMsat / 1000`, and `sender_name` when the name is non-empty. It does not contain a stream action.
- A capability `fetch` failure calls `onMetaboostUnreachable` and rejects with `MetaboostCapabilityPreflightError`, and does not mint.

## Do not

- Do not edit `apps/mobile`, `getBoostEligibilityForContent`, `ModalBoost.tsx`, `contexts/Modals.tsx`, or `payments/mbV1/`.
- Do not add `isLoggedIn` to `sendManualBoost` or `BoostPaymentProvider`. Plan 11 blanks the name and message before the hook.
- Do not add streaming sats, a phone node, a QR flow, or Nostr Wallet Connect.
- Do not change the MetaBoost server, the mint route, or the mbrss-v1 JSON field set.
- Do not remove the `isLoggedIn` return in `submitBoost`. That is plan 11.
