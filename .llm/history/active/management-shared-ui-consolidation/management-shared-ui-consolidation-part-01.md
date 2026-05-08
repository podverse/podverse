# management-shared-ui-consolidation

**Started:** 2026-05-06  
**Author:** Agent  
**Context:** Assessment and local plan files for additional management-web/web shared UI convergence after the initial IconButton/dropdown convergence plan.

### Session 1 - 2026-05-06

#### Prompt (Developer)

i want you to assess all of the components that management web is using and tell me if there are any other components we should consolidate between management web and web beyond the ones you have already laid out in the plan, and then create and save plan files locally for the process of doing those

#### Key Decisions

- Assessed management-web local components, raw controls, and shared `@podverse/ui` usage against web counterparts.
- Identified additional consolidation candidates: settings locale/theme selectors and web `FormDropdown`, user/account menu behavior, form stack/login form cleanup, and a lower-risk nav brand/shell spike.
- Deferred fully merging the web NavBar into shared `NavBar`; web navigation has product-specific search/left/right behavior, so the plan scopes nav work to a spike and brand/shell primitives first.
- Created active plan files under `.llm/plans/active/management-shared-ui-consolidation/`.

#### Files Created/Modified

- `.llm/history/active/management-shared-ui-consolidation/management-shared-ui-consolidation-part-01.md`
- `.llm/plans/active/management-shared-ui-consolidation/00-SUMMARY.md`
- `.llm/plans/active/management-shared-ui-consolidation/00-EXECUTION-ORDER.md`
- `.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md`
- `.llm/plans/active/management-shared-ui-consolidation/01-settings-selector-and-form-dropdown-convergence.md`
- `.llm/plans/active/management-shared-ui-consolidation/02-account-menu-convergence.md`
- `.llm/plans/active/management-shared-ui-consolidation/03-form-stack-and-login-form-cleanup.md`
- `.llm/plans/active/management-shared-ui-consolidation/04-navbar-brand-convergence-spike.md`
- `.llm/plans/active/management-shared-ui-consolidation/05-verification-and-followups.md`

### Session 2 - 2026-05-06

#### Prompt (Developer)

Add Follow-Up Plan Files

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added `06-destructive-actions-confirmpanel-standardization.md` and `07-shared-client-session-guard-hook.md` to the active management-shared-ui-consolidation plan set.
- Updated execution order so `05-verification-and-followups.md` remains the final sweep after `06` and `07`.
- Extended `COPY-PASTA.md`, `00-SUMMARY.md`, and `05-verification-and-followups.md` follow-up notes to include the new prompts.

#### Files Created/Modified

- `.llm/plans/active/management-shared-ui-consolidation/06-destructive-actions-confirmpanel-standardization.md`
- `.llm/plans/active/management-shared-ui-consolidation/07-shared-client-session-guard-hook.md`
- `.llm/plans/active/management-shared-ui-consolidation/00-EXECUTION-ORDER.md`
- `.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md`
- `.llm/plans/active/management-shared-ui-consolidation/00-SUMMARY.md`
- `.llm/plans/active/management-shared-ui-consolidation/05-verification-and-followups.md`
- `.llm/history/active/management-shared-ui-consolidation/management-shared-ui-consolidation-part-01.md`

### Session 3 - 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md:16

#### Key Decisions

- Added shared `FormDropdown` in `packages/ui` (menu-style control, `options` + `onChange`, optional label/eyebrow/info/disabled) and exported it from `@podverse/ui`.
- Migrated web off `apps/web` local `FormDropdown` (removed); all prior call sites import from `@podverse/ui` and use `options` instead of `menuItems`.
- Migrated `ManagementLocaleSelector` and `ManagementThemeSwitcher` to `FormDropdown`; removed raw `<select>` and dropped redundant `fieldPrimitiveClasses` / `ariaLabel` wiring on the settings page where `<Label htmlFor>` names the control.
- Migrated all other former web `FormDropdown` usages in this pass (ClipForm, PlaylistForm, Settings profile, settings locale/theme).

#### Files Created/Modified

- `packages/ui/src/components/form/FormDropdown/FormDropdown.tsx`
- `packages/ui/src/components/form/FormDropdown/FormDropdown.module.scss`
- `packages/ui/src/components/form/FormDropdown/FormDropdown.test.tsx`
- `packages/ui/src/components/form/FormDropdown/index.ts`
- `packages/ui/src/index.ts`
- `apps/management-web/src/components/ManagementLocaleSelector/ManagementLocaleSelector.tsx`
- `apps/management-web/src/components/ManagementThemeSwitcher/ManagementThemeSwitcher.tsx`
- `apps/management-web/src/app/(management)/settings/SettingsPageClient.tsx`
- `apps/web/src/components/Settings/Panels/SettingsGeneral/SettingsLocaleSelector.tsx`
- `apps/web/src/components/Settings/Panels/SettingsGeneral/SettingsThemeSelector.tsx`
- `apps/web/src/components/Settings/Panels/SettingsProfile/SettingsProfile.tsx`
- `apps/web/src/components/Clip/ClipForm.tsx`
- `apps/web/src/components/Playlist/PlaylistForm.tsx`
- `apps/web/src/components/Form/FormDropdown.tsx` (deleted)
- `apps/web/src/styles/components/Form/FormDropdown.module.scss` (deleted)
- `.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md`
- `.llm/plans/completed/management-shared-ui-consolidation/01-settings-selector-and-form-dropdown-convergence.md` (moved from active)

### Session 4 - 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md:22

#### Key Decisions

- Extended `@podverse/ui` `DropdownMenu` with optional **custom `trigger`**, **`triggerClassName`**, **`DropdownMenu.Meta`** (meta/header row), **`DropdownMenu.LinkItem`** + **`LinkComponent`** + **`href`**, keyboard navigation via **`useDropdownKeyboardNavigation`** (menu rows as `<ul><li>`), Enter-to-activate via programmatic `.click()` on `[role="menuitem"]`, and shared panel/meta/link styling in SCSS.
- Extended **`useDropdownKeyboardNavigation`**: focus targets **`[role="menuitem"]`** inside each row; **`Escape`** resets **`focusedIndex`**; outside-close listens to **`pointerdown`** as well as **`mousedown`**.
- **`ManagementUserMenu`** now composes shared `DropdownMenu` only (logout/routing remain local); stripped bespoke panel SCSS to trigger overrides + icon/label/chevron.
- **`NavBarDropdownButton`** now uses shared `DropdownMenu` with existing NavBar trigger/profile SCSS via **`triggerClassName`**; **`aria-label`** uses **`features.account.account`** (“Account”).
- Added DropdownMenu tests for meta row, link row close, and ArrowDown selection.

#### Files Created/Modified

- `packages/ui/src/hooks/useDropdownKeyboardNavigation.ts`
- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenu.tsx`
- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenu.module.scss`
- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenuItem.tsx`
- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenuLinkItem.tsx`
- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenu.test.tsx`
- `packages/ui/src/components/navigation/DropdownMenu/index.ts`
- `packages/ui/src/index.ts`
- `apps/management-web/src/components/ManagementUserMenu/ManagementUserMenu.tsx`
- `apps/management-web/src/components/ManagementUserMenu/managementUserMenu.module.scss`
- `apps/web/src/components/NavBar/NavBarDropdownButton.tsx`
- `.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md`
- `.llm/plans/completed/management-shared-ui-consolidation/02-account-menu-convergence.md` (moved from active)

### Session 5 - 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md:28

#### Key Decisions

- Added shared **`StackForm`** in `@podverse/ui`: native `<form>` using **`FormStack.module.scss`** `stack` spacing (matches prior web `Form` layout).
- **Management-web login** (`page.tsx`): replaced raw `<form>` with **`FormContainer`** so submit/max-width stay shared without applying **`StackForm`**’s large inter-field gaps.
- **Web**: migrated all former **`Form`** call sites to **`StackForm`**; removed **`apps/web/src/components/Form/Form.tsx`** and **`Form.module.scss`**.
- Ran **`lint:fix`** and **`type-check`** for **`@podverse/ui`**, **`@podverse/web`**, **`@podverse/management-web`** (pass).

#### Files Created/Modified

- `packages/ui/src/components/form/StackForm/StackForm.tsx`
- `packages/ui/src/components/form/StackForm/index.ts`
- `packages/ui/src/index.ts`
- `apps/management-web/src/app/page.tsx`
- `apps/web/src/app/add-by-rss/add/AddByRSSAddFeedPageClient.tsx`
- `apps/web/src/app/set-password/SetPasswordPageClient.tsx`
- `apps/web/src/components/Auth/AuthEmailChangeForm.tsx`
- `apps/web/src/components/Auth/AuthForgotPasswordForm.tsx`
- `apps/web/src/components/Auth/AuthResetPasswordForm.tsx`
- `apps/web/src/components/Auth/AuthSignUpForm.tsx`
- `apps/web/src/components/Boost/BoostFormFields.tsx`
- `apps/web/src/components/Clip/ClipForm.tsx`
- `apps/web/src/components/Modal/ModalAuthLogin.tsx`
- `apps/web/src/components/Playlist/PlaylistForm.tsx`
- `apps/web/src/components/Settings/Panels/SettingsProfile/SettingsProfile.tsx`
- `apps/web/src/components/Form/Form.tsx` (deleted)
- `apps/web/src/styles/components/Form/Form.module.scss` (deleted)
- `.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md`
- `.llm/plans/completed/management-shared-ui-consolidation/03-form-stack-and-login-form-cleanup.md` (moved from active)
- `.llm/history/active/management-shared-ui-consolidation/management-shared-ui-consolidation-part-01.md`

### Session 6 - 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md:34

#### Key Decisions

- **Spike:** Option A — extend **`NavBar`** with **`appearance="management" | "web"`**; documented outcome in completed plan **04** (Option B/C deferred: brand/logo modes stay app-local).
- **`appearance="web"`** SCSS mirrors **`apps/web`** nav shell (fixed heights, padding, mobile bar background); default **`management`** keeps prior shared bar.
- **Management-web** uses **`appearance="web"`** on **`ManagementAppLayout`**; web keeps full local **`NavBar`** unchanged (no E2E scope beyond optional smoke).
- Added **`NavBar.test.tsx`** with **`cleanup`** between tests.

#### Files Created/Modified

- `packages/ui/src/components/navigation/NavBar/NavBar.tsx`
- `packages/ui/src/components/navigation/NavBar/NavBar.module.scss`
- `packages/ui/src/components/navigation/NavBar/NavBar.test.tsx`
- `packages/ui/src/components/navigation/NavBar/index.ts`
- `packages/ui/src/index.ts`
- `apps/management-web/src/components/ManagementAppLayout/ManagementAppLayout.tsx`
- `.llm/plans/completed/management-shared-ui-consolidation/04-navbar-brand-convergence-spike.md` (moved from active; includes spike outcome section)
- `.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md`
- `.llm/history/active/management-shared-ui-consolidation/management-shared-ui-consolidation-part-01.md`

### Session 7 - 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md:40

#### Key Decisions

- Replaced **`window.confirm`** / **`confirm()`** on users list, user detail, and database row detail with **`ConfirmPanel`** + **`ConfirmPanelActions`** + cancel/confirm **`Button`**s matching storage/flag-status (secondary cancel, primary confirm with **`isLoading`**).
- Added **`users.deleteConfirmAria`** and **`database.deleteConfirmAria`** for dialog **`aria-label`**; reused existing **`confirmDelete`** / **`deleteConfirm`** body copy.
- Introduced **`deleteLoading`** on database row detail separate from form **`loading`** so update vs delete busy states do not clash.

#### Files Created/Modified

- `apps/management-web/src/app/(management)/users/UsersListPageClient.tsx`
- `apps/management-web/src/app/(management)/users/[id]/UserDetailPageClient.tsx`
- `apps/management-web/src/app/(management)/database/[table]/[id]/RowDetailPageClient.tsx`
- `apps/management-web/i18n/originals/en-US.json`
- `apps/management-web/i18n/originals/es.json`
- `apps/management-web/i18n/originals/fr.json`
- `apps/management-web/i18n/originals/el-GR.json`
- `apps/management-web/i18n/overrides/es.json`
- `apps/management-web/i18n/overrides/fr.json`
- `apps/management-web/i18n/overrides/el-GR.json`
- `.llm/plans/completed/management-shared-ui-consolidation/06-destructive-actions-confirmpanel-standardization.md` (moved from active)
- `.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md`
- `.llm/history/active/management-shared-ui-consolidation/management-shared-ui-consolidation-part-01.md`

### Session 8 - 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md:46

#### Key Decisions

- Added **`useManagementClientSessionGuard`** (`apps/management-web/src/hooks/useManagementClientSessionGuard.ts`): **`getCurrentUser()`** client re-check, **`router.replace(redirectPath)`** when **`currentUser === null`** or on thrown error; options **`redirectPath`**, **`enabled`**, **`onValid`** / **`onInvalid`** (via refs); **`currentUser === null`** typed explicitly (no **`as`**).
- Migrated **`SettingsPageClient`** (effect-only call — page UI does not consume returned user), **`DashboardPageClient`**, **`StoragePageClient`** off duplicated **`useEffect`** blocks.
- No new Vitest hook test — management-web lacks **`@testing-library/react`** / **`renderHook`**; documented in completed plan **07**.

#### Files Created/Modified

- `apps/management-web/src/hooks/useManagementClientSessionGuard.ts`
- `apps/management-web/src/app/(management)/settings/SettingsPageClient.tsx`
- `apps/management-web/src/app/(management)/dashboard/DashboardPageClient.tsx`
- `apps/management-web/src/app/(management)/storage/StoragePageClient.tsx`
- `.llm/plans/completed/management-shared-ui-consolidation/07-shared-client-session-guard-hook.md` (moved from active)
- `.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md`
- `.llm/history/active/management-shared-ui-consolidation/management-shared-ui-consolidation-part-01.md`

### Session 9 - 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/management-shared-ui-consolidation/COPY-PASTA.md:52

#### Key Decisions

- Ran **plan 05** verification: lint + type-check **`@podverse/ui`**, **`@podverse/web`**, **`@podverse/management-web`**; **`npm run test -w @podverse/ui`** (29 tests); management-web E2E **`e2e/smoke.spec.ts`** and **`e2e/settings-page.spec.ts`** (separate **`make`** invocations — comma **`SPEC`** is not split by Playwright).
- Documented follow-ups in **`05-verification-and-followups.md`**: web **`FormDropdown`** only from **`@podverse/ui`**; account menu both apps; **`NavBar`** **`appearance`** implemented; no **`window.confirm`** under **`management-web/src`** (grep); **`useManagementClientSessionGuard`** scope vs deferred **`getCurrentUser`** call sites (stats, workers, storage detail, login page, **`apps/dashboard`** client).
- Archived full **`management-shared-ui-consolidation`** plan directory from **`active/`** to **`completed/`** ( **`COPY-PASTA`**, **`00-SUMMARY`**, **`00-EXECUTION-ORDER`**, **`05`**).

#### Files Created/Modified

- `.llm/plans/completed/management-shared-ui-consolidation/05-verification-and-followups.md` (moved from active; verification record + follow-up notes)
- `.llm/plans/completed/management-shared-ui-consolidation/COPY-PASTA.md` (moved from active)
- `.llm/plans/completed/management-shared-ui-consolidation/00-SUMMARY.md` (moved from active)
- `.llm/plans/completed/management-shared-ui-consolidation/00-EXECUTION-ORDER.md` (moved from active)
- `.llm/history/active/management-shared-ui-consolidation/management-shared-ui-consolidation-part-01.md`
