# CarPlay — entitlement + App Group (operator)

**Master step:** 12.16 (iOS portion). **Audience:** operator / Apple Developer Program Account
Holder (Team Agent).
**Detail:** [395-car-entitlements-declarations](/docs/proposals/mobile/_master-plan_/details/395-car-entitlements-declarations.md).

Unlike Android Auto (DHU works without a Google “entitlement”), **CarPlay audio apps require an
Apple-managed entitlement** before Simulator or a device will treat the app as a CarPlay audio
app. Apple’s docs: without a provisioning profile that includes CarPlay, **Simulator will not
recognize the app**.

> **Portal work is complete** (team already holds the CarPlay audio entitlement; App ID
> `com.podverse.app.next`, `com.apple.developer.carplay-audio`, and App Group
> `group.com.podverse.app.next` are provisioned). The **code wiring is also done** (12.7 / 12.16
> iOS): durable Expo entitlements + CarPlay scene manifest in `app.config.ts`, a
> `PodverseCarPlaySceneDelegate`, and `PodverseNativeCache.appGroupIdentifier` now point at the
> group. Browse+play (12.8–12.10) is the remaining agent work before the Simulator checklist.

App id for the next-gen mobile app: **`com.podverse.app.next`**.

## Goal (what “done” unlocks)

After entitlement + App Group + agent CarPlay scene land, you can run the same ship bar as today’s
Android Auto scaffold:

- Browse **Library** + **Downloads** from the **native cache** with the phone app force-quit / JS
  dead
- Play through the shared `PodverseAudioEngine` (one `AVPlayer`)
- Manual gate: [`CARPLAY-SIMULATOR-CHECKLIST.md`](./CARPLAY-SIMULATOR-CHECKLIST.md)

Full UX parity with old podverse-rn (Podcasts / Music / Queue / History) is a **later** follow-on —
see [car-ux-parity proposals](/docs/proposals/mobile/car-ux-parity/000-OVERVIEW.md). Do **not**
block the first CarPlay simulator proof on that redesign.

## What the agent cannot do

- Submit the CarPlay entitlement request (must be the **Team Agent** / Account Holder on the Apple
  Developer Program team).
- Approve managed capabilities on the Apple account.
- Create App Store Connect / Developer portal App IDs or download provisioning profiles on your
  behalf without account access.

## Operator steps — request the entitlement (do this first)

1. Confirm you are the **Account Holder** (or Team Agent) for the Apple Developer Program team that
   owns `com.podverse.app.next`. Non-agents’ requests are often ignored.
2. Open Apple’s CarPlay contact form: <https://developer.apple.com/contact/carplay/>
3. Request the **CarPlay audio** category entitlement
   (`com.apple.developer.carplay-audio`). Agree to the CarPlay Entitlement Addendum / APIs addendum
   when prompted.
4. Provide:
   - Apple Developer **Team ID**
   - App name / description as a **podcast / music audio player** (media playback; not navigation,
     parking, EV, etc.)
   - Bundle id **`com.podverse.app.next`** (and production Podverse id if you also want CarPlay on
     the shipping app later — request what you intend to ship)
5. Wait for Apple. There is **no published SLA** — reports range from days to months. Chase via
   Developer Support / DTS if silent for weeks.
6. When Apple notifies that the capability is assigned (managed capability on the team), continue
   below.

Official references:

- [Requesting CarPlay Entitlements](https://developer.apple.com/documentation/carplay/requesting-carplay-entitlements)
- [CarPlay Audio App Programming Guide (PDF)](https://developer.apple.com/carplay/documentation/CarPlay-Audio-App-Programming-Guide.pdf)
- [CarPlay Developer Guide](https://developer.apple.com/download/files/CarPlay-Developer-Guide.pdf)
  (Apple Developer download)

## Operator steps — after Apple grants the entitlement

1. **Developer portal → Identifiers → App ID** for `com.podverse.app.next`  
   Enable the **CarPlay Audio** capability (and save).
2. **Create / regenerate a Development (and later Distribution) provisioning profile** that includes
   that App ID with CarPlay. Download and install in Xcode (or let Xcode refresh after capability
   sync).
3. **App Group** (required for cache sharing with a CarPlay scene when JS is dead / scene-only
   launch):
   - Create a group, e.g. `group.com.podverse.app.next` (exact string is operator choice; must match
     code).
   - Enable App Groups on the App ID; add the group to the provisioning profile.
   - Tell the agent the **exact** group id so `PodverseNativeCache.appGroupIdentifier` can move from
     `nil` to that string (today Application Support only — see
     [`NATIVE-CACHE-SPIKE-IOS.md`](./NATIVE-CACHE-SPIKE-IOS.md)).
4. Confirm Xcode signing for the mobile target uses a profile that includes CarPlay (Automatic
   signing often works once the capability is on the App ID; if not, set entitlements path explicitly).
5. Ping the agent to implement / finish **12.7–12.10** at **Android Auto parity scope** (Library +
   Downloads browse + play from native cache), then run
   [`CARPLAY-SIMULATOR-CHECKLIST.md`](./CARPLAY-SIMULATOR-CHECKLIST.md).

## Entitlements.plist (what code will need)

After grant, the app entitlements must include (boolean true):

```xml
<key>com.apple.developer.carplay-audio</key>
<true/>
```

Plus the App Group:

```xml
<key>com.apple.security.application-groups</key>
<array>
  <string>group.com.podverse.app.next</string>
</array>
```

(Exact group string = whatever you created.) Expo prebuild / config plugin wiring is an **agent**
task once the portal IDs exist — do not hand-edit generated `ios/` forever without a durable config
source.

## What already exists in code

- Shared `PodverseAudioEngine` (`AVPlayer` + `MPNowPlayingInfoCenter` + `MPRemoteCommandCenter`)
- Durable native cache write/read (`PodverseNativeCache`) — `appGroupIdentifier` now set to
  `group.com.podverse.app.next` (shared App Group container; CarPlay reads it with JS dead)
- iOS cache read spike (file-level): [`NATIVE-CACHE-SPIKE-IOS.md`](./NATIVE-CACHE-SPIKE-IOS.md)
- **CarPlay scene wired (12.7 / 12.16 iOS):**
  - `app.config.ts` → `ios.entitlements` (`com.apple.developer.carplay-audio`,
    `com.apple.security.application-groups`) + `ios.infoPlist.UIApplicationSceneManifest` (CarPlay
    audio scene → `PodverseCarPlaySceneDelegate`)
  - `PodverseCarPlaySceneDelegate.swift` connects, calls `PodverseNativeCache.debugDump()`, and sets
    a placeholder root template
- **Not yet:** Library/Downloads browse templates (12.8), now-playing + remotes + play (12.9–12.10)

## Recommended sequence (operator + agent)

```text
1. Operator: submit CarPlay audio entitlement request (long pole)     ← you are here
2. Operator: (optional) create App Group id early; send string to agent
3. Agent: implement CarPlay scene + Library/Downloads browse (after or overlapping grant)
4. Operator: regenerate profiles; install entitlements; run Simulator checklist
5. Later: car-ux-parity (Podcasts/Music/Queue/History) — proposals only until then
```

## Verify (operator, after grant + scene)

```bash
# Mobile — confirm entitlement / App Group appear in the built app (paths may vary after prebuild)
npm run mobile:prebuild
rg -n 'carplay-audio|application-groups|CarPlay' apps/mobile/ios
```

Then follow [`CARPLAY-SIMULATOR-CHECKLIST.md`](./CARPLAY-SIMULATOR-CHECKLIST.md).

## Cross-links

- Simulator checklist: [`CARPLAY-SIMULATOR-CHECKLIST.md`](./CARPLAY-SIMULATOR-CHECKLIST.md)
- Android counterpart: [`ANDROID-AUTO-DECLARATION.md`](./ANDROID-AUTO-DECLARATION.md)
- Cache spike: [`NATIVE-CACHE-SPIKE-IOS.md`](./NATIVE-CACHE-SPIKE-IOS.md)
- Engine gate: [`GO-NO-GO.md`](./GO-NO-GO.md)
- Car rule: [mobile-carplay-android-auto](/.cursor/rules/mobile-carplay-android-auto.mdc)
- UX parity proposals (later): [/docs/proposals/mobile/car-ux-parity/000-OVERVIEW.md](/docs/proposals/mobile/car-ux-parity/000-OVERVIEW.md)
