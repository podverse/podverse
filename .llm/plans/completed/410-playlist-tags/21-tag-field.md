**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

## Rows

R4, R6, R8, R9, R10, R33, R34, R36

This plan is the reusable tag control. It uses plan 20's dropdown so typing runs the app's search (R4) and a chosen row becomes a tag (R6). Together with that dropdown it is the tag control in R8. Each tag shows its text, a border, a background, and rounded corners (R9). A remove control sits on the right when editing is possible (R10). Enter adds the typed name, blur does not, and there is no create row (R33). At the count cap the text box hides and the caller's sentence is shown (R34). A failed search leaves Enter able to add the typed name (R36). The playlist form passes the sentence and the error text.

## Runs after

20

## Files

- packages/ui/src/components/form/TagField/TagField.tsx (new)
- packages/ui/src/components/form/TagField/TagField.module.scss (new)
- packages/ui/src/components/form/TagField/TagField.test.tsx (new)
- packages/ui/src/components/form/TagField/index.ts (new)
- packages/ui/src/index.ts (insert the two export lines immediately after the `AutocompleteOption` export that plan 20 added)
- packages/ui/PACKAGES-UI.md (insert the `TagField` subsection immediately after the `AutocompleteDropdown` subsection that plan 20 added)

## Tests

Colocated Vitest file `TagField.test.tsx`, same harness as `FormDropdown.test.tsx`. No Playwright spec and no API test. The form that mounts this control is a later plan.

Mock `search` with `vi.fn`. Do not assert class names or pixel values. Cover these and stop:

- Typing a query and advancing `AUTOCOMPLETE_SEARCH_DEBOUNCE_MS` calls `search` with the trimmed query. Rendering the field does not call `fetch`.
- Resolving `search` with `['Podcasting']` for the query `pod` shows that name as an option and no other option. Enter calls `onChange` with `['pod']` and clears the text field. Activating the `Podcasting` option calls `onChange` with `['Podcasting']` and clears the text field.
- Resolving `search` with `['Podcasting']` for the query `podcasting` shows that option. Enter calls `onChange` with `['podcasting']`, the trimmed typed text. Activating the option calls `onChange` with `['Podcasting']`, the suggestion's casing.
- A value of `['Podcasting']` and a search result of `['podcasting']` shows no option. Enter does not call `onChange`. The text field clears.
- The remove button's accessible name is `removeLabel(tag)`. Activating it calls `onChange` with that tag gone. `readOnly` renders the tag text, no remove button, and no combobox. `search` is not called.
- `readOnly` and `value={[]}` render no tag text and no combobox.
- `maxCount={1}`, one tag, and `limitMessage="A playlist has at most 1 tags."`: no combobox, and that sentence is visible. After remove, the combobox is back and the sentence is gone.
- Blur with `hello` in the field does not call `onChange`. Enter with `hello` calls `onChange` once with that trimmed tag appended, including when a tag was already in `value`. The assertion reads the array passed to `onChange`, so a stale `value` prop cannot hide a dropped tag.
- A rejected `search` shows no option and does not call `onChange`. Enter then calls `onChange` with the trimmed query.
- `commitTagDraft` appends a trimmed draft, returns the same array for a duplicate, `at-max`, `too-long`, and `empty`, and returns a new array only for `added`.
- Editable render without `search`, without `onChange`, or without the required label fields throws the developer error named under Props.

Advance timers with `AUTOCOMPLETE_SEARCH_DEBOUNCE_MS` imported from `AutocompleteDropdown`, the way plan 20's tests do.

## Release scratchpad

none

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. This set does not open a second issue. `00-REQUEST.md` records that 410 is the open playlist-tag issue. This step did not run `gh` again.

## Outcome

Add `TagField` to `@podverse/ui`. Editable mode is a bordered field: existing tags, a text field, and plan 20's suggestion list. Read-only mode is the tags alone, for a playlist page that is not a form.

The control holds the tag list the app already has. It does not create a tag on the server. A new name becomes another string in `onChange`. The playlist save, in a later plan, is what stores it.

Strings stay in the app. This plan adds no catalog keys.

## Reuse

Compose `AutocompleteDropdown` from plan 20. Pass the tags as its `leading` content, inside the same bordered box as the text field. Do not build a second suggestion list.

Do not render `Chip`. `Chip` is a `<button>`. A remove button inside it would nest buttons. The tag face copies Chip's unselected filter metrics from `Chip.module.scss` (`.chip` plus `.filter`) into `TagField.module.scss`. It does not use `.pill` or `.selected`. Filter uses `border-radius: var(--border-radius)` (0.625rem, rounded corners). Pill uses `border-radius: var(--border-radius-round)` (a full stadium). The request asks for rounded corners, a border or a background, and the text. The filter face has the text, the border, and the background.

The remove icon is `FaXmark` from `react-icons/fa6` inside `IconButton` with `appearance="ghost"` and `htmlButtonType="button"`. Ghost has no border of its own, so the tag keeps a single border. Do not use `appearance="control"` (that adds a second bordered box).

Leave `Chip`, `FormDropdown`, `SearchInput`, `TextInput`, and `AutocompleteDropdown` unchanged. `TagField` only imports the dropdown.

## Leave unchanged

- Plan 20's files, except the export block and the package doc insertion named under Files
- App screens, catalog files, and API files

`'use client'` at the top. Extensionless imports. The scss import is last. Named exports only. No `any`. No type assertion. `===` / `!==` only. No comment that cites a plan, a row, or a step.

## Props

```tsx
export type TagDraftCommitStatus = 'empty' | 'at-max' | 'too-long' | 'duplicate' | 'added';

export type TagDraftCommitResult = {
  status: TagDraftCommitStatus;
  tags: readonly string[];
};

export function commitTagDraft(input: {
  tags: readonly string[];
  draft: string;
  maxCount?: number;
  maxLength?: number;
}): TagDraftCommitResult;

export type TagFieldLabels = {
  /** Accessible name of the remove control, for example the app's "Remove {tag}". */
  removeLabel: (tag: string) => string;
  /** Accessible name of the suggestion list. */
  listLabel: string;
  /** Accessible name of the control that clears the typed text. */
  clearQueryLabel: string;
  /** Names the text field when `eyebrow` is absent. */
  inputLabel?: string;
};

export type TagFieldProps = {
  id: string;
  value: readonly string[];
  onChange?: (tags: readonly string[]) => void;
  search?: (query: string) => Promise<readonly string[]>;
  readOnly?: boolean;
  disabled?: boolean;
  /** When set, the text field is omitted once `value.length` reaches it. */
  maxCount?: number;
  /** Forwarded to the text field. Typing stops at this length. This component does not pick a number. */
  maxLength?: number;
  /**
   * Shown in place of the text field once `maxCount` is reached, when non-empty.
   * The app formats it. This component does not invent a sentence.
   */
  limitMessage?: string;
  /** Controlled text. Omit it and TagField keeps the text itself. */
  draft?: string;
  /** Called with the text field's next value, including `''`. */
  onDraftChange?: (draft: string) => void;
  /** Forwarded to the dropdown. This component does not show the error string. */
  onSearchError?: (error: unknown) => void;
  eyebrow?: string;
  placeholder?: string;
  info?: string;
  infoError?: string;
  labels?: TagFieldLabels;
  autoFocus?: boolean;
  className?: string;
};
```

`readOnly` defaults to false. Editable mode (`readOnly` not true) requires `onChange`, `search`, and `labels` with `removeLabel`, `listLabel`, and `clearQueryLabel`. It also requires a non-empty `eyebrow` or a non-empty `labels.inputLabel`. Otherwise throw, while rendering:

`TagField: editable field requires search, onChange, labels.removeLabel, labels.listLabel, labels.clearQueryLabel, and eyebrow or labels.inputLabel`

Read-only mode ignores `search`, `onChange`, `labels`, `placeholder`, `maxCount`, and `limitMessage`. Do not throw when those are omitted.

The component does not hard-code 5 or 50. The playlist form passes the configured count and the configured character cap. A caller that omits `maxCount` is not capped here. A caller that omits `maxLength` does not stop typing here.

Export `commitTagDraft`, `TagDraftCommitStatus`, and `TagDraftCommitResult` from the component folder `index.ts` and from `packages/ui/src/index.ts` next to `TagField`.

## How a name becomes a tag

Compare with trim, then `toLowerCase`. `commitTagDraft` in `TagField.tsx` is that check. Do not add a helper package and do not import the API. The phone has its own copy of the same checks (`commitPlaylistTagDraft` in plan 30). Do not import the phone module, and do not make the phone import this package.

`commitTagDraft` trims `draft` and then:

- Trimmed length `0` → `empty`, same `tags` reference.
- `maxCount` is a number and `tags.length >= maxCount` → `at-max`, same reference. Check this before the duplicate check.
- `maxLength` is a number and the trimmed length is greater than it → `too-long`, same reference. The text field also stops at `maxLength`, so typing cannot reach this. The function still refuses a longer string.
- Some tag's `trim().toLowerCase()` equals the trimmed draft's `toLowerCase()` → `duplicate`, same reference.
- Otherwise → `added`, a new array that ends with the trimmed draft. Do not change its casing.

Keep a ref that always holds the last list passed to `onChange` or received in `value`. Every add and remove writes that ref first, then calls `onChange` with the ref's array. A remove and Enter can both run before the parent re-renders; the second call must see the first.

`applyCommit(draft: string)` calls `commitTagDraft` with the ref, that draft, `maxCount`, and `maxLength`.

- `added` → write the ref, call `onChange`, then set the query to `''`.
- `duplicate` or `empty` → set the query to `''`. Do not call `onChange`.
- `at-max` or `too-long` → leave the query and the list as they are. Do not call `onChange`. There is no sentence for `too-long`. The count sentence is `limitMessage`, and only when the box is hidden.

Two ways to add inside this component, both through `applyCommit`:

- Enter while no suggestion row is highlighted calls `applyCommit` with the field's current text. Plan 20 opens the list with no highlight, so Enter adds the trimmed typed name even when suggestions are visible. Enter does not submit the surrounding form. That `preventDefault` stays in the dropdown.
- Activating a suggestion (click, or ArrowDown and then Enter) calls `applyCommit` with `option.value`. That string is the name the search returned, so the tag uses the stored casing. It does not also commit the typed query.

Do not pass `onBlur`. Blur does not add a tag. Do not add a create row.

There is no third control that inserts the typed name. The playlist form calls `commitTagDraft` itself on Submit, with the draft it was given through `onDraftChange`, so text still in the box is included in the save. This component does not know about that button.

When `draft` and `onDraftChange` are both passed, the dropdown's query is `draft` and every query change calls `onDraftChange` (including `''`). Do not keep a second copy. When either is omitted, keep the query in state, starting at `''`, and still call `onDraftChange` when that prop is passed.

Setting the query to `''` after a duplicate still happens, so the typed copy of a tag that is already there does not stay in the field.

Do not remove a tag on Backspace. The remove control is the only way to remove one.

Do not split on comma, space, or paste. One commit is one tag.

## Search results

The function passed to the dropdown's `search` is an adapter:

- Await the app's `search(trimmedQuery)`.
- On rejection, rethrow. The dropdown clears the list and calls `onSearchError`. This component does not log and does not invent an error sentence. The app passes that sentence as `infoError`. Enter still runs `onEnter`, because the list has no highlighted row.
- Drop names whose key matches a tag already in the ref.
- Keep the returned order. Do not append a row for the typed query. There is no create option and no `createLabel`.
- Suggestion `id` and `value` are the name string from `search`. `label` is that same string.

If every name was dropped, return an empty list. The dropdown stays closed. Enter clears the query when the trimmed text is empty or already selected, and does not call `onChange`.

The adapter returns `AutocompleteOption` values. `onSelect` calls `applyCommit(option.value)`. The dropdown suppresses blur on an option pointer (plan 20). Enter on a highlighted row selects; it does not also call `onEnter`. Enter with no highlight calls `onEnter` only.

Pass `onEnter` so it calls `applyCommit` with the query string the dropdown reports. Do not pass `onBlur`.

Pass `listLabel`, `clearQueryLabel`, `inputLabel`, `eyebrow`, `placeholder`, `info`, `infoError`, `onSearchError`, `disabled`, `maxLength`, `autoFocus`, and `id` through to the dropdown.

When `maxCount` is set and `value.length >= maxCount`, do not render `AutocompleteDropdown`. Tags and their remove controls stay. When `eyebrow` is set, render it with the same eyebrow styles the dropdown uses, so the field name stays while the box is hidden. When `limitMessage` is non-empty, render it under the tags as a `p` whose id is `${id}-limit`, using `@include formInfoText`. It is not `infoError` and not the danger color. When `limitMessage` is omitted or empty, render no sentence. When a remove brings the length back under the cap, render the dropdown again and omit the limit sentence. Do not render a sentence for the character cap. `maxLength` on the input is the whole of that cap.

## Read-only

`readOnly` renders no dropdown, no text field, and no remove control. Each tag is text inside the same tag face. The list is a `ul` with `list-style: none`, `display: flex`, `flex-wrap: wrap`, `gap: var(--spacing-sm)`, `margin: 0`, `padding: 0`. No bordered field behind the list.

`value` empty and `readOnly`: render `null`, including when `eyebrow` is set. The playlist page skips an empty tag block by rendering this component; an empty eyebrow with no tags is noise.

Editable and empty: render the dropdown so the person can type. The tag list is omitted when `value.length === 0`.

`eyebrow` in read-only mode, when `value` is non-empty, is a `div` with the eyebrow styles, not a `label` (there is no input). Editable mode leaves the eyebrow to `AutocompleteDropdown` while the text field is rendered. At `maxCount` this component renders that eyebrow itself, as specified above.

## Tag face

One `li` per tag, key `trim + toLowerCase`. The `li` is `display: inline-flex`, `align-items: center`, `flex: none`, `max-width: 100%`, `box-sizing: border-box`, `gap: var(--spacing-sm)`, `height: 2.25rem`, `margin: 0`, `padding: 0 var(--spacing-base)`, `white-space: nowrap`, `font-size: var(--font-size-sm)`, `font-weight: var(--font-weight-medium)`, `line-height: 1`, `color: var(--text-color-primary)`, `background: var(--background-color-secondary)`, `border: 1px solid var(--border-color-tertiary)`, `border-radius: var(--border-radius)`. Those are the unselected `.chip` and `.filter` values in `Chip.module.scss`.

The text is a `span` with `min-width: 0`, `overflow: hidden`, `text-overflow: ellipsis`. The remove control is the last item in the `li`, `flex: none`. Icon `font-size: var(--font-size-sm)` and `aria-hidden`. The button's accessible name is `labels.removeLabel(tag)`.

In the editable field, the `ul` is the dropdown's `leading` content. The `ul` uses `display: flex`, `flex-wrap: wrap`, `gap: var(--spacing-sm)`, `flex: 0 1 auto`, `width: max-content`, `max-width: 100%`, `margin: 0`, `padding: 0`, `list-style: none`, so a short list sits beside the text field and a long list wraps inside the box. Do not put the input inside the `ul`.

`disabled` sets `disabled` on each remove button and on the dropdown. Read-only has no button to disable.

There is no selected, pressed, or hover fill on the tag. It is a value, not a filter chip. The remove button keeps `IconButton`'s own focus ring.

## Package doc

Immediately after the `AutocompleteDropdown` subsection in `## Forms — autocomplete`, add:

```markdown
### `TagField`

[`TagField`](src/components/form/TagField/TagField.tsx) edits a list of short labels. The app passes `search`, `value`, `onChange`, and `labels`. Enter adds the typed name to that list. Choosing a suggestion adds the stored name. Blur does not add a name. This component does not store the name.

Each tag uses the unselected filter-chip face: text, border, background, and `var(--border-radius)`. While editing, a remove control is on the right of the tag. At `maxCount` the text field hides. A `limitMessage` from the app can name that cap. `readOnly` shows the tags without the text field or the remove control. An empty read-only value renders nothing.

The suggestion list is `AutocompleteDropdown`. The tags are its `leading` content. There is no extra row for the typed name.
```

## Index

Insert immediately after the `AutocompleteOption` export:

```tsx
export { TagField, commitTagDraft } from './components/form/TagField/index';
export type {
  TagDraftCommitResult,
  TagDraftCommitStatus,
  TagFieldLabels,
  TagFieldProps,
} from './components/form/TagField/index';
```

The component folder `index.ts` exports `TagField`, `commitTagDraft`, and those types. Do not rewrite `packages/ui/src/index.ts`. Type-only exports stay on their own line.

## What a later screen passes

This plan does not add those screens. The contract they need:

- `value` and `onChange` are the whole list. Replacing, adding, and removing are all one `onChange`. There is no separate rename of a tag; the screen removes one and adds another.
- `search` resolves to stored names. The field debounces at 450ms inside `AutocompleteDropdown`. The screen must not debounce again. On failure the screen sets `infoError` and rethrows. Enter still adds the typed name.
- Pass `draft` and `onDraftChange`. Submit calls `commitTagDraft` with that draft, `value`, and the same `maxCount` and `maxLength`, then sends `result.tags`. Blur does not add a name, so the click handler must not rely on blur having run.
- `maxCount` and `maxLength` are the configured limits. This component does not invent those numbers. `limitMessage` names the count. Do not pass a sentence for the character cap.
- Eyebrow and placeholder are different strings. Eyebrow is the field name. Placeholder is an instruction, for example a sentence-case "Type a tag" against a title-case "Tags".
- Suggested English, owned by the screen's catalog, not by this package: eyebrow `Tags`; placeholder `Type a tag`; `listLabel` `Tag Suggestions`; `clearQueryLabel` `Clear Tag Text`; `removeLabel` `Remove {tag}`; `limitMessage` `A playlist has at most 5 tags.` when the count is 5. Chrome is title case. The placeholder and the limit sentence stay sentence case. There is no `Add "{query}"` row.
