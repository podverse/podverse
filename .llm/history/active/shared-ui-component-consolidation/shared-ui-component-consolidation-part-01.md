# History — shared-ui-component-consolidation

## Metadata

- Started: 2026-05-06
- Author: Cursor agent
- Context: Plan files only (no code migration in this session).

## Session 1 — 2026-05-06

#### Prompt (Developer)

Shared UI Component Consolidation Plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file
itself.

To-do's from the plan have already been created. Do not create them again. Mark them as
in_progress as you work, starting with the first one. Don't stop until you have completed all
the to-dos.

#### Key Decisions

- Saved full plan set under `.llm/plans/active/shared-ui-component-consolidation/` per attached
  spec: `00-*`, `01`–`07`, `COPY-PASTA` with execution prompts.
- Did not modify the Cursor plan file at `~/.cursor/plans/shared_ui_consolidation_acf95ca7.plan.md`.

#### Files Created/Modified

- `.llm/plans/active/shared-ui-component-consolidation/00-EXECUTION-ORDER.md`
- `.llm/plans/active/shared-ui-component-consolidation/00-SUMMARY.md`
- `.llm/plans/active/shared-ui-component-consolidation/01-inventory-and-target-apis.md`
- `.llm/plans/active/shared-ui-component-consolidation/02-low-risk-extractions.md`
- `.llm/plans/active/shared-ui-component-consolidation/03-medium-risk-convergence.md`
- `.llm/plans/active/shared-ui-component-consolidation/04-high-risk-feasibility-and-wrappers.md`
- `.llm/plans/active/shared-ui-component-consolidation/05-management-web-convergence.md`
- `.llm/plans/active/shared-ui-component-consolidation/06-rules-and-skills-hardening.md`
- `.llm/plans/active/shared-ui-component-consolidation/07-verification-and-rollout.md`
- `.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md`

## Session 2 — 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md:18-20

#### Key Decisions

- Finalized phase 01 deliverables: migration contract definitions, Appendix A matrix with
  canonical `apps/web` and `packages/ui` paths, baseline notes for already-exported primitives,
  Appendix B per-family app wrapper focus, and sign-off blockers (pagination, navbar).
- Marked `01-inventory-and-target-apis.md` complete in `COPY-PASTA.md` and moved the completed plan
  file to `.llm/plans/completed/shared-ui-component-consolidation/` per plan lifecycle (kept
  `COPY-PASTA.md` and `00-*` in `active/`).

#### Files Created/Modified

- `.llm/plans/completed/shared-ui-component-consolidation/01-inventory-and-target-apis.md`
- `.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md`
- `.llm/plans/active/shared-ui-component-consolidation/00-EXECUTION-ORDER.md`
- `.llm/history/active/shared-ui-component-consolidation/shared-ui-component-consolidation-part-01.md`

## Session 3 — 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md:24-26

#### Key Decisions

- Added `@podverse/ui` primitives: `Accordion`, `Callout`, `CallToActionMessageShell`,
  `PopoverIcon` (feedback), `VirtualizedList` (`react-virtuoso` peer + dev dep), `LoadingOverlay`.
- Wired `apps/web` via thin wrappers / re-exports; mapped legacy Accordion `headerClass` /
  `contentClass` to shared `headerClassName` / `contentClassName`; PopoverIcon wrapper keeps
  next-intl default `aria-label`; loading overlay keeps sidebar offset via web-only SCSS shell class.
- Removed superseded web SCSS for Accordion, Callout, CallToActionMessage, PopoverIcon; slimmed
  `LoadingSpinnerOverlay` companion styles to positioning overrides only.
- Completed plan file moved to `.llm/plans/completed/shared-ui-component-consolidation/`; `COPY-PASTA`
  phase 02 checked.

#### Files Created/Modified

- `packages/ui/package.json`
- `packages/ui/src/index.ts`
- `packages/ui/src/components/layout/Accordion/**`
- `packages/ui/src/components/layout/Callout/**`
- `packages/ui/src/components/layout/CallToActionMessage/**`
- `packages/ui/src/components/layout/LoadingOverlay/**`
- `packages/ui/src/components/layout/VirtualizedList/**`
- `packages/ui/src/components/feedback/PopoverIcon/**`
- `apps/web/src/components/Accordian/Accordian.tsx`
- `apps/web/src/components/Accordian/AccordianClient.tsx`
- `apps/web/src/components/Callout/Callout.tsx`
- `apps/web/src/components/CallToActionMessage/CallToActionMessage.tsx`
- `apps/web/src/components/PopoverIcon/PopoverIcon.tsx`
- `apps/web/src/components/VirtualizedList/VirtualizedList.tsx`
- `apps/web/src/components/LoadingSpinner/LoadingSpinnerOverlay.tsx`
- `apps/web/src/styles/components/LoadingSpinner/LoadingSpinnerOverlay.module.scss`
- Deleted: `apps/web/src/styles/components/Accordian/Accordian.module.scss`, `Callout/Callout.module.scss`,
  `CallToActionMessage/CallToActionMessage.module.scss`, `PopoverIcon/PopoverIcon.module.scss`
- `.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md`
- `.llm/plans/active/shared-ui-component-consolidation/00-EXECUTION-ORDER.md`
- `.llm/plans/completed/shared-ui-component-consolidation/02-low-risk-extractions.md`

## Session 4 — 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md:30-31

#### Key Decisions

- Introduced **`DropdownMenuPanel`** in `@podverse/ui` with web-baseline menu SCSS; web
  `DropdownMenu.tsx` re-exports it so `Dropdown`, `MoreButton`, `ViewSelector`, and media settings
  keep the same import path without duplicating menu markup or web styles.
- Added **`warning`** to `DropdownMenuItemVariant` and matching styles for parity with app menus.
- Added **`NavArrowButton`** and **`PaginationStrip`** (numeric strip + arrows) in `@podverse/ui`;
  web **`Pagination`** composes `PaginationStrip` with existing `next-intl` aria labels.
- Migrated web **`NavBar`** to `@podverse/ui` **`NavBar`** with `appearance="web"` and slot children.
- Removed superseded web SCSS: `DropdownMenu.module.scss`, `NavArrowButton.module.scss`,
  `NavBar.module.scss`; trimmed **`Pagination.module.scss`** to the outer column wrapper only.
- **`MoreActionsButton`** composite (ellipsis + shared trigger) deferred — keyboard + custom round
  trigger still live in web `MoreButton` + `useDropdownKeyboardNavigation`; panel surface is shared.
- Archived `03-medium-risk-convergence.md` to `completed/`; updated `COPY-PASTA.md` and
  `00-EXECUTION-ORDER.md` links.

#### Files Created/Modified

- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenuPanel.tsx`
- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenuPanel.module.scss`
- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenuPanel.test.tsx`
- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenuItem.tsx`
- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenu.module.scss`
- `packages/ui/src/components/navigation/DropdownMenu/index.ts`
- `packages/ui/src/components/navigation/NavArrowButton/**`
- `packages/ui/src/components/navigation/PaginationStrip/**`
- `packages/ui/src/index.ts`
- `apps/web/src/components/Dropdown/DropdownMenu.tsx`
- `apps/web/src/components/Pagination/Pagination.tsx`
- `apps/web/src/components/NavBar/NavBar.tsx`
- `apps/web/src/components/NavArrowButton/NavArrowButton.tsx`
- `apps/web/src/styles/components/Pagination/Pagination.module.scss`
- `.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md`
- `.llm/plans/active/shared-ui-component-consolidation/00-EXECUTION-ORDER.md`
- `.llm/plans/completed/shared-ui-component-consolidation/03-medium-risk-convergence.md`

## Session 5 — 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md:35-36

#### Key Decisions

- Completed phase 04 as **documentation-only**: PR-ready summary, decision matrix (app shell,
  Image, Link, Toast, Footer, Modal), ADR-style exclusions for Image/Link/Toast, modal shell vs
  domain split, and half-migration guardrails.
- Archived `04-high-risk-feasibility-and-wrappers.md` to `completed/`; updated `COPY-PASTA.md` and
  `00-EXECUTION-ORDER.md`.

#### Files Created/Modified

- `.llm/plans/completed/shared-ui-component-consolidation/04-high-risk-feasibility-and-wrappers.md`
- `.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md`
- `.llm/plans/active/shared-ui-component-consolidation/00-EXECUTION-ORDER.md`
- `.llm/history/active/shared-ui-component-consolidation/shared-ui-component-consolidation-part-01.md`

## Session 6 — 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md:40-42

#### Key Decisions

- Wired database **table browser** pagination (both `(management)` and `dashboard` route copies) to
  `@podverse/ui` **`Pagination`** with **`PaginationSummaryLine`** when `totalPages <= 1` only.
- Removed unused **`react-hot-toast`** from `apps/management-web/package.json` (still used by web).
- Archived `05-management-web-convergence.md` to `completed/`; updated `COPY-PASTA.md` and
  `00-EXECUTION-ORDER.md`.

#### Files Created/Modified

- `apps/management-web/src/app/(management)/database/[table]/TableBrowserPageClient.tsx`
- `apps/management-web/src/app/dashboard/database/[table]/TableBrowserPageClient.tsx`
- `apps/management-web/package.json`
- `.llm/plans/completed/shared-ui-component-consolidation/05-management-web-convergence.md`
- `.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md`
- `.llm/plans/active/shared-ui-component-consolidation/00-EXECUTION-ORDER.md`
- `.llm/history/active/shared-ui-component-consolidation/shared-ui-component-consolidation-part-01.md`

## Session 7 — 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md:46-48

#### Key Decisions

- Added **promotion checklist** and stay-in-app denylist to **`prefer-shared-ui-web-management`**;
  management-web rule now requires **web comparison** before new local components and cites phase 05
  examples.
- **`shared-ui-i18n`**: layout primitives called out in review checklist.
- **`reusable-components`**: **Promotion rubric** table; new **`ui-component-promotion`** skill with
  extraction steps and cross-links.
- **`AGENTS.md`** Shared UI section + skills index; **`.cursorrules`** references **`ui-component-promotion`**.
- Archived `06-rules-and-skills-hardening.md` to `completed/`; updated **`COPY-PASTA.md`** and
  **`00-EXECUTION-ORDER.md`**.

#### Files Created/Modified

- `.cursor/rules/prefer-shared-ui-web-management.mdc`
- `.cursor/rules/management-web-prefer-shared-ui.mdc`
- `.cursor/rules/shared-ui-i18n.mdc`
- `.cursor/skills/reusable-components/SKILL.md`
- `.cursor/skills/ui-component-promotion/SKILL.md`
- `.cursorrules`
- `AGENTS.md`
- `.llm/plans/completed/shared-ui-component-consolidation/06-rules-and-skills-hardening.md`
- `.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md`
- `.llm/plans/active/shared-ui-component-consolidation/00-EXECUTION-ORDER.md`
- `.llm/history/active/shared-ui-component-consolidation/shared-ui-component-consolidation-part-01.md`

## Session 8 — 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/shared-ui-component-consolidation/COPY-PASTA.md:52-55

#### Key Decisions

- Ran phase **07** verification: **`npm run build:packages`**, **`npm run prettier:write`** (fixed
  Prettier drift blocking **`npm run lint`**), **`npm run lint`**, **`npm run test:unit`** — all passed.
- Ran **`./scripts/nix/with-env make e2e_test_report_scoped WEB_SPEC=e2e/smoke.spec.ts MGMT_SPEC=e2e/smoke.spec.ts`**
  (Nix wrapper supplies **`psql`** for linear migrations); both smoke specs passed.
- **`npm run test:e2e:api`** skipped — phases 02–05 did not change API routes.
- Archived **entire** plan set: moved `07-verification-and-rollout.md`, `COPY-PASTA.md`,
  `00-EXECUTION-ORDER.md`, `00-SUMMARY.md` from **`active/`** to
  **`.llm/plans/completed/shared-ui-component-consolidation/`**; removed empty **`active/`** directory;
  fixed **`00-EXECUTION-ORDER.md`** same-folder links; updated **`00-SUMMARY.md`** status and
  **`ui-component-promotion`** guardrail link.

#### Files Created/Modified

- `.llm/plans/completed/shared-ui-component-consolidation/07-verification-and-rollout.md`
- `.llm/plans/completed/shared-ui-component-consolidation/COPY-PASTA.md`
- `.llm/plans/completed/shared-ui-component-consolidation/00-EXECUTION-ORDER.md`
- `.llm/plans/completed/shared-ui-component-consolidation/00-SUMMARY.md`
- `npm run prettier:write` — repo-wide formatting fixes where Prettier had drifted (see working tree)
- `.llm/history/active/shared-ui-component-consolidation/shared-ui-component-consolidation-part-01.md`

## Session 9 — 2026-05-06

#### Prompt (Developer)

scan ALL of the components in web. none of them should use "export default \_\_\_" they should be exported without default. also determine if any components in web do not actually need a component file in web or if they can just be imported directly into where they are needed from packages/ui. we are trying to reduce unnecessary code if possible

#### Key Decisions

- Converted **`apps/web/src/components/**`** to **named exports only** (`export const`/`export function`); updated **all default-import call sites** (including **`app/layout.tsx`\*\*, list/header shells, nested imports).
- **Next.js route modules** (`app/**/page.tsx`, `layout.tsx` root default, `providers/Providers.tsx`, `i18n/request.ts`) **keep `export default`** — framework-required pattern.
- **Removed thin web wrappers** in favor of **`@podverse/ui`**: deleted **`VirtualizedList`**, **`Callout`**, **`Dropdown/DropdownMenu.tsx`** (alias), **`NavArrowButton`** files/dirs; **`ItemTranscript`** → `VirtualizedList` from UI; **`BoostFormBase`** → `Callout` from UI; **`Dropdown`**, **`MoreButton`**, **`ViewSelector`**, **`SettingsButton`** → `DropdownMenuPanel` from UI; **`NavBarLeftButtons`** → `NavArrowButton` from UI.
- **`Dropdown.tsx`** now **`export const Dropdown`** (types **`DropdownMenuItem`**, **`DropdownProps`** unchanged).
- **`ContentAboutAccordion`**: renamed props type to **`ContentAboutAccordionProps`** (avoid duplicate identifier with component).
- **`SideBar`**: **`AccordionClient`** named import + JSX; **`Accordion`** / **`AccordionClient`** modules use named exports.

#### Files Created/Modified

- Deleted: `apps/web/src/components/Dropdown/DropdownMenu.tsx`, `apps/web/src/components/VirtualizedList/VirtualizedList.tsx`, `apps/web/src/components/Callout/Callout.tsx`, `apps/web/src/components/NavArrowButton/NavArrowButton.tsx`; removed empty dirs **`VirtualizedList`**, **`NavArrowButton`**.
- Named-export migration and import fixes across **`apps/web/src/components/**`** and **`apps/web/src/app/**/\*.tsx`** (Dropdown/Pagination default-import sweep), notably **`layout.tsx`**, **`NavBar/*`**, **`Footer/*`**, **`SideBar/*`**, **`Dropdown/Dropdown.tsx`**, **`Pagination/Pagination.tsx`**, **`PageWrapper`**, **`WindowWrapper`**, **`Head/*`**, **`Auth/AuthSessionChecker`**, **`List/**`**, **`Boost/BoostFormFields.tsx`**, **`Media/Header/_`**, **`Accordian/_`**, **`Content/About/ContentAboutAccordion.tsx`**, **`Content/Podroll/ContentPodrollAccordion.tsx`**, **`Core/**/Core\*HeaderButtons.tsx`**, **`ItemTranscript`**, **`BoostFormBase`**, **`MoreButton`**, **`ViewSelector`**, **`SettingsButton`**, **`NavBarLeftButtons`**.
- `.llm/history/active/shared-ui-component-consolidation/shared-ui-component-consolidation-part-01.md`

## Session 10 — 2026-05-06

#### Prompt (Developer)

move appwrapper to packages/ui and management web should use it

#### Key Decisions

- Added **`AppWrapper`** to **`packages/ui`** (`display: flex; flex: 1`) with optional **`direction`** (`row` \| `column`) — **web** keeps default **`row`** (sidebar + main); **management-web** uses **`column`** under **`NavBar`** for main chrome.
- **`ManagementAppLayout`**: **`shell`** flex column **`min-height: 100vh`** wrapping **`NavBar`** + **`<AppWrapper direction="column">{children}</AppWrapper>`**.
- **Web**: **`apps/web/src/app/layout.tsx`** imports **`AppWrapper`** from **`@podverse/ui`**; removed **`apps/web`** **`App/AppWrapper.tsx`** and **`styles/components/App/AppWrapper.module.scss`** (empty dirs removed when applicable).
- Exported **`AppWrapper`** / **`AppWrapperProps`** from **`packages/ui/src/index.ts`**; unit test **`AppWrapper.test.tsx`**.

#### Files Created/Modified

- `packages/ui/src/components/layout/AppWrapper/AppWrapper.tsx`
- `packages/ui/src/components/layout/AppWrapper/AppWrapper.module.scss`
- `packages/ui/src/components/layout/AppWrapper/AppWrapper.test.tsx`
- `packages/ui/src/index.ts`
- `apps/web/src/app/layout.tsx`
- `apps/management-web/src/components/ManagementAppLayout/ManagementAppLayout.tsx`
- `apps/management-web/src/components/ManagementAppLayout/managementAppLayout.module.scss`
- Deleted: `apps/web/src/components/App/AppWrapper.tsx`, `apps/web/src/styles/components/App/AppWrapper.module.scss`
- `.llm/history/active/shared-ui-component-consolidation/shared-ui-component-consolidation-part-01.md`

## Session 11 — 2026-05-06

#### Prompt (Developer)

@podverse/apps/web/src/components/CallToActionMessage/CallToActionMessage.tsx:1-29 i don't think we need a CallToActionMessageeShell i think ui should have CallToActionMessage and it should be imported wherever needed into files in web

#### Key Decisions

- Replaced **`CallToActionMessageShell`** with **`CallToActionMessage`** in **`@podverse/ui`**: single component with **`message`**, **`buttonLabel`**, **`onButtonClick`** (same API as former web wrapper); renders `<p>` + primary `<button>` inside shared layout styles (renamed SCSS to **`CallToActionMessage.module.scss`**).
- Removed **`CallToActionMessageShell.tsx`** / **`.module.scss`** / old test; added **`CallToActionMessage.test.tsx`** (click + render).
- Deleted **`apps/web`** **`CallToActionMessage/CallToActionMessage.tsx`**; all **21** call sites import **`{ CallToActionMessage } from '@podverse/ui'`** (merged into existing **`@podverse/ui`** imports where present).
- **`packages/ui/src/index.ts`**: export **`CallToActionMessage`** / **`CallToActionMessageProps`** only (no Shell).

#### Files Created/Modified

- `packages/ui/src/components/layout/CallToActionMessage/CallToActionMessage.tsx`
- `packages/ui/src/components/layout/CallToActionMessage/CallToActionMessage.module.scss`
- `packages/ui/src/components/layout/CallToActionMessage/CallToActionMessage.test.tsx`
- `packages/ui/src/components/layout/CallToActionMessage/index.ts`
- `packages/ui/src/index.ts`
- Deleted: `CallToActionMessageShell.tsx`, `CallToActionMessageShell.module.scss`, `CallToActionMessageShell.test.tsx`
- `apps/web/src/**/*.tsx` — imports updated (lists, core, modals, add-by-rss clients, ClipForm, etc.)
- Deleted: `apps/web/src/components/CallToActionMessage/CallToActionMessage.tsx`
- `.llm/history/active/shared-ui-component-consolidation/shared-ui-component-consolidation-part-01.md`

## Session 12 — 2026-05-06

#### Prompt (Developer)

it doesn't look like web even needs a wrapper for Accordian, just import the accordian component wherever it gets used

#### Key Decisions

- Removed **`apps/web/src/components/Accordian/Accordian.tsx`** and **`AccordianClient.tsx`** (legacy **`content`** / **`headerClass`** / **`contentClass`** shims).
- **`ContentAboutAccordion`**, **`ContentPodrollAccordion`**, **`SideBar`** now import **`Accordion`** from **`@podverse/ui`** directly; body uses **`children`**; **`headerClass`** → **`headerClassName`**, **`contentClass`** → **`contentClassName`**.
- **`SideBar`**: replaced **`AccordionClient`** with **`Accordion`** (same client behavior — `@podverse/ui` **`Accordion`** is already **`'use client'`**).

#### Files Created/Modified

- `apps/web/src/components/Content/About/ContentAboutAccordion.tsx`
- `apps/web/src/components/Content/Podroll/ContentPodrollAccordion.tsx`
- `apps/web/src/components/SideBar/SideBar.tsx`
- Deleted: `apps/web/src/components/Accordian/Accordian.tsx`, `apps/web/src/components/Accordian/AccordianClient.tsx` (empty **`Accordian/`** dir removed)
- `.llm/history/active/shared-ui-component-consolidation/shared-ui-component-consolidation-part-01.md`

## Session 13 — 2026-05-06

#### Prompt (Developer)

# Shape (confirmed)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file
itself.

To-do's from the plan have already been created. Do not create them again. Mark them as
in_progress as you work, starting with the first one. Don't stop until you have completed all
the to-dos.

#### Key Decisions

- Added tier-array **`FeatureComparison`** in **`@podverse/ui`** with **`tiers`**, **`features`**
  (**`available`** keyed by tier id), and **`labels`** (**`feature`**, **`available`**); no
  **`next-intl`** or embedded copy.
- **`apps/web`** keeps **`FeatureComparison`** at the same path as a thin **`'use client'`**
  wrapper: maps legacy **`{ free, premium }`** rows to **`available`**, passes localized tier
  names and labels.
- Moved comparison SCSS from **`apps/web`** into **`packages/ui`**; deleted web module SCSS.

#### Files Created/Modified

- `packages/ui/src/components/layout/FeatureComparison/FeatureComparison.tsx`
- `packages/ui/src/components/layout/FeatureComparison/FeatureComparison.module.scss`
- `packages/ui/src/components/layout/FeatureComparison/FeatureComparison.test.tsx`
- `packages/ui/src/components/layout/FeatureComparison/index.ts`
- `packages/ui/src/index.ts`
- `apps/web/src/components/FeatureComparison/FeatureComparison.tsx`
- Deleted: `apps/web/src/styles/components/FeatureComparison/FeatureComparison.module.scss`
- `.llm/history/active/shared-ui-component-consolidation/shared-ui-component-consolidation-part-01.md`

## Session 14 — 2026-05-06

#### Prompt (Developer)

# Scope

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file
itself.

To-do's from the plan have already been created. Do not create them again. Mark them as
in_progress as you work, starting with the first one. Don't stop until you have completed all
the to-dos.

#### Key Decisions

- Promoted **`MoreButton`** to **`@podverse/ui`** at
  **`packages/ui/src/components/button/MoreButton/`**; reuses **`DropdownMenuPanelItem`** as
  **`MoreButtonMenuItem`**; required **`ariaLabel`** prop (apps pass **`tMedia('more_options')`**).
- Added **`media.more_options`** to **`apps/web`** i18n originals (all locales) and ran
  **`npm run i18n:compile`**.
- **`management-web`**: no ellipsis/more-menu equivalent found (only **`Table.RowActions`**); no
  changes.

#### Files Created/Modified

- `packages/ui/src/components/button/MoreButton/MoreButton.tsx`
- `packages/ui/src/components/button/MoreButton/MoreButton.module.scss`
- `packages/ui/src/components/button/MoreButton/MoreButton.test.tsx`
- `packages/ui/src/components/button/MoreButton/index.ts`
- `packages/ui/src/index.ts`
- `apps/web/i18n/originals/en-US.json`, `es.json`, `fr.json`, `el-GR.json`
- `apps/web/i18n/overrides/*.json` (synced via i18n compile)
- Sixteen `apps/web` components updated to import **`MoreButton`** from **`@podverse/ui`**
- Deleted: `apps/web/src/components/MoreButton/MoreButton.tsx`,
  `apps/web/src/styles/components/MoreButton/MoreButton.module.scss`
- `.llm/history/active/shared-ui-component-consolidation/shared-ui-component-consolidation-part-01.md`
