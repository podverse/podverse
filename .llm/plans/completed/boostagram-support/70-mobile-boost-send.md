**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

## Rows

R1, R7, R26, R43

## Runs after

10, 31

## Files

- apps/mobile/src/lib/boost/albyBoostPaymentProvider.ts
- apps/mobile/src/lib/boost/albyBoostPaymentProvider.test.ts
- apps/mobile/src/lib/boost/mobileBoostRecipients.ts
- apps/mobile/src/lib/boost/mobileBoostRecipients.test.ts
- apps/mobile/src/lib/boost/mobileBoostPaymentDescription.ts
- apps/mobile/src/lib/boost/mobileBoostPaymentDescription.test.ts
- apps/mobile/src/lib/boost/mobileBoostMessageLimit.ts
- apps/mobile/src/lib/boost/mobileBoostMessageLimit.test.ts
- apps/mobile/src/lib/boost/mobileBoostFailureCopy.ts
- apps/mobile/src/lib/boost/mobileBoostFailureCopy.test.ts
- apps/mobile/src/lib/boost/mobileBoostPostNotice.ts
- apps/mobile/src/lib/boost/mobileBoostPostNotice.test.ts
- apps/mobile/src/lib/boost/runMobileManualBoost.ts
- apps/mobile/src/lib/boost/runMobileManualBoost.test.ts
- apps/mobile/package.json
- apps/mobile/package-lock.json
- apps/mobile/vitest.config.ts

`apps/mobile/vitest.config.ts` is a long comment plus an explicit `include` list. Add the test paths and one sentence to the comment. Do not rewrite the comment.

## Tests

Unit only, on the mobile Vitest include list. `npm --prefix apps/mobile run test` is how that suite runs; this plan does not add an API integration test or a Maestro flow. Plan 71 owns the flow.

No new catalog keys. Failure and post results are kinds. Plan 71 turns them into strings that already exist.

## Release scratchpad

none

# Mobile manual boost send

Plan 10 owns `sendManualBoost` and `postMbrssV1BoostAfterLargestSplit`. Plan 31 owns the Alby barrel. This plan is the mobile adapter and the pure send helper the sheet will call. It does not render anything. Plan 71 wires `BoostSheet`.

Import `@podverse/helpers/error` for error parsing. Do not import the `@podverse/helpers` barrel from these files. Import `sendManualBoost` and its types from `@podverse/v4v-btc-ln`, recipient math from `@podverse/v4v-helpers`, and `MetaBoost` plus `resolveBoostExecutionStrategy` from `@podverse/v4v-metaboost`. The runner does not call `postMbrssV1BoostAfterLargestSplit`. Plan 71 passes that call in as `postBoost`. Those packages resolve through `dist`. Do not import their `src/` trees. If a symbol from plan 10 is missing from `dist`, build `@podverse/v4v-btc-ln`, `@podverse/v4v-helpers`, and `@podverse/v4v-metaboost` from the repo root with `npm run build -w <package>` before type-checking. Named exports only.

## Package

In `apps/mobile/package.json`, next to `@podverse/v4v-metaboost`, add:

```json
"@podverse/v4v-btc-ln": "file:../../packages/v4v-btc-ln",
"@podverse/v4v-helpers": "file:../../packages/v4v-helpers",
```

Keep the file-dependency list alphabetical. Then run `npm --prefix apps/mobile install` so `apps/mobile/package-lock.json` updates. Do not run the root Linux lockfile script. Mobile is outside the root workspace. Do not add an Alby SDK, a WebView package, or a Nostr Wallet Connect package.

Add these paths to the `include` array in `apps/mobile/vitest.config.ts`:

- `src/lib/boost/albyBoostPaymentProvider.test.ts`
- `src/lib/boost/mobileBoostRecipients.test.ts`
- `src/lib/boost/mobileBoostPaymentDescription.test.ts`
- `src/lib/boost/mobileBoostMessageLimit.test.ts`
- `src/lib/boost/mobileBoostFailureCopy.test.ts`
- `src/lib/boost/mobileBoostPostNotice.test.ts`
- `src/lib/boost/runMobileManualBoost.test.ts`

Add one sentence to the header comment: the boost send helpers under `src/lib/boost/` map recipients, adapt Alby, and decide when a manual boost posts. Do not reflow the rest of that comment.

## Alby adapter

`createAlbyBoostPaymentProvider` in `albyBoostPaymentProvider.ts` returns a `BoostPaymentProvider`. It imports only `payAlbyInvoice`, `sendAlbyKeysends`, and `AlbyKeysendPayment` from `apps/mobile/src/v4v/alby/index.ts` (relative `../../v4v/alby`). It does not choose lnaddress versus node, and it does not fetch a Lightning Address.

```typescript
export function createAlbyBoostPaymentProvider(): BoostPaymentProvider {
  return {
    payInvoice: async (invoice: string) => {
      await payAlbyInvoice(invoice);
    },
    keysend: async (payment) => {
      const results = await sendAlbyKeysends([
        {
          amountSats: payment.amountSats,
          destination: payment.destination,
          customRecords: payment.customRecords ?? {},
        },
      ]);
      const result = results[0];
      if (result === undefined || result.errorMessage === 'unexpected_result') {
        throw new Error('Alby keysend returned no result.');
      }
      if (result.errorMessage !== null && result.errorMessage.trim() !== '') {
        throw new Error(result.errorMessage);
      }
    },
  };
}
```

`payAlbyInvoice` and `sendAlbyKeysends` already throw `AlbyProviderError` for session, transport, and rejected requests. Let those propagate. A per-recipient `errorMessage` is not a throw from Alby; this adapter throws `Error` with that text so `sendManualBoost` marks the row failed and continues. `unexpected_result` is Alby's sentinel for an unreadable element, not a sentence to show. The empty-result `Error` message is also internal. `mobileBoostFailureCopy` maps both to the generic failed kind.

The test file starts with `vi.mock('../../v4v/alby', ...)` so Expo never loads. The mock exports `payAlbyInvoice` and `sendAlbyKeysends` as `vi.fn()`.

- `payInvoice('lnbc1test')` calls `payAlbyInvoice` with that string and does not call `sendAlbyKeysends`.
- `keysend` with no `customRecords` calls `sendAlbyKeysends` with one element: the same `amountSats`, the same `destination`, and `customRecords` equal to `{}`.
- A result whose `errorMessage` is `null` resolves.
- A result whose `errorMessage` is `invoice expired` rejects with `Error` and that message.
- A missing first result, and a result whose `errorMessage` is `unexpected_result`, both reject with `Error` and message `Alby keysend returned no result.`
- A thrown error from `sendAlbyKeysends` rejects as that same error.

## Recipients

`mobileBoostRecipients.ts`. The sheet passes unmerged value rows. This module never reads `method`.

```typescript
export type MobileBoostValueRecipient = {
  address: string;
  customKey: string | null;
  customValue: string | null;
  name: string | null;
  split: number;
  type: string;
};

export type MobileBoostValueBlock = {
  recipients: readonly MobileBoostValueRecipient[];
  type: string;
};

/** Positive whole sats, or null when the text is not one. */
export function parseBoostSatsAmount(value: string): number | null;

export function lightningRecipientsForBoost(input: {
  channelValues: readonly MobileBoostValueBlock[];
  /** Null when the sheet has no item. An empty array means the item has no value rows. */
  itemValues: readonly MobileBoostValueBlock[] | null;
}): MobileBoostValueRecipient[];

export function manualBoostRecipientsFromLightning(
  recipients: readonly MobileBoostValueRecipient[],
  totalSats: number
): ManualBoostRecipientInput[];
```

`parseBoostSatsAmount` trims. It returns null unless the trimmed text matches `/^[0-9]+$/`, `Number` of that text is an integer from 1 through `Number.MAX_SAFE_INTEGER`. `01` is 1. `0`, `1.5`, `1e2`, `-1`, and `''` are null.

`lightningRecipientsForBoost` keeps blocks whose `type` is `lightning`, in input order, and concatenates their recipients in that order. When `itemValues` is non-null and that item list is non-empty, return the item list. Otherwise return the channel list. An item with only non-lightning blocks falls through to the channel list. This is the same recipient set web pays after it merges lightning rows for display. The merge's `method: 'keysend'` is not an input.

`manualBoostRecipientsFromLightning` calls `calculateRecipientAmounts` from `@podverse/v4v-helpers`. For each row, index `i`:

- `lightningType` is `lnaddress` or `node` when `type` is that string, otherwise null.
- `valueType` is `lightning` when `lightningType` is non-null, otherwise `recipient.type`.
- `id` is `` `${valueType}-${lightningType ?? recipient.type}-${recipient.address}-${i}` ``.
- `recipientType` is `lightningType`.
- `address`, `name`, `customKey`, `customValue` copy across. `customKey` and `customValue` stay null when null.
- `normalizedSplit` is `normalized_split`. `split` is the input split. `finalAmountSats` is `final_amount`.

Tests:

- Item lightning recipients replace channel recipients. Channel recipients are used when the item list is null, empty, or has no lightning block.
- Two channel lightning blocks concatenate in order. A `method` field is not on the input type.
- `parseBoostSatsAmount('1')` is 1, `('01')` is 1, and `('0')`, `('1.5')`, `('1e2')`, `('')` are null.
- 100 sats across splits 60 and 40 produces `finalAmountSats` 60 and 40, and ids `lightning-lnaddress-a@example.com-0` and `lightning-node-02ab-1` when those are the types and addresses.
- A recipient whose `type` is `paypal` gets `valueType` `paypal`, `recipientType` null, and id prefix `paypal-paypal-`.

## Payment description

`mobileBoostPaymentDescription.ts`. Same rule as web's `getMbrssV1PaymentDesc`. Do not import that web file.

```typescript
/** Trimmed message, or `${appName} boost` when the message is blank. */
export function mobileBoostPaymentDescription(message: string, appName: string): string;
```

Tests: `('hello', 'Podverse Next')` is `hello`. `('  hello  ', 'Podverse Next')` is `hello`. `('  ', 'Podverse Next')` and `('', 'Podverse Next')` are `Podverse Next boost`.

## Message limit

`mobileBoostMessageLimit.ts`.

```typescript
export const BLIP0010_BTC_LN_BOOST_MESSAGE_CHAR_LIMIT = 400;

export function mobileBoostMessageMaxLength(
  hasMetaBoost: boolean,
  capability: { messageCharLimit: number | null; status: 'idle' | 'loading' | 'success' | 'error' }
): number | undefined;
```

When `hasMetaBoost` is false, return 400. When `status` is `success` and `messageCharLimit` is a finite number greater than or equal to 0, return `Math.floor(messageCharLimit)`. Otherwise return undefined. The sheet uses 400 only when the channel has no MetaBoost node. A MetaBoost channel waits for capability before it caps the field.

Tests: no MetaBoost is 400. Success with 280 is 280. Success with null, loading, and error are undefined.

## Failure copy

`mobileBoostFailureCopy.ts`. Import `AlbyProviderError` from `../../v4v/alby` and `getErrorCode` from `@podverse/helpers/error`.

```typescript
export type MobileBoostFailureCopy =
  | { kind: 'failed' }
  | { kind: 'invoice_timeout' }
  | { kind: 'not_configured' }
  | { kind: 'provider_message'; message: string }
  | { kind: 'session_ended' };

export function mobileBoostFailureCopy(error: unknown): MobileBoostFailureCopy;
```

- `AlbyProviderError` kind `session_ended` or `not_connected` is `session_ended`.
- Kind `not_configured` is `not_configured`.
- Kind `rejected` with a trimmed `message` is `provider_message` with that trimmed message. A blank message is `failed`.
- Kind `transport` is `failed`.
- `Error` whose message is `Alby keysend returned no result.` is `failed`.
- `getErrorCode(error) === 'ERR_CANCELED'`, or an `Error` message of `canceled` or `Request aborted`, is `invoice_timeout`.
- Any other `Error` with a trimmed message is `provider_message` with that trimmed message.
- Everything else is `failed`.

The test mocks `../../v4v/alby` with a real `class AlbyProviderError extends Error` that stores `kind`. Cover each branch above, including a rejected error with a blank message and a plain `Error('invoice expired')`.

## Post notice

`mobileBoostPostNotice.ts`. Import `MetaboostCapabilityPreflightError`, `MetaboostOwnerTermsNotAcceptedPostError`, `MetaboostSenderBlockedPostError`, and `METABOOST_OWNER_TERMS_NOT_ACCEPTED_CURRENT_CODE` from `@podverse/v4v-metaboost`. Import `getErrorResponseBodyCode` and `getErrorResponseBodyMessage` from `@podverse/helpers/error`.

```typescript
export type MobileBoostPostNotice =
  | { kind: 'capability_already_shown' }
  | { kind: 'owner_terms'; detail: string | null }
  | { kind: 'post_failed'; detail: string | null }
  | { kind: 'sender_blocked'; detail: string | null };

export function mobileBoostPostNotice(error: unknown): MobileBoostPostNotice;
```

- `MetaboostCapabilityPreflightError` is `capability_already_shown`. The sheet already showed the offline dialog inside `onMetaboostUnreachable`.
- `MetaboostSenderBlockedPostError` is `sender_blocked`. `detail` is the trimmed `detailMessage`, or null when that trim is empty.
- `MetaboostOwnerTermsNotAcceptedPostError` is `owner_terms`, with the same detail rule.
- Otherwise, a non-empty `getErrorResponseBodyMessage` is `post_failed` with that message.
- Otherwise, response code `METABOOST_OWNER_TERMS_NOT_ACCEPTED_CURRENT_CODE` is `owner_terms` with `detail` null.
- Otherwise `post_failed` with `detail` null.

Tests construct the three classes and one plain object `{ response: { data: { message: 'nope' } } }`, plus one whose `code` is `owner_terms_not_accepted_current` and whose message is missing.

## Runner

`runMobileManualBoost.ts`. It calls `sendManualBoost`. It does not import the Alby barrel, React, or `request`. The sheet injects the provider, the rate-limit read, and the MetaBoost post.

```typescript
export type RunMobileManualBoostDeps = {
  postBoost: (input: { totalMsat: number }) => Promise<void>;
  provider: BoostPaymentProvider;
  rateLimitStatus: () => Promise<{ allowed: boolean; retryAfterMs: number }>;
};

export type RunMobileManualBoostInput = {
  appName: string;
  appVersion: string | null;
  feedGuid: string | null;
  feedTitle: string | null;
  httpMessagingEnabled: boolean;
  itemGuid: string | null;
  itemTitle: string | null;
  message: string;
  metaBoost: MetaBoost | null;
  onMetaboostUnreachable: () => Promise<void>;
  onRecipientEvent: (event: ManualBoostRecipientEvent) => void;
  recipients: ManualBoostRecipientInput[];
  senderGuid: string | null;
  senderName: string;
};

export type RunMobileManualBoostResult =
  | { outcome: 'rate_limit_check_failed' }
  | { outcome: 'rate_limited'; retryAfterMs: number }
  | { anyRecipientFailed: boolean; outcome: 'sent'; postError: unknown | null };

export async function runMobileManualBoost(
  deps: RunMobileManualBoostDeps,
  input: RunMobileManualBoostInput
): Promise<RunMobileManualBoostResult>;
```

`resolveBoostExecutionStrategy(input.metaBoost)` decides the branch.

- `inMetaboostBranch` is true when `metaBoost` is non-null and (`shouldUseMbrssV1` or `shouldUseMbV1`).
- `shouldPost` is true only when `inMetaboostBranch`, `httpMessagingEnabled`, `shouldUseMbrssV1`, and `senderGuid` trims to a non-empty string. An mb-v1 channel does not post. A blank guid does not post. This plan does not call the mb-v1 donate post.
- When `shouldPost` is true, await `rateLimitStatus` before `sendManualBoost`. `allowed: false` returns `rate_limited` with that `retryAfterMs` and does not pay. A throw returns `rate_limit_check_failed` and does not pay.
- The runner does not know whether the listener is signed in, and it does not read `account_profile.display_name`. It forwards `message` and `senderName`. Plan 71 passes the result of `boostFieldsForPayment`, so a signed-out call arrives with both strings empty and a signed-in call arrives with the field values.
- `paymentDescription` is `mobileBoostPaymentDescription(message, appName)` in the MetaBoost branch, and null otherwise.
- `allowBlipFallback` is false in the MetaBoost branch, and `strategy.allowBlipFallback` otherwise. A channel with a MetaBoost node keeps the listener message on the keysend even when the HTTP post is skipped. An mb-v1 channel still does not post.
- Pass `message` and `senderName` through unchanged. Do not trim them in this function. Do not replace a blank with `Anonymous`. `sendManualBoost` trims `senderName` for the bLIP record. On a signed-in keysend with no MetaBoost post (`paymentDescription` null and `allowBlipFallback` true), that record includes `message` and `sender_name` only when each forwarded string is non-empty. Pass `appName`. Pass `feedGuid`, `feedTitle`, `itemGuid`, and `itemTitle` as `undefined` when null or blank after trim, and as the trimmed string otherwise. Omit `appVersion` when null or blank. Pass `onRecipientEvent` through.
- After `sendManualBoost`, when `shouldPost` is false or `largestSplitSucceeded` is false, return `sent` with `postError` null.
- When both are true, await `postBoost({ totalMsat: result.totalMsat })`. On success, `postError` is null. On throw, `postError` is the caught value. Do not translate it. `anyRecipientFailed` is `result.anyRecipientFailed`.

The caller does not invoke this without a provider. This function does not check Alby.

Tests mock `@podverse/v4v-btc-ln` with `sendManualBoost: vi.fn()`. Use `vi.importActual` only if a type needs it; the value import is the mock. Build a `MetaBoost` as `{ node: 'https://metaboost.example/v1/standard/mbrss-v1/boost/x/', standard: 'mbrss-v1' }` and an mb-v1 twin whose `standard` is `mb-v1` and whose node contains `/standard/mb-v1/`. Default `sendManualBoost` resolves `{ anyRecipientFailed: false, largestSplitRecipientId: 'a', largestSplitSucceeded: true, totalMsat: 1000 }`.

- No MetaBoost, `message` `hello`, `senderName` `Ada`: `sendManualBoost` is called with those two strings, `paymentDescription` null, and `allowBlipFallback` true. `rateLimitStatus` and `postBoost` are not called.
- No MetaBoost, `message` `''`, `senderName` `''`: `sendManualBoost` is called with those empty strings, `paymentDescription` null, and `allowBlipFallback` true. The call does not contain `Anonymous`.
- mbrss-v1, `httpMessagingEnabled` true, guid `abc`: `allowed: false` and `retryAfterMs` 3000 returns `rate_limited` and does not call `sendManualBoost`.
- That same input with `rateLimitStatus` rejecting returns `rate_limit_check_failed` and does not pay.
- That same input with `allowed: true` calls `sendManualBoost` with `allowBlipFallback` false and `paymentDescription` equal to the trimmed message. `postBoost` receives `{ totalMsat: 1000 }`.
- `largestSplitSucceeded: false` does not call `postBoost`. `anyRecipientFailed` passes through.
- `postBoost` rejecting leaves `outcome: 'sent'` and `postError` as that rejection.
- mb-v1 with a guid and `httpMessagingEnabled` true does not call `rateLimitStatus` or `postBoost`. `allowBlipFallback` is false and the description is set.
- mbrss-v1 with `httpMessagingEnabled` false skips the rate limit and the post, and still sets the description and `allowBlipFallback` false.
- A blank `senderGuid` skips the rate limit and the post.
- A blank message in the mbrss branch sets `paymentDescription` to `${appName} boost`.

## Do not

- Do not edit `BoostSheet.tsx`, `useBoostSheet.tsx`, or `boostFormModel.ts`. Plan 71 does the sheet.
- Do not call `sendManualBoost` from a test against the network. Mock it.
- Do not add streaming sats, a phone node, a QR flow, or Nostr Wallet Connect.
- Do not change the MetaBoost server, the mint route, or web's boost files.
- Do not import `resolveLnaddressKeysendDetails`.
