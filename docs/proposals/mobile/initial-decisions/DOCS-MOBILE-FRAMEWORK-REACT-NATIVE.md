# Framework choice: React Native vs. the alternatives

**Recommendation: React Native (with Expo, using prebuild / a dev client so you keep full native
access).** It is the best fit for a small TypeScript/React team that wants to grow into a serious
company without funding two full native teams. The one caveat — CarPlay and Android Auto — is real
but solvable with a thin native layer, and it does **not** change this recommendation. That topic
has its own deep dive: [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md).

## Why React Native, specifically for Podverse

- **Skill reuse.** Your team already lives in TypeScript and React. RN is React. The learning curve
  is mostly the mobile platform itself (navigation, native build, store submission), not a new
  language or paradigm.
- **Logic reuse.** RN imports the same `@podverse/*` packages the web app uses — DTOs, API client
  contracts, i18n strings, validation. You do not reimplement business logic per platform.
- **One codebase, two stores.** iOS and Android share ~90–95% of the app. For a small team this is
  the difference between shipping and not shipping.
- **Mature ecosystem for podcast apps.** The hard parts (background audio, lock-screen controls,
  notifications, downloads) have battle-tested libraries — most importantly
  `react-native-track-player`, which already implements a background playback service and has
  Android Auto support, plus a growing CarPlay story.
- **The New Architecture (Fabric/TurboModules) is now the default.** Modern RN has direct,
  synchronous-capable bridges to native code (JSI/TurboModules). Writing the native CarPlay /
  Android Auto modules you need is well-trodden, not exotic.

## What you keep native regardless of framework

This is the key mental model: **CarPlay and Android Auto are native-first platforms.** No
cross-platform framework gives you a fully JS/Dart-driven car experience that works when the app is
suspended. So a small slice of the app is native no matter what you pick. RN lets that slice stay
small while everything else stays shared. See the car doc for exactly how small.

## The alternatives, honestly

### Flutter

- **Pros:** Excellent rendering performance and consistency; strong tooling; good background-audio
  packages (`audio_service` + `just_audio`) with Android Auto and CarPlay support similar in spirit
  to RN's.
- **Cons for you:** Dart, not TypeScript. You throw away web/TS code-sharing and your team's React
  muscle memory. You still drop to native (platform channels) for CarPlay/Android Auto, so it does
  **not** solve the one thing you are worried about — it just changes the language you write the rest
  of the app in. Net: more retraining, less reuse, no car-problem advantage.

### Kotlin Multiplatform (KMP) + native UI

- **Pros:** Best-in-class native car integration (you are already in Kotlin/Swift land); share
  business logic across platforms; truly native UX.
- **Cons for you:** You write UI **twice** (SwiftUI + Jetpack Compose) and share only logic. That is
  closer to the cost of two native apps. Great for a larger team that prioritizes native polish over
  velocity; wrong for a small budget-limited team that values shipping speed and TS reuse.

### Fully native (Swift + Kotlin), two apps

- **Pros:** The gold standard for CarPlay/Android Auto and platform polish; zero framework risk.
- **Cons for you:** Two codebases, two skill sets, roughly double the build/maintenance cost, and
  little reuse with your TS/React web stack. Only justified if the car/native experience is so
  central and so complex that the RN bridge becomes the dominant maintenance burden — see the
  "when you'd be forced into two apps" section of the car doc. For a podcast app, it is not.

### Capacitor / PWA / web wrapper

- **Verdict: not viable for your goals.** CarPlay and Android Auto effectively require native media
  services; a webview wrapper cannot provide a professional car experience or reliable background
  audio. Rule this out for the product you are describing.

## Decision matrix

| Criterion (weighted for a small TS team)   | React Native | Flutter | KMP + native UI | Fully native |
| ------------------------------------------ | ------------ | ------- | --------------- | ------------ |
| Reuse of TS/React skills                   | High         | Low     | Low–Med         | None         |
| Reuse of `@podverse/*` shared logic        | High         | None    | Partial         | None         |
| Single codebase for iOS + Android          | Yes          | Yes     | Logic only      | No           |
| Background audio maturity                  | High         | High    | High (native)   | Highest      |
| CarPlay / Android Auto without native code | No\*         | No\*    | n/a (native)    | n/a (native) |
| Ongoing cost for a small team              | Low          | Med     | High            | Highest      |
| Native polish ceiling                      | High         | High    | Highest         | Highest      |

\* No cross-platform framework avoids native code for the car surfaces; all of them need a native
layer there. RN keeps that layer the smallest fraction of your total app while sharing the most with
your existing stack.

## Recommended RN setup

- **Expo with prebuild (the "bare-but-managed" workflow) and a custom dev client.** You get Expo's
  developer experience, OTA-style update tooling, and config plugins, while retaining the native
  `ios/` and `android/` projects you need for CarPlay and Android Auto modules. Do **not** use a
  pure managed workflow that hides the native projects — you will need them.
- **`react-native-track-player`** for background playback, lock screen / notification controls, and
  the Android Auto media browser baseline.
- **Native modules** (Swift + Kotlin) for the CarPlay scene and the Android Auto `MediaLibraryService`
  content tree, kept under `apps/mobile/modules/` and `apps/mobile/ios|android/`.
- **TypeScript strict**, same lint/format conventions as the rest of the monorepo.

## Bottom line

React Native gives a small TS-first team the most product per dollar while leaving the door fully
open to professional-grade native car experiences through a thin, well-isolated native layer. The
alternatives either cost you your existing leverage (Flutter, KMP, native) or cannot meet the car
requirement at all (web wrappers). Choose RN, and invest deliberately in the native car layer
described next.
