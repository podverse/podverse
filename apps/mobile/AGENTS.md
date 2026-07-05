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
- **API client:** reuse `@podverse/helpers-requests` `req*` wrappers with bearer auth — same as web,
  different transport.
- **Playback:** reuse policy from `@podverse/playback-core`; implement a **native** bridge — see
  **mobile-playback** skill and
  [DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-PLAYBACK-QUEUE-PARITY.md).
- **CarPlay / Android Auto:** native layer + native cache contract — see **mobile-carplay-android-auto**
  rule and
  [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md).
- **Native modules:** under `apps/mobile/modules/`, `ios/`, `android/`.
- **E2E:** Maestro or Detox under `apps/mobile/e2e/` — **not** `make e2e_*` (web/management-web only).

## Package import allowlist / denylist

Mobile is a Tier 5 consumer: import **downward** only. Mirror
[DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md §4](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-SHARED-VS-DIVERGENT.md).

| Allowed (mobile-safe)                                  | Forbidden (web/server-only)                                |
| ------------------------------------------------------ | ---------------------------------------------------------- |
| `@podverse/helpers`                                    | `@podverse/ui`                                             |
| `@podverse/helpers-requests`                           | `@podverse/orm`                                            |
| `@podverse/http-request-core`                          | `@podverse/parser`                                         |
| `@podverse/helpers-validation/client`                  | `@podverse/mq`                                             |
| `@podverse/playback-core` (when extracted)               | `@podverse/helpers-backend`                                |
| `@podverse/parser-mapping`                             | `@podverse/helpers-browser`                                |
| `@podverse/v4v-helpers`, `v4v-metaboost`, `v4v-btc-ln` | `@podverse/helpers-config`                                 |
| —                                                      | `@podverse/observability`, `@podverse/external-services-*` |

When implementing a screen: read the matching web route context/hooks first for `req*` and DTO usage;
reuse the same wrappers; do **not** port SCSS, `@podverse/ui`, Next routing, or SSR patterns.
