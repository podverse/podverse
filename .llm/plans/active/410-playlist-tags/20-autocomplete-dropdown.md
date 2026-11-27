**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

## Rows

R4, R6, R8

This plan is the reusable autocomplete dropdown. It runs a search callback while the person types (R4) and lets them select a match (R6). It is the dropdown half of R8. Plan 21 is the tag control that places tags in this field and covers the tag face and the remove control.

## Runs after

none

## Files

- packages/ui/src/components/form/AutocompleteDropdown/AutocompleteDropdown.tsx (new)
- packages/ui/src/components/form/AutocompleteDropdown/AutocompleteDropdown.module.scss (new)
- packages/ui/src/components/form/AutocompleteDropdown/AutocompleteDropdown.test.tsx (new)
- packages/ui/src/components/form/AutocompleteDropdown/index.ts (new)
- packages/ui/src/index.ts (insert the two export lines immediately after the `FormDropdownProps` export from `./components/form/FormDropdown/index`)
- packages/ui/PACKAGES-UI.md (insert the section under Package doc; do not rewrite the file)

## Tests

Colocated Vitest file `AutocompleteDropdown.test.tsx`, same harness as `packages/ui/src/components/form/FormDropdown/FormDropdown.test.tsx` (`@testing-library/react`, `vitest`). No Playwright spec and no API test. This package does not render a screen.

Cover these behaviors and stop. No snapshots and no assertion on a class name or a pixel value.

- A trimmed query calls `search` once, and only after `AUTOCOMPLETE_SEARCH_DEBOUNCE_MS`. Advancing fake timers by one millisecond less does not call it. Typing a second character before the delay calls `search` once, with the later trimmed query.
- A query that trims to empty never calls `search` and never shows a listbox.
- An older, slower response does not replace options from a newer query. Resolve the later promise first, then the earlier one, and assert only the later options are shown.
- A rejected `search` shows no listbox and calls `onSearchError` with the rejection. It does not throw out of the component.
- Clicking an option calls `onSelect` with that option object. A response that opens the list does not set a highlight. Enter then calls `onEnter` with the current query and does not call `onSelect`. ArrowDown, then Enter, calls `onSelect` with the first option. Enter while the list is closed calls `onEnter` with the current query and does not call `onSelect`.
- Escape closes the list and leaves the query unchanged. A following ArrowDown opens it again when options are already stored.
- The clear button is absent while the query is empty. Activating it calls `onQueryChange` with `''` and closes the list. The input keeps focus.
- With `info` set, the open list is inside the field wrapper and is not inside the info element (same assertion shape as the FormDropdown info test).
- `aria-expanded` is false while closed and true while the list is open. The input's `aria-activedescendant` is the highlighted option id while a row is highlighted, and is absent while the list is open with no highlight.
- Rendering without `eyebrow` and without `inputLabel` throws the developer error named under Props.

Use `vi.useFakeTimers()` the way `SearchInput.test.tsx` does, and import `AUTOCOMPLETE_SEARCH_DEBOUNCE_MS` from the component module so the delay is not copied as a second number.

## Release scratchpad

none

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. This set does not open a second issue. `00-REQUEST.md` records that 410 is the open playlist-tag issue. This step did not run `gh` again.

## Outcome

Add `AutocompleteDropdown` to `@podverse/ui`: a text field with a suggestion list. The app passes a search function and the labels. The component never calls `fetch`, never imports `@podverse/helpers-requests`, and never contains a user-facing string.

Playlist create and edit do not mount this component themselves. Plan 21's `TagField` is what those screens will use. The dropdown is public so the suggestion list is a real component, not a private block inside the tag field.

## Reuse

- Field chrome follows `TextInput` and `SearchInput`: `@include formInputWrapper` and `@include formFieldEyebrow` from `packages/ui/src/styles/mixins/_form.scss`, inset eyebrow, and the clear control (`IconButton` `appearance="ghost"`, `FaXmark` from `react-icons/fa6`). Do not render the magnifying glass. This field is not the site search box.
- The list copies the look of `FormDropdown`'s `.dropdownMenu` and `.menuItem` in `FormDropdown.module.scss` (same tokens, in-place absolute list, not a portaled `DropdownMenuPanel`). Copy the rules into the new scss module. Do not change `FormDropdown`.
- Call `useDropdownViewportClamp` (`packages/ui/src/hooks/useDropdownViewportClamp.ts`) with `fullWidth: true`, `position: 'left'`, and `verticalPosition: 'below'`. Do not change that hook.
- Do not call `useDropdownKeyboardNavigation`. That hook is for a button trigger: Space and Enter open it, and it moves DOM focus onto a `menuitem`. A text field cannot use that model. Copy only the outside-pointer and Escape ideas into this component, as specified under Behavior.

`TextInput` does not accept combobox attributes on its public props (`role`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete`). Render a native `<input type="text">` here. Do not edit `TextInput` to pass them through.

## Leave unchanged

- `packages/ui/src/components/navigation/Chip/Chip.tsx` and `Chip.module.scss`
- `packages/ui/src/components/form/FormDropdown/FormDropdown.tsx` and `FormDropdown.module.scss`
- `packages/ui/src/components/form/SearchInput/SearchInput.tsx`
- `packages/ui/src/components/form/TextInput/TextInput.tsx` and `TextInput.module.scss`
- `packages/ui/src/hooks/useDropdownKeyboardNavigation.ts`
- Every app screen, catalog file, and API file

Imports in the tsx file are extensionless. The scss import is the last import. Named exports only. `'use client'` at the top, matching `FormDropdown.tsx`. No `any`. No type assertion. `===` / `!==` only. Comments describe the code as it stands and do not mention a plan, a row number, or a step number.

## Props

```tsx
export const AUTOCOMPLETE_SEARCH_DEBOUNCE_MS = 450;

export type AutocompleteOption = {
  id: string;
  label: string;
  value: string;
};

export type AutocompleteDropdownProps = {
  id: string;
  query: string;
  onQueryChange: (query: string) => void;
  search: (query: string) => Promise<readonly AutocompleteOption[]>;
  onSelect: (option: AutocompleteOption) => void;
  /** Enter while no option is highlighted. The current query, untrimmed. */
  onEnter?: (query: string) => void;
  /** Blur of the text field. The current query, untrimmed. */
  onBlur?: (query: string) => void;
  onSearchError?: (error: unknown) => void;
  listLabel: string;
  clearQueryLabel: string;
  /** Names the input when `eyebrow` is absent. */
  inputLabel?: string;
  eyebrow?: string;
  placeholder?: string;
  info?: string;
  infoError?: string;
  /** Rendered inside the bordered box, before the text field. */
  leading?: ReactNode;
  disabled?: boolean;
  maxLength?: number;
  autoFocus?: boolean;
  className?: string;
};
```

`search` receives the trimmed query. The component does not filter, sort, or rewrite options. It renders `option.label` and passes the same object to `onSelect`.

Developer errors, thrown while rendering, in American English:

- Missing `eyebrow` and missing or empty `inputLabel`: `AutocompleteDropdown: pass eyebrow or inputLabel`.
- Empty `listLabel` or empty `clearQueryLabel`: `AutocompleteDropdown: listLabel and clearQueryLabel are required`.

No default English for those props.

## Behavior

Debounce. The delay is `AUTOCOMPLETE_SEARCH_DEBOUNCE_MS` (450), the same delay as `SEARCH_DEBOUNCE_MS` in `apps/mobile/src/screens/search/SearchScreen.tsx`. `SearchInput` waits 1000ms because that search replaces a page of results. This one is a short suggestion list, so it uses 450. Trailing debounce: each query change restarts the timer. Hold `search` and `onSearchError` in refs, the way `SearchInput` holds `onSearch`, so a new function identity does not restart the timer.

Do not call `search` when `query.trim()` is empty. Cancel a pending timer, drop stored options, and close the list. Do not call `search` when `disabled` is true.

Stale responses. Increment a generation counter when a search is scheduled. When the promise settles, update options only if that generation is still current and the trimmed query is still the one that was sent. A rejection uses the same guard, then clears options and calls `onSearchError`. The component does not log and does not show the error text.

Opening the list. After a current response with one or more options, open the list with no highlight. Enter then calls `onEnter` with the query, so the typed name is what the key commits. A response with no options closes the list. Changing the query closes the list immediately so the previous query's names are not shown while the next search runs. Set `aria-busy` on the input for that in-flight gap. No spinner and no loading label: a spinner inside the box would change the field's size.

Highlight. When nothing is highlighted, ArrowDown sets index 0 and ArrowUp sets the last index. When a row is highlighted, ArrowDown and ArrowUp move the index and wrap, using the same modulo wrap as `handleMenuKeyDown` in `useDropdownKeyboardNavigation`. They `preventDefault` so the caret does not move. Hovering an option sets the same index. When the stored options change, clear the highlight. ArrowDown while the list is closed and options are already stored opens the list at index 0. Arrow keys do nothing when there are no options.

Select. Pointer: `onMouseDown` on the option calls `preventDefault` so the text field does not blur before the activation. `onClick` calls `onSelect(option)` and closes the list. The component does not clear `query`; the parent decides that in `onSelect`. Enter while a highlight exists does the same `onSelect` and `preventDefault`. Enter while no highlight exists calls `onEnter(query)` when that prop is passed, and always `preventDefault`, so the key does not submit a surrounding form. Space types a space. It does not select.

Escape. While the list is open, a document `keydown` listener in the capture phase closes the list, clears the highlight, `preventDefault`, and `stopPropagation`, then leaves focus on the input. This matches the Escape listener in `useDropdownKeyboardNavigation` (a dialog behind the field must not dismiss). Remove the listener when the list is closed.

Outside pointer. While open, `mousedown` and `pointerdown` on `document` close the list when the event target is a `Node` outside the field wrapper (the wrapper includes the bordered box and the list). Do not close for a pointer inside that wrapper.

Blur. The input's blur handler calls `onBlur` with `event.currentTarget.value`. The clear button and each option use `onMouseDown` `preventDefault`, so activating them does not blur the input first.

Clear. Show the clear button only when `query` is non-empty and `disabled` is not set. It calls `onQueryChange('')` and moves focus back to the input. Accessible name is `clearQueryLabel`. The icon is `aria-hidden`.

Tab closes the list and does not `preventDefault`.

`maxLength`, `placeholder`, `autoFocus`, and `disabled` go on the input. `disabled` also blocks the clear button and skips search.

`info` renders under the field, outside the wrapper that anchors the list, with id `${id}-info`. `infoError` renders there too, id `${id}-error`. `aria-describedby` points at whichever of those exist. `aria-invalid` is true only when `infoError` is non-empty. Use `@include formInfoText` and `@include formInfoTextError`.

## Look

Root: column, `width: 100%`, `min-width: 0`, `position: relative`, `@include flexItemAllowShrink` from `packages/ui/src/styles/mixins/_flexShrink.scss`. Match the shrink behavior of `.textInput` in `TextInput.module.scss`.

The relative wrapper holds the bordered box and the list. Info stays outside that wrapper so an open list anchors to the box, not under the help text.

Bordered box: `@include formInputWrapper`. `display: flex`, `align-items: center`, `gap: var(--spacing-sm)`, `width: 100%`. When `leading` is set, add `flex-wrap: wrap`. Disabled box uses the same `color-mix` as `.textInputWrapperDisabled` / `.dropdownWrapperDisabled`:

```scss
background-color: color-mix(
  in srgb,
  var(--background-color-tertiary) 55%,
  var(--background-color-primary)
);
```

Eyebrow: a `<label htmlFor={id}>` inside the box, `@include formFieldEyebrow`. Omit it when `eyebrow` is absent. When `eyebrow` is set, do not also set `aria-label` from `inputLabel`. When `eyebrow` is absent, set the input `aria-label` to `inputLabel`.

Input cluster: a wrapper with `flex: 1 1 8rem`, `min-width: 8rem`, `display: flex`, `align-items: center`, containing the input and the clear button. The input copies `.input` from `TextInput.module.scss`: `all: unset`, `box-sizing: border-box`, `font-size: var(--font-size-md)`, `padding: var(--spacing-form-input-inner)`, `width: 100%`, `min-width: 0`, no outline on focus (the box already uses the inset focus ring from `formInputWrapper`). `type="text"`. `autoComplete="off"`.

Clear button: the same 28px box as `.textInputWrapper .clearButton` (`height` and `width` 28px, `margin-left: var(--spacing-md)`, color `--text-color-secondary`, hover and focus-visible color `--text-color-primary`). Icon `font-size: var(--font-size-md)`.

List, copied from `.dropdownMenu` and `.dropdownMenuFullWidth`:

- `position: absolute`
- `top: 100%`
- `left: 0`
- `width: 100%`
- `z-index: 1000000`
- `margin-top: 0.25rem`
- `margin-bottom: 0`
- `padding: var(--spacing-form-input-vertical)`
- `list-style: none`
- `background: var(--background-color-primary)`
- `border: 1px solid var(--border-color-opaque)`
- `border-radius: var(--border-radius)`
- `max-width: 100%`

Spread `viewportClampStyle` from `useDropdownViewportClamp` onto that list.

Each option, copied from `.menuItem`: `border-radius: var(--border-radius)`, `color: var(--text-color-primary)`, `cursor: pointer`, `margin: var(--spacing-md)`, `padding: var(--spacing-md) var(--spacing-xl)`, `text-align: left`. Hover, focus, and `aria-selected="true"` use `background: var(--background-color-opaque)` and `outline: none`.

No second argument to `var()`. No new design token.

## Accessibility

The input has `role="combobox"`, `aria-autocomplete="list"`, `aria-expanded` for the list, and `aria-controls={id + '-list'}` while the list is mounted. `aria-activedescendant` is `${id}-option-${index}` for the highlight, and omitted when the list is closed or no row is highlighted.

The list is `ul` with `role="listbox"`, `id={`${id}-list`}`, and `aria-label={listLabel}`. Each option is `li` with `role="option"`, `id={`${id}-option-${index}`}`, and `aria-selected`. React key is `option.id`. Do not move DOM focus into the list.

The clear control is a button with `type="button"` (`IconButton` already defaults `htmlButtonType` to `'button'`). Its name is `clearQueryLabel`. The icon is `aria-hidden`.

While a search is in flight, `aria-busy` on the input is true. There is no live region and no loading string.

## Package doc

In `packages/ui/PACKAGES-UI.md`, after the `CheckboxFieldList` bullet in `## Forms — vertical rhythm`, add one level-2 section titled `Forms — autocomplete`, then the subsection below, and nothing else.

```markdown
### `AutocompleteDropdown`

[`AutocompleteDropdown`](src/components/form/AutocompleteDropdown/AutocompleteDropdown.tsx) is a text field plus a suggestion list. The app passes `search` and every visible string. The field does not call the network itself.

The list is an in-place `listbox` under the bordered box, clamped with `useDropdownViewportClamp`. It uses the same tokens as `FormDropdown`'s menu. Focus stays in the text field; the highlighted row is `aria-activedescendant`.
```

## Index

Insert immediately after the `FormDropdownProps` export:

```tsx
export { AutocompleteDropdown } from './components/form/AutocompleteDropdown/index';
export type {
  AutocompleteDropdownProps,
  AutocompleteOption,
} from './components/form/AutocompleteDropdown/index';
```

`index.ts` in the component folder exports the component, `AUTOCOMPLETE_SEARCH_DEBOUNCE_MS`, and those two types. Plan 21 adds `TagField` immediately after this block. Do not rewrite `packages/ui/src/index.ts`.
