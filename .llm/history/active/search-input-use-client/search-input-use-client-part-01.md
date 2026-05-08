# search-input-use-client

**Started:** 2026-05-07  
**Author:** Agent  
**Context:** Next.js App Router treats `@podverse/ui` `SearchInput` as RSC without `'use client'`.

---

### Session 1 - 2026-05-07

#### Prompt (Developer)

Fix SearchInput Server Component build error

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added **`'use client'`** to **[`packages/ui/src/components/form/SearchInput/SearchInput.tsx`](packages/ui/src/components/form/SearchInput/SearchInput.tsx)** so hooks (**`useEffect`**, **`useRef`**, **`useState`**, **`useCallback`**) are valid when imported from Next.js Server Components / layouts.

#### Files Created/Modified

- `packages/ui/src/components/form/SearchInput/SearchInput.tsx`

---

### Session 2 - 2026-05-07

#### Prompt (Developer)

debug you don't need to lint

#### Key Decisions

- Added **`'use client'`** to **`packages/ui/src/components/form/TextInput/TextInput.tsx`** (**`useRef`**) so **`SearchInput`** / **`TextInput`** chains resolve as Client Components under the App Router.

#### Files Created/Modified

- `packages/ui/src/components/form/TextInput/TextInput.tsx`

---

### Session 3 - 2026-05-07

#### Prompt (Developer)

debug

#### Key Decisions

- Added **`'use client'`** to **`packages/ui/src/components/navigation/DropdownMenu/DropdownMenu.tsx`** (**`useCallback`**, **`useEffect`**, **`useRef`**) for App Router Client Component boundary.

#### Files Created/Modified

- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenu.tsx`

---

### Session 4 - 2026-05-07

#### Prompt (Developer)

debug

#### Key Decisions

- Added **`'use client'`** to **`packages/ui/src/components/navigation/DropdownMenu/DropdownMenuContext.tsx`** (**`createContext`**) so context is created on the client when imported from App Router Server Components.

#### Files Created/Modified

- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenuContext.tsx`

---

### Session 5 - 2026-05-07

#### Prompt (Developer)

sweep through all the staged changes, and try to guess and preempt which if any of the other files will need 'use client"

#### Key Decisions

- Scanned staged **`packages/ui/**/\*.tsx`** (excluding tests): only **`DropdownMenuItem.tsx`** and **`DropdownMenuLinkItem.tsx`** used **`useContext`** without a leading **`'use client'`**; added the directive (same RSC rule as **`DropdownMenuContext`\*\*).
- Other staged UI modules using hooks already had **`'use client'`**.
- **`IconButton`** uses **`forwardRef`** only (no hooks): typically safe for RSC imports unless Next surfaces **`forwardRef`** as client-only (watch if builds complain).
- Staged **`apps/web`** modules (**`BoostFormFields`**, **`ItemTranscript`**, **`LocalSettings`**) use hooks without their own directive but are imported only under existing Client boundaries (**`BoostFormBase`**, **`dynamic()`** from **`'use client'`** lists, **`Providers`**) — **no** extra directive needed.

#### Files Created/Modified

- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenuItem.tsx`
- `packages/ui/src/components/navigation/DropdownMenu/DropdownMenuLinkItem.tsx`

---

### Session 6 - 2026-05-07

#### Prompt (Developer)

debug

#### Key Decisions

- Added **`'use client'`** to **`packages/ui/src/hooks/useDropdownKeyboardNavigation.ts`** (**`useState`**, **`useEffect`**) so the hook module is a Client Component boundary when imported from App Router Server Components.

#### Files Created/Modified

- `packages/ui/src/hooks/useDropdownKeyboardNavigation.ts`

---

### Session 7 - 2026-05-07

#### Prompt (Developer)

there is something wrong with the styles of the more button either component is wrong or the scss theme/s need fixes. i can't see the three dots buttons at all

#### Key Decisions

- **`MoreButton`** used a native `<button>` with almost no reset: UA light button backgrounds plus **`color`** tied to primary text made the **ellipsis (white `currentColor`) invisible on a pale circle**.
- Updated **`MoreButton.module.scss`**: **`appearance: none`**, **`background: transparent`**, **`border`** aligned with **`IconButton`** controls, explicit **`font-size`** for **`FaEllipsis`**, hover/focus-visible affordances, **`color: var(--text-color-primary)`**.

#### Files Created/Modified

- `packages/ui/src/components/button/MoreButton/MoreButton.module.scss`

---

### Session 8 - 2026-05-07

#### Prompt (Developer)

these selectors are crazy large. they should be more aligned with other inputs throughout the app. fix so they are more consistent wherever they're used

#### Key Decisions

- **`FormDropdown`** root **`.wrapper`** used **`flex: 1`**, so inside **`StackForm` / `FormStack`** (column flex) each dropdown **grew vertically** to fill shared space; **`.dropdownInnerWrapper`** used **`justify-content: center`**, which **centered** the trigger in the tall area → huge purple boxes (management Settings + web forms).
- Set **`flex: 0 1 auto`**, **`width: 100%`**, **`min-height: 0`** on **`FormDropdown`** wrapper chain; **`justify-content: flex-start`** on **`dropdownInnerWrapper`**.
- Mirrored the same **anti-stretch** pattern on **`TextInput`** (`.textInput`, `.textInputWrapper`, `.textInnerInputWrapper`) so stacked fields stay **content-height** and aligned.

#### Files Created/Modified

- `packages/ui/src/components/form/FormDropdown/FormDropdown.module.scss`
- `packages/ui/src/components/form/TextInput/TextInput.module.scss`

---

### Session 9 - 2026-05-07

#### Prompt (Developer)

Settings selectors still oversized — follow-up plan

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Removed **`flex: 1`** from **`formInputWrapper`** mixin ([`_form.scss`](packages/ui/src/styles/mixins/_form.scss)) so input shells never implicitly participate in flex growth; **`FormTextArea`** `.textAreaWrapper` gets explicit **`flex: 0 1 auto`**, **`width: 100%`**, **`min-height: 0`** (aligned with **`FormDropdown`** / **`TextInput`**).
- **`FormDropdown`**: **`margin-bottom: 0`** on `.wrapper` (spacing comes from **`StackForm`/`FormStack`** / **`FormGroup`**); **`.dropdownButton`** **`box-sizing`**, **`display: block`**, **`min-height: min-content`** to avoid UA **`all: unset`** odd sizing.
- **Management Settings**: single **`Card`** with both **`FormGroup`**s ([`SettingsPageClient.tsx`](<apps/management-web/src/app/(management)/settings/SettingsPageClient.tsx>)).
- **`TableIconDeleteButton`**: removed invalid **`type`** prop on **`IconButton`** (use defaults / **`htmlButtonType`** when needed) so **`management-web` build** passes.

#### Files Created/Modified

- `packages/ui/src/styles/mixins/_form.scss`
- `packages/ui/src/components/form/FormTextArea/FormTextArea.module.scss`
- `packages/ui/src/components/form/FormDropdown/FormDropdown.module.scss`
- `apps/management-web/src/app/(management)/settings/SettingsPageClient.tsx`
- `packages/ui/src/components/table/Table/TableIconActions.tsx`
