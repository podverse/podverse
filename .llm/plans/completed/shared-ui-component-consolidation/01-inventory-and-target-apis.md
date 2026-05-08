# 01 — Inventory and target APIs

## Prompt (Agent)

Execute **Shared UI component consolidation — phase 01**: finalize per-component inventory,
migration contract (shared primitive vs app wrapper), and target paths under `packages/ui`.
Do not change product behavior in this phase beyond documentation if needed.

## Migration contract (definitions)

| Term                 | Meaning                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Shared primitive** | Under `packages/ui/src/`; framework-agnostic; no embedded user-facing copy (`shared-ui-i18n`); labels via props / `ReactNode`.          |
| **App wrapper**      | In `apps/web` or `apps/management-web`; wires **next-intl**, **next/link**, routing, cookies/session, gates, APIs, domain modal bodies. |
| **Stay app-only**    | Next/Image, URL safety helpers, toast providers, or other app-only deps; may consume shared shells via render props.                    |

## Deliverables (phase 01)

- Appendix tables below are the **single source of truth** for tiering, targets, sources, and
  wrapper split.
- **Blockers** needing product/design sign-off before medium-tier coding:
  1. **Pagination** — single UX: web arrow strip vs management text/previous-next labels.
  2. **Navbar** — slot model (`brand` / `left` / `right` or equivalent) must cover web without
     SCSS forks.

## Appendix A — inventory matrix

Inventory reflects repository layout **2026-05-06**. **Baseline** summarizes existing
`@podverse/ui` surfaces relevant to later phases (partial convergence may already be on branch).

| Family              | Tier   | Shared target (`packages/ui`)                  | Primary web source                                                      |
| ------------------- | ------ | ---------------------------------------------- | ----------------------------------------------------------------------- |
| Accordion           | low    | `components/layout/Accordion/`                 | `apps/web/src/components/Accordian/Accordian.tsx` (+ client if used)    |
| App shell           | high   | none (apps); optional dumb layout only         | `apps/web/src/components/App/AppWrapper.tsx`, `apps/web/src/app/layout.tsx` |
| Callout             | low    | `components/layout/Callout/`                   | `apps/web/src/components/Callout/Callout.tsx`                           |
| Call to action      | low    | `components/layout/CallToActionMessage/`       | `apps/web/src/components/CallToActionMessage/CallToActionMessage.tsx`   |
| Dropdown            | medium | extend `navigation/DropdownMenu` / `form/FormDropdown` | `apps/web/src/components/Dropdown/Dropdown.tsx`, `apps/web/src/components/Dropdown/DropdownMenu.tsx` |
| Footer              | high   | none or slot-only primitive                    | `apps/web/src/components/Footer/Footer.tsx` (+ `FooterBrand`, `FooterCopyright`) |
| Form helpers        | medium | existing `components/form/**` + gaps           | `apps/web/src/components/Form/*.tsx` (field widgets, `InlineForm`, etc.)  |
| Image               | high   | none in ui (Next + helpers)                    | `apps/web/src/components/Image/*.tsx`                                   |
| Link                | high   | none in ui; web `Link.tsx`                     | `apps/web/src/components/Link/Link.tsx`                                 |
| Loading / overlay   | low    | `layout/InlineSpinner/` + new overlay primitive | `apps/web/src/components/LoadingSpinner/LoadingSpinner.tsx`, `LoadingSpinnerOverlay.tsx` |
| Modal               | medium | `components/modal/` shell (new area)           | `apps/web/src/components/Modal/Modal.tsx` + domain modals under `Modal/` and `MediaPlayer/Modal/` |
| More button         | medium | `navigation/MoreButton/` or reuse menu primitives | `apps/web/src/components/MoreButton/MoreButton.tsx`                  |
| Nav arrow button    | medium | `button/IconButton/` + tokens or `navigation/NavArrowButton/` | `apps/web/src/components/NavArrowButton/NavArrowButton.tsx` |
| Navbar              | medium | `navigation/NavBar/`                           | `apps/web/src/components/NavBar/*.tsx`                                  |
| Pagination          | medium | unify with `navigation/Pagination` (+ `CursorPagination` where relevant) | `apps/web/src/components/Pagination/Pagination.tsx`        |
| PopoverIcon         | low    | `components/feedback/PopoverIcon/`           | `apps/web/src/components/PopoverIcon/PopoverIcon.tsx`                   |
| Toast               | high   | none in ui; app `Toast` + providers            | `apps/web/src/components/Toast/*.tsx`                                   |
| VirtualizedList     | low    | `components/layout/VirtualizedList/`          | `apps/web/src/components/VirtualizedList/VirtualizedList.tsx`           |

### Baseline — shared surfaces already present (inform phases 02–03)

- **Accordion:** `@podverse/ui` has `Disclosure` (`components/layout/Disclosure/`) — native
  `<details>` styling; web Accordion adds icon, color/size variants. Decide: extend Disclosure vs new
  `Accordion` folder (phase 02).
- **Dropdown / forms:** `DropdownMenu`, `FormDropdown`, `useDropdownKeyboardNavigation` exported;
  web still has app `Dropdown` composition.
- **Icon / nav:** `IconButton`, `NavBar`, `Pagination`, `CursorPagination`, `ActionLink`, tabs
  primitives.
- **Loading:** `InlineSpinner` exported; overlay component still web-local.
- **Modal:** no shared shell package folder yet; web owns `Modal.tsx` + many domain modals.

## Appendix B — per-family app wrapper focus

Global rule: all **locale-visible** strings and **aria-\*** derived from copy live in apps.

| Family             | Wrapper / app-owned focus (in addition to globals)                                          |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Accordion          | Pass localized `header`/`children`; map product variants (`color`, `size`) at call sites.    |
| App shell          | Providers, themes, analytics, auth/session boundaries, segment/layout route groups.           |
| Callout            | Inner copy, links, and severity messaging from `t()` or CMS-like props.                   |
| Call to action     | CTA label, href/target, optional auth/membership guard before navigation.                   |
| Dropdown           | Menu items, links vs buttons, optional `next/link` for internal routes.                     |
| Footer             | Legal copy, locale-specific links, brand assets.                                            |
| Form helpers       | Validation messages, field labels, submit handlers, podcast/episode domain options.         |
| Image              | `next/image` sizing, PI/image proxy URLs, placeholder/skeleton policy.                      |
| Link               | External vs internal resolution, boost/payment safety helpers as today.                   |
| Loading / overlay  | When to show full-page overlay vs inline; route-level loading tied to app state.           |
| Modal              | Domain forms and API-backed bodies; keep shell dumb, content fat in apps.                   |
| More button        | Menu entries, permissions, “More” label / `aria-label` per surface.                         |
| Nav arrow button   | `aria-label` per direction/context (playlist, episode list).                                |
| Navbar             | Search, auth, membership, theme/locale controls; slot filling only in apps.               |
| Pagination         | URL/query sync policy, total counts from API, membership-gated actions nearby.              |
| PopoverIcon        | Icon choice + tooltip/popover copy; optional help links.                                    |
| Toast              | `react-hot-toast` (or successor) providers, idempotency, membership expiry messaging.      |
| VirtualizedList    | Row render prop with domain cells; overscan and list `data-*` for tests.                    |

## Completion

- Phase 01 inventory and contracts finalized in this file (2026-05-06).
