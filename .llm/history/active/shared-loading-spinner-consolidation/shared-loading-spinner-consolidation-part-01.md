# shared-loading-spinner-consolidation

**Started:** 2026-05-06  
**Author:** Agent  
**Context:** Plan-only session. Author plan files for moving `LoadingSpinner` /
`LoadingSpinnerOverlay` from `apps/web` into `@podverse/ui`, subsuming the existing
`@podverse/ui` `InlineSpinner` into a `size="inline"` variant on the new
`LoadingSpinner`, and removing `LoadingText` in favor of `LoadingSpinner` across
`apps/management-web`.

### Session 1 - 2026-05-06

#### Prompt (Developer)

We want to standardize on using LoadingSpinner from podverse web as the standard loading
spinner everywhere. You do not need to change existing loading spinner behavior in web
but I need you to move LoadingSpinner into its own packages/ui component and then import
it wherever it is needed, AND we should not use the LoadingText component at all
anymore. We always want to use LoadingSpinner and we do not want to use LoadingText.
Create and save plan files locally for this scope of work so we can defer the work to
later.

#### Prompt (Developer)

create and save the plan files locally

#### Key Decisions

- Confirmed via clarifying questions that `LoadingSpinnerOverlay` will also move to
  `@podverse/ui`, and that `InlineSpinner` will be subsumed into the new shared
  `LoadingSpinner` (via `size="inline"`).
- Per the [shared-ui-i18n](../../../.cursor/rules/shared-ui-i18n.mdc) rule, the shared
  `LoadingSpinner` will not import `next-intl`; apps pass an `ariaLabel` prop with the
  localized "Loading…" string. A `decorative` prop (or implicit `aria-hidden` on
  inline) preserves the current `InlineSpinner` accessibility behavior for
  spinner-next-to-text usage.
- Pixel sizes preserved from the existing web `LoadingSpinner`: `small=18`,
  `medium=32`, `large=48`. Default size remains `medium`.
- `LoadingSpinnerOverlay` keeps its `--sidebar-desktop-width` offset; consumer apps
  must define that CSS variable (web already does).
- Plan split into four numbered prompts: shared component creation, web migration +
  deletion, management-web migration + removal of `LoadingText`/`InlineSpinner`,
  verification + archival.

#### Files Created/Modified

- `.llm/history/active/shared-loading-spinner-consolidation/shared-loading-spinner-consolidation-part-01.md`
- `.llm/plans/active/shared-loading-spinner-consolidation/00-SUMMARY.md`
- `.llm/plans/active/shared-loading-spinner-consolidation/00-EXECUTION-ORDER.md`
- `.llm/plans/active/shared-loading-spinner-consolidation/COPY-PASTA.md`
- `.llm/plans/active/shared-loading-spinner-consolidation/01-shared-ui-loading-spinner.md`
- `.llm/plans/active/shared-loading-spinner-consolidation/02-web-migration.md`
- `.llm/plans/active/shared-loading-spinner-consolidation/03-management-web-and-inline-spinner-removal.md`
- `.llm/plans/active/shared-loading-spinner-consolidation/04-verification-and-followups.md`

### Session 2 - 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-loading-spinner-consolidation/COPY-PASTA.md:13

#### Key Decisions

- Added **`LoadingSpinner`** (`size` includes **`inline`** … **`large`**, **`ariaLabel`** /
  **`decorative`**, `FaSpinner` from **`react-icons/fa6`**) and **`LoadingSpinnerOverlay`**
  (reuses **`LoadingOverlay`** layout SCSS + sidebar **`overlayShell`**, required **`ariaLabel`**
  passed to inner **`LoadingSpinner`**).
- Exported **`LoadingSpinner`**, **`LoadingSpinnerProps`**, **`LoadingSpinnerSize`**,
  **`LoadingSpinnerOverlay`**, **`LoadingSpinnerOverlayProps`** from **`packages/ui/src/index.ts`**.
- Did not change **`apps/web`** call sites, **`InlineSpinner`**, **`LoadingText`**, or existing web
  **`LoadingSpinner`** files (per prompt **02**/**03**).

#### Files Created/Modified

- `packages/ui/src/components/layout/LoadingSpinner/**`
- `packages/ui/src/components/layout/LoadingSpinnerOverlay/**`
- `packages/ui/src/index.ts`
- `.llm/plans/active/shared-loading-spinner-consolidation/COPY-PASTA.md`
- `.llm/history/active/shared-loading-spinner-consolidation/shared-loading-spinner-consolidation-part-01.md`

### Session 3 - 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-loading-spinner-consolidation/COPY-PASTA.md:19

#### Key Decisions

- Migrated remaining **`apps/web`** **`LoadingSpinner`** / **`LoadingSpinnerOverlay`** call sites to **`@podverse/ui`** with **`ariaLabel`** from **`misc`** (or **`decorative`** for inline / duplicated-announcement cases).
- **`loading_your_content`** overlays use matching **`ariaLabel`** and **`message`**.
- Deleted app-local **`apps/web/src/components/LoadingSpinner/**`** and **`apps/web/src/styles/components/LoadingSpinner/**`**.

#### Files Created/Modified

- `apps/web/src/app/add-by-rss/**` (multiple `*PageClient.tsx`)
- `apps/web/src/app/email-change-verifying/EmailChangeVerifyingPageClient.tsx`
- `apps/web/src/app/verify-email/VerifyEmailPageClient.tsx`
- `apps/web/src/components/AddByRSS/List/AddByRSSListClient.tsx`
- `apps/web/src/components/Boost/BoostRecipientStatusList.tsx`
- `apps/web/src/components/Boost/messages/BoostMessagesSection.tsx`
- `apps/web/src/components/Form/SwitchButton.tsx`
- `apps/web/src/components/Image/ImageNonReact.tsx`
- `apps/web/src/components/LazyLoadPlaceholder/LazyLoadPlaceholder.tsx`
- Deleted `apps/web/src/components/LoadingSpinner/LoadingSpinner.tsx`
- Deleted `apps/web/src/components/LoadingSpinner/LoadingSpinnerOverlay.tsx`
- Deleted `apps/web/src/styles/components/LoadingSpinner/LoadingSpinner.module.scss`
- Deleted `apps/web/src/styles/components/LoadingSpinner/LoadingSpinnerOverlay.module.scss`
- Moved `.llm/plans/active/shared-loading-spinner-consolidation/02-web-migration.md` → `.llm/plans/completed/shared-loading-spinner-consolidation/02-web-migration.md`
- ESLint **`lint:fix`** on **`apps/web`** (import sort across touched files)
- `.llm/plans/active/shared-loading-spinner-consolidation/COPY-PASTA.md`
- `.llm/history/active/shared-loading-spinner-consolidation/shared-loading-spinner-consolidation-part-01.md`

### Session 4 - 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-loading-spinner-consolidation/COPY-PASTA.md:25

#### Key Decisions

- Replaced all **`LoadingText`** / **`InlineSpinner`** usage in **`apps/management-web`** with **`LoadingSpinner`** (**`ariaLabel`** from the same translation keys; **`size="small"`** for inline list/table placeholders; default **`medium`** for full-page early returns; **`size="inline"`** **`decorative`** next to delete-modal copy in **`StoragePageClient`**).
- Removed **`LoadingText`** and **`InlineSpinner`** from **`packages/ui`** (components + **`index.ts`** exports).
- Updated **`reusable-components`** skill and **`management-web-prefer-shared-ui`** rule to reference **`LoadingSpinner`**.
- **`management-storage-object-detail-ux`** plan wording updated from **`LoadingText`** to **`LoadingSpinner`** for the unchanged-metadata path.

#### Files Created/Modified

- `apps/management-web/src/app/page.tsx`
- `apps/management-web/src/app/(management)/**` (multiple page clients)
- `apps/management-web/src/app/dashboard/database/[table]/TableBrowserPageClient.tsx`
- Deleted `packages/ui/src/components/layout/LoadingText/**`
- Deleted `packages/ui/src/components/layout/InlineSpinner/**`
- `packages/ui/src/index.ts`
- `.cursor/skills/reusable-components/SKILL.md`
- `.cursor/rules/management-web-prefer-shared-ui.mdc`
- `.llm/plans/active/management-storage-object-detail-ux/01-storage-object-detail-page-ux.md`
- Moved `.llm/plans/active/shared-loading-spinner-consolidation/03-management-web-and-inline-spinner-removal.md` → `.llm/plans/completed/shared-loading-spinner-consolidation/`
- `.llm/plans/active/shared-loading-spinner-consolidation/COPY-PASTA.md`
- `.llm/history/active/shared-loading-spinner-consolidation/shared-loading-spinner-consolidation-part-01.md`

### Session 5 - 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-loading-spinner-consolidation/COPY-PASTA.md:31

#### Key Decisions

- Ran **`lint`** + **`type-check`** on **`@podverse/ui`**, **`@podverse/web`**, **`@podverse/management-web`** — all passed.
- Ran **`vitest`** for **`@podverse/ui`** — **50** tests passed (**18** files).
- Ran **`make e2e_test_report_scoped`** via **`./scripts/nix/with-env`** (plain **`make`** failed: **`psql: command not found`** without Nix PATH). Web + management-web **`e2e/smoke.spec.ts`** both passed.
- **`rg` sanity:** no **`apps/**`** / **`packages/**`** matches for **`components/LoadingSpinner/`** path stragglers; **`LoadingText`** / **`InlineSpinner`** remain only under **`.llm/**`** (historical/plan text), not in app or **`packages/ui`\*\* source.
- **Spot-check (code review):** standalone web spinners use **`decorative`** where surrounding copy or **`role="status"`** carries the announcement (`LazyLoadPlaceholder`, **`SwitchButton`**, **`ImageNonReact`**, boosts, verify / email-change flows); overlays use **`ariaLabel`** from **`misc`**.
- **Follow-ups noted:** **`management-storage-object-detail-ux`** already references **`LoadingSpinner`** (session **04**). **`apps/management-web/next.config.mjs`** permanently redirects **`/dashboard/database`** → **`/database`** — duplicate **`app/dashboard/database/[table]/TableBrowserPageClient.tsx`** is legacy; remove in a separate cleanup if desired.

#### Files Created/Modified

- `.llm/plans/completed/shared-loading-spinner-consolidation/COPY-PASTA.md` (all prompts checked; paths → **`completed/`**)
- Moved remaining **`shared-loading-spinner-consolidation`** plan files from **`active/`** → **`completed/`** (`00-*`, **`01`**, **`04`**) and removed empty **`active/shared-loading-spinner-consolidation/`**
- `.llm/history/active/shared-loading-spinner-consolidation/shared-loading-spinner-consolidation-part-01.md`
