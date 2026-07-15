# AI guide — `apps/mobile`

Monorepo-wide rules: [`AGENTS.md`](/AGENTS.md) (repository root).

Contributor guide: [`APPS-MOBILE.md`](/apps/mobile/APPS-MOBILE.md).

- **Stack:** React Native + Expo (prebuild / dev client). This is **not** Next.js — no `next/*`, no
  server components, no SSR, no Playwright.
- **Import specifiers (Tier D):** extensionless relative imports in app source; import `@podverse/*`
  by package name. See
  [DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md § Tier D](/docs/development/tooling/DOCS-DEVELOPMENT-TOOLING-IMPORT-SPECIFIERS.md).
- **Auth:** bearer tokens in secure storage (Keychain/Keystore); **not** cookies. Use
  `AuthContext { mode: 'bearer' }` and `/auth/mobile/*` routes. See
  [API-CLIENT-BOUNDARIES.md](/docs/development/API-CLIENT-BOUNDARIES.md).
- **Config:** `getMobileConfig()` from `src/config/` — sole consumer-facing env boundary
  (`EXPO_PUBLIC_*` literals only in `src/config/env.ts`). Do not read `process.env` in screens
  or auth factories.
- **API client:** reuse `@podverse/helpers-requests` through **`ApiRequestService` instance
  methods** (e.g. `createMobileApiRequestService()?.reqAuthMobileToken(...)`). Standalone `req*`
  helpers in package source are not all re-exported from the barrel. Same bearer auth pattern as
  web, different transport.
- **Helpers / lib:** put generic (non-screen-specific) helpers in `src/lib/` when first written —
  even with one callsite. Prefer domain modules (`src/auth`, `src/config`, …) when the domain owns
  the helper. See **mobile-react-native** rule.
- **Playback:** reuse policy from `@podverse/playback-core`; implement a **native** bridge — see
  **mobile-playback** skill and
  [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md).
- **CarPlay / Android Auto:** native layer + native cache contract — see **mobile-carplay-android-auto**
  rule and
  [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md).
- **Native modules:** under `apps/mobile/modules/`, `ios/`, `android/`.
- **E2E:** Maestro or Detox under `apps/mobile/e2e/` — **not** `make e2e_*` (web/management-web only).
- **Standalone install:** `apps/mobile` is **outside** the root npm workspace. Use
  `npm run mobile:install` (own `package-lock.json` + `.npmrc`). Shared packages via
  `file:../../packages/…`. See **mobile-expo-monorepo** skill. Do not re-add Expo to the root
  lockfile or use symlink / `NODE_PATH` workarounds.

## Package import allowlist / denylist

Mobile is a Tier 5 consumer: import **downward** only. Mirror
[DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md §4](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md).

| Allowed (mobile-safe)                                  | Forbidden (web/server-only)                                |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `@podverse/helpers`                                    | `@podverse/ui` (components, SCSS)                          |
| `@podverse/design-tokens` (RN theme/token maps)        | —                                                          |
| `@podverse/helpers-requests`                           | `@podverse/orm`                                            |
| `@podverse/http-request-core`                          | `@podverse/parser`                                         |
| `@podverse/helpers-validation/client`                  | `@podverse/mq`                                             |
| `@podverse/playback-core`                              | `@podverse/helpers-backend`                                |
| `@podverse/parser-mapping`                             | `@podverse/helpers-browser`                                |
| `@podverse/v4v-helpers`, `v4v-metaboost`, `v4v-btc-ln` | `@podverse/helpers-config`                                 |
| —                                                      | `@podverse/observability`, `@podverse/external-services-*` |

When implementing a screen: read the matching web route context/hooks first for `req*` and DTO usage;
reuse the same wrappers; do **not** port SCSS, `@podverse/ui`, Next routing, or SSR patterns.

## Themes

- Same supported theme IDs as web: `dark`, `light`, `dracula`, `violet`, `ember`, `dawn` (default
  `dark`).
- Import token maps from `@podverse/design-tokens`; wrap app in `ThemeProvider` (`src/theme/`).
- Persist user choice under pref key **`uit`** (same semantics as web `localSettings`).
- Theme labels: i18n `settings.ui_theme.*` — not hardcoded English.
- See **mobile-theme-parity** skill and **styles-source-of-truth** skill (SCSS ↔ design-tokens sync).

## i18n

- Runtime: **i18next** + **expo-localization** (not next-intl).
- Catalog: `packages/i18n-catalog` layered merge (`shared` + `consumer` + `mobile/` overlay).
  Runtime loads `apps/mobile/i18n/compiled/*.json`. See **i18n-catalog-layers** rule.
- Duration display: `@podverse/helpers` `timeFormatter` (same as web).
- Pass localized strings into components; no user-facing copy in shared packages.
- All product UI strings (auth, nav titles, errors/success, labels) must use `useTranslation()` /
  `t()` — no hardcoded English. Prefer existing `shared` / `consumer` keys; mobile-only chrome
  goes in the `mobile/` overlay. See **i18n-user-facing-strings** rule.
  Dev-only / `__DEV__` panels and temporary `...Placeholder` scaffold text are exempt until the
  real screen ships.
