# Mobile in the monorepo vs. a separate repo

**Recommendation: keep mobile in the Podverse monorepo**, as an isolated `apps/mobile` workspace
with its own toolchain boundary and indexing rules. Reach for a separate repo only if the mobile
build pipeline starts materially slowing down or destabilizing the server CI, and even then prefer
fixing isolation first.

## Why the monorepo wins for a small team

The whole point of the Podverse monorepo is that "everything the tech stack needs" lives together
(minus the external GitOps repo). Mobile leans on the same foundations the web app already uses:

- **Shared DTOs and types** from `@podverse/helpers` — the mobile client consumes the exact same
  request/response shapes the API produces, with no copy-paste drift.
- **API client contracts** — see [API client boundaries](/docs/development/API-CLIENT-BOUNDARIES.md).
  Mobile is "just another client" of the same boundary.
- **i18n strings** — one translation source instead of a second, divergent catalog.
- **One version line** — your `X.Y.Z` bump already fans out across every workspace
  (`scripts/publish/bump-version.sh`). Mobile inherits the same number for free.
- **Atomic cross-cutting changes** — a DTO change plus its web and mobile consumers land in one PR,
  reviewed together, instead of a multi-repo dance with version pinning between them.
- **One set of conventions** — the `.cursor` rules, lint config, and AGENTS guidance you already
  maintain apply to mobile too.

For a small, budget-conscious team, the multi-repo tax (publishing internal packages, syncing
versions across repos, duplicated CI, "which repo is this bug in?") is exactly the overhead you want
to avoid.

## The real costs (and how we contain each)

| Cost                                            | Containment                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| Metro / Gradle / CocoaPods next to Next/Node    | Isolate in `apps/mobile`; do not couple it to the Node build order.         |
| Large native build output (`ios/Pods`, `.gradle`) | Add to `.gitignore` and `.cursorignore` so it is never committed or indexed. |
| iOS builds need macOS CI runners                | Separate workflow with macOS runners; do not block server CI on it.         |
| Different test stack (Detox/Maestro vs. Playwright) | Keep mobile E2E in its own job; do not fold into web Playwright targets.    |
| Lockfile churn / native dep platform binaries   | Mobile deps live in the mobile workspace; review lockfile diffs as usual.   |

The recurring theme: **isolation, not separation.** Mobile shares source-level packages but does
*not* share the build graph, the test runner, or the CI critical path with the servers.

## Recommended workspace shape

```
apps/
  mobile/                 # the React Native (Expo) app — its own toolchain
    app/                  # screens / navigation (TS, shared logic via @podverse/*)
    ios/                  # native iOS project (CarPlay scene lives here)
    android/              # native Android project (Android Auto service lives here)
    modules/              # native modules bridging RN <-> car/background audio
    APPS-MOBILE.md        # app-local AGENTS-style guide + toolchain notes
packages/
  helpers/                # already shared: DTOs, types
  ...                     # mobile imports the same @podverse/* packages as web
```

Keep `apps/mobile` **out of** the root Node `build:packages` / app build order. It builds with its
own commands (`expo`, `gradle`, `xcodebuild`) so a broken native build never blocks API/web CI, and
`npm run build:packages` never tries to compile native code.

### Architecture tiering

Mobile is a **top-tier consumer**, like the web apps: it may depend on `@podverse/helpers` and other
lower-tier packages, but nothing lower-tier may depend on mobile. This matches the existing tier
rule (lower tiers cannot depend on higher). Do not let shared packages import anything React-Native-
specific; keep RN-only code inside `apps/mobile`.

## When a separate repo would actually be justified

Be honest about the exit criteria so the decision is reversible:

1. **CI contention you cannot isolate** — if mobile builds repeatedly destabilize or slow server
   releases despite separate workflows.
2. **Divergent release ownership** — if a different team owns mobile with its own cadence and access
   model, and the coupling causes more coordination cost than the sharing saves.
3. **Repo size genuinely degrades tooling** — if clone/index times become painful even after
   `.cursorignore` and shallow/native exclusions.

None of these apply to a small team at the start. Start in the monorepo; revisit only with evidence.

## Migration path if you ever split

Because mobile only consumes `@podverse/*` at the source level, splitting later is mechanical:
publish the shared packages to a registry (or use a Git submodule), move `apps/mobile` to its own
repo, and pin the package versions. Designing the dependency direction cleanly now (mobile depends
on shared, never the reverse) keeps that door open without committing to it today.

## Bottom line

Monorepo, isolated workspace, off the server build/CI critical path. You get maximum reuse and one
version line with minimal blast radius, and you keep the option to split later if the evidence ever
demands it.
