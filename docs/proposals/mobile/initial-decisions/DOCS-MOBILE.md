# Podverse Mobile: Strategy and Recommendations

This directory captures the decision-making for adding the **iOS and Android mobile apps** to the
Podverse stack. It weighs the trade-offs you raised: monorepo vs. a separate repository, React
Native vs. alternatives, the CarPlay / Android Auto background-execution problem, how mobile fits
the `develop → staging → main` release flow, and how to keep LLM-driven (Cursor) development
effective as the codebase grows.

> **Status:** Decision/recommendation docs (not an implementation plan). Nothing here changes code.
> When you are ready to build, turn the recommendation into a plan set under `.llm/plans/active/`.

## The short version

| Question                        | Recommendation                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Monorepo or separate repo?      | **Monorepo**, as a clearly isolated `apps/mobile` workspace with its own toolchain boundary.                                |
| React Native or something else? | **React Native (Expo, with prebuild / dev client)** for ~90–95% of the app.                                                 |
| CarPlay / Android Auto?         | **Hybrid**: RN app + a thin **native** layer for the car experiences and background audio. **One app, not two.**            |
| Offline / local data?           | **Offline-first SQLite** (expo-sqlite + Drizzle) as source of truth; screens read **repositories**, not `req*` directly.    |
| Will it overwhelm Cursor?       | No, if you scope context with `.cursorignore`, app-local `AGENTS.md`, and tiering.                                          |
| Versioning                      | Keep the **shared `X.Y.Z`** version, but give mobile its **own store-release pipeline** decoupled from container promotion. |

## Why these answers (one paragraph each)

- **Monorepo.** You already share DTOs, API contracts, i18n strings, and a single version line.
  Mobile benefits from all of it. The cost is toolchain mixing (Metro/Gradle/CocoaPods next to
  Next/Node), which we contain by isolating the workspace and excluding native build output from
  indexing. See [DOCS-MOBILE-MONOREPO-DECISION.md](DOCS-MOBILE-MONOREPO-DECISION.md).
- **React Native.** Your team is TypeScript/React-first and budget-constrained. RN maximizes reuse
  of skills and shared logic packages. Flutter and Kotlin Multiplatform have better native-car
  stories out of the box but throw away your web/TS leverage. See
  [DOCS-MOBILE-FRAMEWORK-REACT-NATIVE.md](DOCS-MOBILE-FRAMEWORK-REACT-NATIVE.md).
- **CarPlay / Android Auto.** Your past pain — "the app had to be running" — is real and is the
  single most important thing to design around. The honest answer in 2026: the car and
  background-audio surfaces **should be native code** (Swift CarPlay scene + Kotlin Media3
  `MediaLibraryService`), driven by a native foreground service so they work when the JS app is
  suspended or was never opened. You can still ship **one** RN app; the car layer is a native module
  inside it, not a second app. Full detail, including when you would be forced into two apps, is in
  [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md).
- **Offline-first data.** Mobile must work without the network. Use a local SQLite DB as the
  source of truth and sync from the same API in the background. Screens read **repositories**, not
  `req*` directly. Episode **file** downloads are a later layer on the same DB. See
  [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](DOCS-MOBILE-DATA-LAYER-OFFLINE.md).
- **Versioning / release.** Container images promote `develop → staging → main` by retagging the
  same digest. Mobile cannot work that way — App Store / Play Store review gates every release and
  binaries are rebuilt, not retagged. Keep the **same version number** for human sanity, but run a
  parallel mobile release track (internal → TestFlight/Closed testing → production). See
  [DOCS-MOBILE-VERSIONING-RELEASE.md](DOCS-MOBILE-VERSIONING-RELEASE.md).
- **LLM context.** A bigger repo does not inherently overwhelm Cursor, which retrieves relevant
  files rather than loading everything. The risks are (1) indexing huge native build trees and (2)
  cross-toolchain confusion. Both are mitigated. See
  [DOCS-MOBILE-LLM-CONTEXT.md](DOCS-MOBILE-LLM-CONTEXT.md).

## Documents in this set

- [DOCS-MOBILE-MONOREPO-DECISION.md](DOCS-MOBILE-MONOREPO-DECISION.md) — repo structure trade-offs.
- [DOCS-MOBILE-FRAMEWORK-REACT-NATIVE.md](DOCS-MOBILE-FRAMEWORK-REACT-NATIVE.md) — RN vs. Flutter,
  KMP, native, and web wrappers.
- [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md) — the
  background-execution problem and how to get a flawless car experience.
- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](DOCS-MOBILE-DATA-LAYER-OFFLINE.md) — offline-first local DB,
  repository seam, background sync.
- [DOCS-MOBILE-VERSIONING-RELEASE.md](DOCS-MOBILE-VERSIONING-RELEASE.md) — fitting mobile into
  `develop → staging → main` and the app stores.
- [DOCS-MOBILE-LLM-CONTEXT.md](DOCS-MOBILE-LLM-CONTEXT.md) — keeping Cursor effective at scale.

## Related process docs

- [DOCS-MOBILE-PROCESS-OVERVIEW.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-OVERVIEW.md)
- [DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md)
- [DOCS-MOBILE-PROCESS-VISUAL-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-VISUAL-PARITY.md)
  — primitives now, full pixel polish later
- [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](DOCS-MOBILE-DATA-LAYER-OFFLINE.md)

## Related existing docs

- [Architecture](/docs/architecture/ARCHITECTURE.md) — already shows a "Web/Mobile" client.
- [Media player architecture](/.cursor/skills/media-player-architecture/SKILL.md) — the web
  playback policy that the mobile player should mirror in spirit.
- [Staging/main promotion](/docs/development/release/STAGING-MAIN-PROMOTION.md) — the server
  release flow mobile must coexist with.
