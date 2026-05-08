# 04 — High-risk feasibility and wrappers

## Prompt (Agent)

Execute **phase 04**: decide what **must** stay in apps vs what can move. Document decisions in
PR description; avoid half-migrations that break Next or security helpers.

---

## PR description (copy for merge notes)

**Shared UI consolidation — phase 04 (high-risk boundaries).** Locks in where shared work stops
so we do not half-migrate Next-specific or security-sensitive UI into `@podverse/ui`. Image and
Toast are **explicitly excluded** from `packages/ui` as typed stacks (see ADR-style notes below).
**Link:** a framework-agnostic **`Link`** primitive now lives in `@podverse/ui` (render-prop
**`LinkComponent`** / **`AnchorComponent`**); **`next/link`** and **`getSafeLinkHref`** stay in app
wrappers — see **`.llm/plans/completed/shared-ui-link-promotion/`**. Modal **shell** may move to
`packages/ui` later; **domain modal bodies** stay in apps.
App shell, Footer, and notifier wiring stay app-owned. These decisions unblock phases 05–07 without
ambiguous scope.

---

## Decision matrix

| Area            | Stays in apps (`apps/web`, `apps/management-web`)                                      | May live in `@podverse/ui` (when ready)                                                                        | Rationale                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| App shell       | `AppWrapper`, root `layout.tsx`, providers, SSR auth, runtime config, media/queue setup | Optional dumb layout primitives (e.g. max-width column) **only** if both apps need them with **no** web imports | Providers and Next boundaries belong in apps; ui must stay framework-agnostic.                                  |
| Image           | `next/image`, proxies, skeletons, `Image.tsx`                                           | None until a **render-prop** `ImagePrimitive` exists; apps supply `renderImage`                                  | Avoid importing Next or asset pipelines into `packages/ui`.                                                    |
| Link            | `getSafeLinkHref`, **`apps/web`** thin wrapper injecting **`next/link`** as **`LinkComponent`** | Framework-agnostic **`Link`** in **`@podverse/ui`** (**`LinkComponent`** / **`AnchorComponent`**)             | Safety and router integration stay app-owned; shared styling and semantics live in ui — **`.llm/plans/completed/shared-ui-link-promotion/`**. |
| Toast           | `Toaster`, `react-hot-toast`, `ToastImpl`, locale                                        | None; **do not** depend on `react-hot-toast` in ui                                                               | Notifier is app-global; copy and provider placement are app concerns.                                            |
| Footer          | `Footer` composition, routes, i18n                                                       | Optional future presentational **sub-blocks** only if management truly matches web chrome (unlikely)           | Product chrome differs by surface; avoid premature extraction.                                                 |
| Modal           | `ModalAuth`, boost/playlist/media modals, domain forms                                   | **Shell only**: overlay, focus trap, close button, heading slots via props (future `components/modal/`)          | Shared shell + app-owned bodies matches **shared-ui-i18n** and security (no API data in ui).                  |

---

## ADR-style exclusions (explicit “not in `packages/ui`”)

### Image — excluded as a concrete component

**Decision:** Do not ship `next/image` or Podverse image helpers inside `packages/ui`.

**Context:** Sizing, proxy URLs, and placeholder behavior are tied to Next and app config.

**Consequences:** Any cross-app image UI uses a **render prop** or app-local wrapper until a
neutral `ImagePrimitive` API is designed.

### Link — framework primitive vs app routing

**Decision:** **`@podverse/ui`** ships a framework-agnostic **`Link`** with **`LinkComponent`** and
**`AnchorComponent`** render props. Do **not** ship **`next/link`** or **`getSafeLinkHref`** inside
**`packages/ui`**.

**Context:** Safe href resolution and SPA vs full-page navigation are application policy.

**Consequences:** **`apps/web`** keeps a thin **`Link`** wrapper that applies **`getSafeLinkHref`**
and passes **`next/link`** as **`LinkComponent`**. Rollout and migration notes:
**`.llm/plans/completed/shared-ui-link-promotion/`**.

### Toast — excluded as a dependency surface

**Decision:** Do not add `react-hot-toast` (or similar) to `packages/ui` dependencies.

**Context:** Toaster placement, lazy loading, and localized strings stay in apps.

**Consequences:** Ui components never call `toast()`; apps invoke notifiers after actions.

---

## Modal split (shared vs app)

| Concern              | `packages/ui` (future shell)                        | Apps                                                                      |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| Focus / overlay      | Trap, scroll lock policy (documented per component) | —                                                                         |
| Labels / titles      | Props only (`aria-labelledby`, `title`, etc.)       | Pass `t(...)` or stable ids                                               |
| Body / forms / flows | —                                                   | Auth, boost, playlists, clip/share, management CRUD confirm               |

---

## Half-migration guardrails (do not)

- Import **`next/*`** or **`next-intl`** inside `packages/ui`.
- Move **`getSafeLinkHref`** or cookie/session helpers into ui.
- Replace app **`Link`** with a ui duplicate that omits safety checks.
- Add **toast** side effects inside ui components.
- Ship **half of a modal** (styles without focus behavior or vice versa).

---

## Completion criteria (phase 04)

- [x] Written follow-up / ADR-style exclusions for Image, Link, Toast (this file).
- [x] Stay-vs-move decisions recorded for App shell, Footer, Modal split.
- [x] No code changes required for phase 04 (documentation-only execution).
