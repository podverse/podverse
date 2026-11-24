**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

More → Value for Value lists Alby and connects or disconnects it. The player placeholder screen stays. No streaming sats, no WebView, no node, no QR, no Nostr Wallet Connect.

## Rows

R11, R16, R18, R33, R36

## Runs after

31

## Files

- `apps/mobile/src/screens/v4v/ValueProvidersScreen.tsx` (new)
- `apps/mobile/src/screens/v4v/AlbyProviderScreen.tsx` (new)
- `apps/mobile/src/navigation/index.tsx` (anchors below; do not read the whole file)
- `apps/mobile/src/navigation/notificationStack.ts` (`resolveMobileDeepLinkState`)
- `apps/mobile/src/navigation/notificationStack.test.ts`
- `apps/mobile/e2e/v4v-providers.yaml` (new)
- `scripts/mobile/dev-e2e.sh`
- `packages/i18n-catalog/mobile/originals/en-US.json`
- `packages/i18n-catalog/mobile/originals/es.json`
- `packages/i18n-catalog/mobile/originals/fr.json`
- `packages/i18n-catalog/mobile/originals/el-GR.json`
- `release-notes/scratchpad.md`

## Tests

- Unit: extend `notificationStack.test.ts` so an Alby callback path does not navigate. Screen behavior stays on Maestro.
- Maestro flow `apps/mobile/e2e/v4v-providers.yaml`, one flow. It proves the More row and the Alby screen mount. It does not complete OAuth.
- Do not edit `apps/mobile/e2e/v4v.yaml`. That flow still opens the player placeholder.

## Release scratchpad

```markdown
## Mobile Value for Value settings connect Alby

- Surfaces: mobile
- Change: when `EXPO_PUBLIC_MOBILE_V4V_ENABLED` is `1`, More shows Value for Value. The listener connects or disconnects Alby in the system browser. The screen shows a sats balance and a Lightning Address. There is no streaming-sats control, no in-app Lightning node, no QR payment, and no Nostr Wallet Connect.
- Who notices: listeners on a build with that flag on and an Alby client id set
- Operator steps: leave `EXPO_PUBLIC_MOBILE_V4V_ENABLED` unset on store builds that must hide this
```

## What the listener sees

The existing full-player control still opens `V4vInfoScreen` (`v4v-info-screen`). Do not edit `V4vInfoScreen.tsx`, `FullPlayerScreen.tsx`, or `FullPlayerActionRow.tsx`. Area E owns that button.

More → Features, only when `getMobileConfig().isV4vEnabled` is true. The row sits after Settings and before OPML, inside the `features` section of `MoreRootScreen` in `apps/mobile/src/navigation/index.tsx` (the `sections` array whose `key` is `features`, around the `more-settings` item).

| Item | Value |
| --- | --- |
| Title | `t('media_player.value_for_value')` (already “Value for Value”) |
| testID | `more-nav-value-providers` |
| Navigates | `MORE_STACK_ROUTES.MoreValueProviders` |

`ValueProvidersScreen` (`testID` `value-providers-screen`)

- Heading `t('media_player.value_for_value')`.
- On mount, `loadAlbyConnection()`. Until it settles, `LoadingSection` (not an empty sentence).
- Then `MenuListScreen` sections from `listValueProviders()` and `getValueProviderConnection`, subscribed with `useSyncExternalStore(subscribeAlbyConnection, getAlbyAccountSnapshot)`.
- Connected keys go in a section titled `t('v4v.section_connected')`. Other keys go in `t('v4v.section_available')`. Omit an empty section.
- The Alby row title is `t('v4v.provider.alby')`. Subtitle is `t('v4v.status_connected')` or `t('v4v.status_not_connected')`. testID `value-provider-row-alby`. Press pushes `MoreValueProviderAlby`.
- Do not add a sender-name field or a lightning-icon switch.

`AlbyProviderScreen` (`testID` `value-provider-alby-screen`)

- Stack title `t('v4v.provider.alby')`.
- Flag off: one sentence `t('v4v.alby.unavailable')`, testID `value-provider-alby-unavailable`. No buttons and no request.
- Flag on: `loadAlbyConnection()` then, when the snapshot is non-null, `refreshAlbyAccount()`. `LoadingSection` until that settles.
- Client id missing (`isAlbyConfigured()` false): sentence `t('v4v.alby.not_configured')`, testID `value-provider-alby-not-configured`. No Connect button.
- Disconnected and configured: `FormActions` with one full-width `Button` `size="form"` label `t('v4v.alby.connect')`, testID `value-provider-alby-connect`. Press calls `connectAlby()`. An in-flight boolean inside the handler ignores a second press. `failed` shows `t('v4v.alby.connect_failed')` in a `Text` with testID `value-provider-alby-error` and `accessibilityLiveRegion="polite"`. `cancelled` shows nothing new. `connected` renders the connected body.
- Connected body: label `t('v4v.alby.lightning_address')` and the address, or `t('v4v.alby.no_lightning_address')` when null. Label `t('v4v.alby.balance')` and `t('v4v.alby.balance_sats', { count })` when `balanceSats` is a number, or `t('v4v.alby.balance_unavailable')` when null. testID `value-provider-alby-balance` on the balance line. Disconnect is a `size="form"` `variant="danger"` button, testID `value-provider-alby-disconnect`.
- Disconnect opens `ConfirmDialog` (`AppOverlay`, not a React Native `Modal`). Title `t('v4v.alby.disconnect_title')`, body `t('v4v.alby.disconnect_body')`, confirm `t('v4v.alby.disconnect')` with `confirmVariant="danger"`, cancel `t('misc.cancel')`. testIDs `value-provider-alby-disconnect-dialog`, `value-provider-alby-disconnect-confirm`, `value-provider-alby-disconnect-cancel`. Confirm calls `disconnectAlby()` and returns to the disconnected body.
- `refreshAlbyAccount` throwing `session_ended` clears the connected body and opens a one-button dialog: title `t('v4v.alby.session_ended_title')`, body `t('v4v.alby.session_ended_body')`, cancel `t('misc.ok')`, testID `value-provider-alby-session-ended`.
- A `transport` error while refreshing keeps the last snapshot and shows `t('v4v.alby.refresh_failed')` on `value-provider-alby-error`.
- Use `MobileScreenContainer`, `Card`, and `settingsCardInnerGap` for the stacked lines. Buttons sit in `FormActions` with `formActionsTopGap`. No fiat line.

`navigateToAlbyProvider` in `apps/mobile/src/navigation/index.tsx`, next to `navigateToMembershipScreen`:

```ts
export function navigateToAlbyProvider(): void {
  if (!rootNavigationRef.isReady()) {
    return;
  }
  rootNavigationRef.navigate(ROOT_STACK_ROUTES.MainTabs, {
    screen: 'More',
    params: { initial: false, screen: MORE_STACK_ROUTES.MoreValueProviderAlby },
  });
}
```

`initial: false` leaves More’s root under the Alby screen. This does not dismiss a root card. Area G closes the full player, then calls this.

## Navigation edits

Search in `apps/mobile/src/navigation/index.tsx`, then edit those windows. Do not page through the file.

- `MORE_STACK_ROUTES`: add `MoreValueProviders: 'MoreValueProviders'` and `MoreValueProviderAlby: 'MoreValueProviderAlby'`.
- `moreTabLinkScreens`: `MoreValueProviders: 'more/value-providers'`, `MoreValueProviderAlby: 'more/value-providers/alby'`.
- `MoreStackParamList`: both routes `undefined`.
- Import the two screens beside the other `screens/v4v` and `screens/more` imports.
- Register both `MoreStack.Screen`s beside `MoreSettings`. Titles from `t('media_player.value_for_value')` and `t('v4v.provider.alby')`.
- `MoreRootScreen` features items, as above.
- Pending deep-link effect in `MobileTabNavigator` (the `useEffect` that calls `resolveMobileDeepLinkAction`): if `isAlbyOAuthCallbackPath(pendingDeepLinkUrl)`, call `onConsumePendingDeepLink()` and return. Do not `navigate` to `MainTabs`. Import `isAlbyOAuthCallbackPath` from `../v4v/alby/albyProtocol`.

`resolveMobileDeepLinkState` in `notificationStack.ts`: if `isAlbyOAuthCallbackPath(path)`, return `undefined` before the home fallback. A callback URL must not become a Home navigation. Add a test that `resolveMobileDeepLinkAction('podverse-next://alby/callback?code=1&state=2', options)` is `undefined`, using the existing `options` object in that describe.

Login uses `openAuthSessionAsync` from plan 31. Do not add a WebView screen.

## Catalog

New keys only in `packages/i18n-catalog/mobile/originals/`. Do not edit `overrides/` or `compiled/`. Do not duplicate `media_player.value_for_value` or `misc.cancel` or `misc.ok`. Insert a top-level `v4v` object. Reuse is a search: if a key path already exists in `consumer` or `shared`, use it instead of adding it here.

English (`en-US.json`):

```json
"v4v": {
  "section_connected": "Connected",
  "section_available": "Available",
  "status_connected": "Connected",
  "status_not_connected": "Not Connected",
  "provider": {
    "alby": "Alby"
  },
  "alby": {
    "connect": "Connect",
    "disconnect": "Disconnect",
    "disconnect_title": "Disconnect Alby",
    "disconnect_body": "This phone will no longer send boosts from this Alby wallet.",
    "not_configured": "Alby is not configured on this build.",
    "unavailable": "Value for Value is not available on this build.",
    "lightning_address": "Lightning Address",
    "no_lightning_address": "This Alby wallet has no Lightning Address.",
    "balance": "Balance",
    "balance_sats": "{count} sats",
    "balance_unavailable": "Balance is unavailable right now.",
    "connect_failed": "Could not connect to Alby. Please try again.",
    "refresh_failed": "Could not refresh the Alby wallet. Please try again.",
    "session_ended_title": "Alby Disconnected",
    "session_ended_body": "The Alby session ended. Connect again to send boosts."
  }
}
```

Same keys in `es.json`, `fr.json`, and `el-GR.json`. Brands and “Lightning” stay as written. Other languages use their own capitalization, not English title case.

Spanish:

- Connected / Available / Not Connected: Conectado / Disponible / No Conectado
- Connect / Disconnect / Disconnect Alby: Conectar / Desconectar / Desconectar Alby
- disconnect_body: Este teléfono ya no enviará boosts desde esta billetera de Alby.
- not_configured: Alby no está configurado en esta compilación.
- unavailable: Value for Value no está disponible en esta compilación.
- Lightning Address: Dirección Lightning
- no_lightning_address: Esta billetera de Alby no tiene una dirección Lightning.
- Balance: Saldo
- balance_sats: `{count} sats`
- balance_unavailable: El saldo no está disponible en este momento.
- connect_failed: No se pudo conectar con Alby. Inténtalo de nuevo.
- refresh_failed: No se pudo actualizar la billetera de Alby. Inténtalo de nuevo.
- session_ended_title: Alby Desconectado
- session_ended_body: La sesión de Alby terminó. Conéctate de nuevo para enviar boosts.

French:

- Connecté / Disponible / Non connecté
- Connecter / Déconnecter / Déconnecter Alby
- disconnect_body: Ce téléphone n’enverra plus de boosts depuis ce portefeuille Alby.
- not_configured: Alby n’est pas configuré sur cette version.
- unavailable: Value for Value n’est pas disponible sur cette version.
- Adresse Lightning
- no_lightning_address: Ce portefeuille Alby n’a pas d’adresse Lightning.
- Solde
- `{count} sats`
- balance_unavailable: Le solde est indisponible pour le moment.
- connect_failed: Impossible de se connecter à Alby. Veuillez réessayer.
- refresh_failed: Impossible d’actualiser le portefeuille Alby. Veuillez réessayer.
- session_ended_title: Alby déconnecté
- session_ended_body: La session Alby est terminée. Connectez-vous à nouveau pour envoyer des boosts.

Greek:

- Συνδεδεμένο / Διαθέσιμο / Μη συνδεδεμένο
- Σύνδεση / Αποσύνδεση / Αποσύνδεση Alby
- disconnect_body: Αυτό το τηλέφωνο δεν θα στέλνει πλέον boosts από αυτό το πορτοφόλι Alby.
- not_configured: Το Alby δεν έχει ρυθμιστεί σε αυτή την έκδοση.
- unavailable: Το Value for Value δεν είναι διαθέσιμο σε αυτή την έκδοση.
- Διεύθυνση Lightning
- no_lightning_address: Αυτό το πορτοφόλι Alby δεν έχει διεύθυνση Lightning.
- Υπόλοιπο
- `{count} sats`
- balance_unavailable: Το υπόλοιπο δεν είναι διαθέσιμο αυτή τη στιγμή.
- connect_failed: Δεν ήταν δυνατή η σύνδεση με το Alby. Δοκιμάστε ξανά.
- refresh_failed: Δεν ήταν δυνατή η ανανέωση του πορτοφολιού Alby. Δοκιμάστε ξανά.
- session_ended_title: Το Alby αποσυνδέθηκε
- session_ended_body: Η συνεδρία Alby έληξε. Συνδεθείτε ξανά για να στείλετε boosts.

Run `npm run i18n:compile` from the repo root so the app picks up the keys. Do not commit `apps/mobile/i18n/compiled/`.

## Maestro

`scripts/mobile/dev-e2e.sh` already defaults `EXPO_PUBLIC_MOBILE_V4V_ENABLED` to `1`. Add next to that line:

```bash
export EXPO_PUBLIC_ALBY_OAUTH_CLIENT_ID="${EXPO_PUBLIC_ALBY_OAUTH_CLIENT_ID:-e2e-alby-client}"
```

and echo it with the other E2E vars. `e2e-alby-client` is a placeholder so the Connect button mounts. It is not a registered Alby client. The flow must not tap Connect.

`apps/mobile/e2e/v4v-providers.yaml`:

```yaml
appId: com.podverse.app.next
name: V4V Providers
---
# More → Value for Value → Alby, signed out. Connect is visible because the E2E
# Metro process sets a placeholder Alby client id. Do not tap Connect.

- runFlow: shared/launch-and-connect.yaml
- tapOn:
    id: tab-more
- assertVisible:
    id: more-screen
- scrollUntilVisible:
    element:
      id: more-nav-value-providers
    direction: DOWN
    timeout: ${TIMEOUT_FAST}
- tapOn:
    id: more-nav-value-providers
- assertVisible:
    id: value-providers-screen
- assertVisible:
    id: value-provider-row-alby
- tapOn:
    id: value-provider-row-alby
- extendedWaitUntil:
    visible:
      id: value-provider-alby-screen
    timeout: ${TIMEOUT_FAST}
- assertVisible:
    id: value-provider-alby-connect
```

Use `${TIMEOUT_FAST}` only. No new timeout numbers.

## Out of scope

Do not change the boost sheet, the player button, or `v4v.yaml`. Do not add a streaming-sats row, a WebView, a QR, a node, or a second provider. Sending a payment is area G, through `sendAlbyKeysends` and `payAlbyInvoice`.
