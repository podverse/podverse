# History — web-form-shared-ui

## Metadata

- Started: 2026-05-06
- Author: Cursor agent
- Context: Saved local execution plan set only (no application code migration).

## Session 1 — 2026-05-06

#### Prompt (Developer)

create and save the plan files for this work locally

#### Key Decisions

- Created plan set `.llm/plans/active/web-form-shared-ui/` with `00-SUMMARY.md`, `00-EXECUTION-ORDER.md`,
  `COPY-PASTA.md`, and numbered phases `01`–`07` covering inventory, promotion slices, web cleanup,
  management-web convergence, and verification.
- Scoped plans to `apps/web/src/components/Form/` + SCSS; feature-level forms remain in apps per
  `00-SUMMARY.md`.
- Documented export naming collision strategy (primitive `TextArea` vs rich composite → `FormTextArea`).

#### Files Created/Modified

- `.llm/plans/active/web-form-shared-ui/00-SUMMARY.md`
- `.llm/plans/active/web-form-shared-ui/00-EXECUTION-ORDER.md`
- `.llm/plans/active/web-form-shared-ui/COPY-PASTA.md`
- `.llm/plans/active/web-form-shared-ui/01-inventory-naming-and-collisions.md`
- `.llm/plans/active/web-form-shared-ui/02-promote-simple-form-controls.md`
- `.llm/plans/active/web-form-shared-ui/03-promote-text-input-family.md`
- `.llm/plans/active/web-form-shared-ui/04-promote-textarea-search-and-checkbox-groups.md`
- `.llm/plans/active/web-form-shared-ui/05-apps-web-migration-and-cleanup.md`
- `.llm/plans/active/web-form-shared-ui/06-management-web-convergence.md`
- `.llm/plans/active/web-form-shared-ui/07-verification-and-rollout.md`
- `.llm/history/active/web-form-shared-ui/web-form-shared-ui-part-01.md`

## Session 2 — 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/web-form-shared-ui/COPY-PASTA.md:19-23

#### Key Decisions

- Completed phase 01 inventory via grep: **23** external consumer files + **11** `components/Form/`
  modules; documented per-symbol consumer clusters in plan appendix.
- Locked **`FormTextArea`** for rich textarea vs primitive **`TextArea`**; **`TextInput`** as new export;
  **`TextCheckboxes`** name retained; **`CheckboxField`** extension preferred over duplicate labeled API.
- **`InlineForm`** module exports four symbols — all locked for joint promotion.
- Recorded blocker: **`TextInputNumberIncrement`** uses **`next-intl`** for aria labels — must become props
  when moving to `packages/ui` (Appendix D).

#### Files Created/Modified

- `.llm/plans/active/web-form-shared-ui/01-inventory-naming-and-collisions.md`
- `.llm/plans/active/web-form-shared-ui/COPY-PASTA.md`
- `.llm/history/active/web-form-shared-ui/web-form-shared-ui-part-01.md`

## Session 3 — 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/web-form-shared-ui/COPY-PASTA.md:27-30

#### Key Decisions

- Promoted **LabeledCheckbox**, **RadioButton**, **SwitchButton**, and **InlineForm** family into `packages/ui`
  with web-aligned SCSS; labeled checkbox named **LabeledCheckbox** to avoid clashing with bare **`Checkbox`**.
- **SwitchButton** requires **`stateOnLabel`** / **`stateOffLabel`**; **`helpText`** pairs with **`helpAriaLabel`**
  (typed union). Uses **`PopoverIcon`** with **`body`** for help content.
- Deleted matching `apps/web` Form modules and SCSS; updated checkout, add-by-rss, settings notifications, list
  channel settings imports.
- Vitest: **LabeledCheckbox**, **SwitchButton**. Plan **COPY-PASTA** phase 02 marked complete.

#### Files Created/Modified

- `packages/ui/src/components/form/LabeledCheckbox/LabeledCheckbox.tsx`
- `packages/ui/src/components/form/LabeledCheckbox/LabeledCheckbox.module.scss`
- `packages/ui/src/components/form/LabeledCheckbox/LabeledCheckbox.test.tsx`
- `packages/ui/src/components/form/RadioButton/RadioButton.tsx`
- `packages/ui/src/components/form/RadioButton/RadioButton.module.scss`
- `packages/ui/src/components/form/SwitchButton/SwitchButton.tsx`
- `packages/ui/src/components/form/SwitchButton/SwitchButton.module.scss`
- `packages/ui/src/components/form/SwitchButton/SwitchButton.test.tsx`
- `packages/ui/src/components/form/InlineForm/InlineForm.tsx`
- `packages/ui/src/components/form/InlineForm/InlineForm.module.scss`
- `packages/ui/src/index.ts`
- `apps/web/src/app/checkout/CheckoutPageClient.tsx`
- `apps/web/src/app/add-by-rss/add/AddByRSSAddFeedPageClient.tsx`
- `apps/web/src/components/List/ListChannelSettings.tsx`
- `apps/web/src/components/Settings/Panels/SettingsNotifications/SettingsNotifications.tsx`
- `.llm/plans/active/web-form-shared-ui/COPY-PASTA.md`

#### Files Deleted

- `apps/web/src/components/Form/Checkbox.tsx`
- `apps/web/src/components/Form/RadioButton.tsx`
- `apps/web/src/components/Form/SwitchButton.tsx`
- `apps/web/src/components/Form/InlineForm.tsx`
- `apps/web/src/styles/components/Form/Checkbox.module.scss`
- `apps/web/src/styles/components/Form/RadioButton.module.scss`
- `apps/web/src/styles/components/Form/SwitchButton.module.scss`
- `apps/web/src/styles/components/Form/InlineForm.module.scss`

## Session 4 — 2026-05-07

#### Prompt (Developer)

@podverse/.llm/plans/active/web-form-shared-ui/COPY-PASTA.md:34-36

#### Key Decisions

- Promoted **TextInput**, **TextInputNumber**, **TextInputNumberIncrement** (was `TextInputNumberIncrements.tsx`),
  and **TextInputHHMMSS** into `packages/ui`; **Button** imported via relative path inside the package.
- Numeric steppers use required **`incrementAriaLabel`** / **`decrementAriaLabel`** on **TextInputNumberIncrement**;
  **TextInput** takes optional **`numberStepperAriaLabels`** when `type === 'number'`. **TextInputNumber** requires
  **`stepperAriaLabels`** and forwards to **TextInput**.
- **BoostFormFields** passes **`stepperAriaLabels`** from existing **`tMisc`** (`increment` / `decrement` keys).
- **TextInputHHMMSS** uses **`formatInputToHHMMSS`** from **`@podverse/helpers`**; play control **`onClick`** moved to
  the **`button`** element (was on the icon only in web).
- Removed corresponding **`apps/web`** Form sources and SCSS; **`SearchInput`** now imports **TextInput** from
  **`@podverse/ui`**.
- Vitest: **TextInputNumberIncrement** (min/max clamp), **TextInputHHMMSS** (change + button). Plan phase **03**
  marked complete in **COPY-PASTA**.

#### Files Created (packages/ui)

- `packages/ui/src/components/form/TextInput/TextInput.tsx`
- `packages/ui/src/components/form/TextInput/TextInput.module.scss`
- `packages/ui/src/components/form/TextInputNumber/TextInputNumber.tsx`
- `packages/ui/src/components/form/TextInputNumber/TextInputNumber.module.scss`
- `packages/ui/src/components/form/TextInputNumberIncrement/TextInputNumberIncrement.tsx`
- `packages/ui/src/components/form/TextInputNumberIncrement/TextInputNumberIncrement.module.scss`
- `packages/ui/src/components/form/TextInputNumberIncrement/TextInputNumberIncrement.test.tsx`
- `packages/ui/src/components/form/TextInputHHMMSS/TextInputHHMMSS.tsx`
- `packages/ui/src/components/form/TextInputHHMMSS/TextInputHHMMSS.module.scss`
- `packages/ui/src/components/form/TextInputHHMMSS/TextInputHHMMSS.test.tsx`

#### Files Modified

- `packages/ui/src/index.ts`
- `apps/web/src/components/Boost/BoostFormFields.tsx`
- `apps/web/src/components/Clip/ClipForm.tsx`
- `apps/web/src/components/Form/SearchInput.tsx`
- `apps/web/src/components/**` (auth, modal, settings, playlist, set-password, add-by-rss — **TextInput** import paths)
- `.llm/plans/active/web-form-shared-ui/COPY-PASTA.md`

#### Files Deleted (apps/web)

- `apps/web/src/components/Form/TextInput.tsx`
- `apps/web/src/components/Form/TextInputNumber.tsx`
- `apps/web/src/components/Form/TextInputNumberIncrements.tsx`
- `apps/web/src/components/Form/TextInputHHMMSS.tsx`
- `apps/web/src/styles/components/Form/TextInput.module.scss`
- `apps/web/src/styles/components/Form/TextInputNumber.module.scss`
- `apps/web/src/styles/components/Form/TextInputNumberIncrements.module.scss`
- `apps/web/src/styles/components/Form/TextInputHHMMSS.module.scss`

## Session 5 — 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/web-form-shared-ui/COPY-PASTA.md:40-42

#### Key Decisions

- Promoted rich **`FormTextArea`** (distinct from primitive **`TextArea`**), **`SearchInput`** (composes **`TextInput`**),
  and **`TextCheckboxes`** into **`packages/ui`** with web SCSS as baseline; **`CheckboxField` /
  `CheckboxFieldList`** remain layout/primitive helpers — **`TextCheckboxes`** stays a separate multi-select control.
- **`SearchInput`** uses **`ReturnType<typeof setTimeout>`**, relative **`TextInput`** import, and **`useEffect`**
  deps **`[inputValue, onSearch]`**; **`inputValue ?? ''`** for controlled display value.
- **`TextCheckboxOption`** exported alongside **`TextCheckboxes`** for typed option lists.
- Removed **`apps/web/src/components/Form/`** and remaining **`apps/web/src/styles/components/Form/`** artifacts.
- Vitest: **`FormTextArea`** maxLength truncation via stateful harness. Plan phase **04** marked complete in **COPY-PASTA**;
  **`04-promote-textarea-search-and-checkbox-groups.md`** moved to **`.llm/plans/completed/web-form-shared-ui/`**.

#### Files Created (packages/ui)

- `packages/ui/src/components/form/FormTextArea/FormTextArea.tsx`
- `packages/ui/src/components/form/FormTextArea/FormTextArea.module.scss`
- `packages/ui/src/components/form/FormTextArea/FormTextArea.test.tsx`
- `packages/ui/src/components/form/SearchInput/SearchInput.tsx`
- `packages/ui/src/components/form/TextCheckboxes/TextCheckboxes.tsx`
- `packages/ui/src/components/form/TextCheckboxes/TextCheckboxes.module.scss`

#### Files Modified

- `packages/ui/src/index.ts`
- `apps/web/src/components/Boost/BoostFormFields.tsx`
- `apps/web/src/components/Settings/Panels/SettingsProfile/SettingsProfile.tsx`
- `apps/web/src/components/Playlist/PlaylistForm.tsx`
- `apps/web/src/components/Modal/ModalDisclaimer.tsx`
- `apps/web/src/app/search/SearchPageListHeader.tsx`
- `apps/web/src/components/ItemTranscript/ItemTranscript.tsx`
- `.llm/plans/active/web-form-shared-ui/COPY-PASTA.md`

#### Files Deleted (apps/web)

- `apps/web/src/components/Form/TextArea.tsx`
- `apps/web/src/components/Form/SearchInput.tsx`
- `apps/web/src/components/Form/TextCheckboxes.tsx`
- `apps/web/src/styles/components/Form/TextArea.module.scss`
- `apps/web/src/styles/components/Form/TextCheckboxes.module.scss`
- `apps/web/src/styles/components/Form/SearchInput.module.scss`

## Session 6 — 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/web-form-shared-ui/COPY-PASTA.md:46-49

#### Key Decisions

- **Phase 05 verification:** No remaining **`apps/web`** imports from **`components/Form/`** or **`/Form/`** paths;
  **`apps/web/src/components/Form/`** and **`apps/web/src/styles/components/Form/`** are already absent (cleanup done in phase **04**).
- **`apps/web/AGENTS.md`** already requires **`@podverse/ui`** imports and forbids local re-export wrappers — no edit needed.
- Marked phase **05** complete in **COPY-PASTA**; moved **`05-apps-web-migration-and-cleanup.md`** to **`.llm/plans/completed/web-form-shared-ui/`**.

#### Files Modified

- `.llm/plans/active/web-form-shared-ui/COPY-PASTA.md`

## Session 7 — 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/web-form-shared-ui/COPY-PASTA.md:53-56

#### Key Decisions

- **management-web** labeled single-line fields migrated from **`Input`** + **`Label`** (+ **`FormGroup`**) to shared **`TextInput`** with **`eyebrow`**; helper copy moved to **`info`** where it replaced trailing **`FormHintText`**.
- **Feed flag status** primitive **`TextArea`** notes → **`FormTextArea`**; lookup and numeric overrides → **`TextInput`**; spam override **`FormHintText`** folded into **`info`** on **`TextInput`**.
- **Invite link** row on **New User** keeps **`Input`** + **`Label`** beside **`CopyToClipboardButton`** (split layout). **`Label` + `Select`** / **`CheckboxField`** unchanged.
- **`TextInputProps`** extended with typed **`required`**, **`minLength`**, **`maxLength`**, **`autoComplete`**, **`onKeyDown`** so management forms compile without assertions.

#### Files Modified

- `packages/ui/src/components/form/TextInput/TextInput.tsx`
- `apps/management-web/src/app/page.tsx`
- `apps/management-web/src/app/(management)/database/[table]/[id]/RowDetailPageClient.tsx`
- `apps/management-web/src/app/(management)/database/[table]/new/CreateRowPageClient.tsx`
- `apps/management-web/src/app/(management)/stats/StatsPageClient.tsx`
- `apps/management-web/src/app/(management)/users/UsersListPageClient.tsx`
- `apps/management-web/src/app/(management)/storage/StoragePageClient.tsx`
- `apps/management-web/src/app/(management)/workers/WorkersPageClient.tsx`
- `apps/management-web/src/app/(management)/admins/new/NewAdminPageClient.tsx`
- `apps/management-web/src/app/(management)/admins/[id]/edit/EditAdminPageClient.tsx`
- `apps/management-web/src/app/(management)/products/memberships/ProductMembershipsPageClient.tsx`
- `apps/management-web/src/app/(management)/users/new/NewUserPageClient.tsx`
- `apps/management-web/src/app/(management)/users/[id]/edit/EditUserPageClient.tsx`
- `apps/management-web/src/app/(management)/feed-operations/flag-status/FlagStatusPageClient.tsx`
- `.llm/plans/active/web-form-shared-ui/COPY-PASTA.md`

#### Plan artifacts

- **`06-management-web-convergence.md`** moved to **`.llm/plans/completed/web-form-shared-ui/`**.

## Session 8 — 2026-05-06

#### Prompt (Developer)

@podverse/.llm/plans/active/web-form-shared-ui/COPY-PASTA.md:60-62

#### Key Decisions

- **Phase 07 verification:** `./scripts/nix/with-env npm run lint` (after Prettier fixes), **`build:packages`**,
  **`build -w apps/web`**, **`build -w apps/management-web`**, **`npm run test -w @podverse/ui`** — all passed.
- **Playwright:** `make e2e_test_web_report_spec SPEC=e2e/smoke.spec.ts` failed in agent env (**`psql`** unavailable
  during **`test_db_init`**); user should run scoped Make E2E targets locally with full toolchain.
- **No new E2E files:** Existing specs remain valid for **`TextInput` / `FormTextArea`** (labels/roles unchanged from
  user perspective).
- **Prettier:** Ran **`prettier:write`** for files failing **`prettier:check`** during lint (includes **`packages/ui`**
  drift).
- **Plan archive:** Entire **`web-form-shared-ui`** plan set moved from **`.llm/plans/active/`** to
  **`.llm/plans/completed/web-form-shared-ui/`** (phases **01**–**07**, **`COPY-PASTA`**, **`00-SUMMARY`**,
  **`00-EXECUTION-ORDER`**).

#### Files Modified

- `.llm/plans/completed/web-form-shared-ui/COPY-PASTA.md`
- `.llm/plans/completed/web-form-shared-ui/07-verification-and-rollout.md`
- Prettier formatting fixes as applied by **`npm run prettier:write`** (see git diff for full list)

## Session 9 — 2026-05-06

#### Prompt (Agent)

Conversation handoff: finish phase 07 lint — confirm full **`npm run lint`** after Prettier on **`Banner.tsx`** /
**`Banner.test.tsx`** and index cleanup for removed **`MembershipExpiredBanner.module.scss`**.

#### Key Decisions

- **`prettier --write`** on **`packages/ui/src/components/layout/Banner/Banner.tsx`** and **`Banner.test.tsx`**
  cleared remaining **`prettier:check`** failures; **`./scripts/nix/with-env npm run lint`** completed successfully
  (type-check, ESLint, Prettier).
- **`git rm --cached`** on **`apps/web/src/styles/components/Banner/MembershipExpiredBanner.module.scss`** so the
  deleted SCSS file no longer breaks **`prettier:check`** via phantom tracked path.

#### Files Created/Modified

- `packages/ui/src/components/layout/Banner/Banner.tsx`
- `packages/ui/src/components/layout/Banner/Banner.test.tsx`
- `.llm/plans/completed/web-form-shared-ui/07-verification-and-rollout.md`
- `.llm/history/active/web-form-shared-ui/web-form-shared-ui-part-01.md`
