**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# Playlist list row tag line

When a playlist payload includes tags, the web row and the phone row each show those names on one text line at the bottom of the row. A line that reaches the end of the row ends in an ellipsis. The full names stay in the accessibility tree. Screens that already pass `DTOPlaylist` pick this up without edits.

## Rows

R17

## Runs after

11

## Issue

https://github.com/podverse/podverse/issues/410

Issue 410. Do not open a second issue.

## Decisions

- The line is plain text. It is not `TagField`, not Chip, and not a bordered pill. No background, border, radius, or remove control.
- Names stay in array order. Join them with a comma and a space: `adam curry, podcasting-2.0`. A middle dot would be easy to miss inside a name that already contains spaces.
- Do not fold, sort, or title-case on the row. Print the strings the payload already has. Plan 11 stores the folded form.
- Draw no line when `tags` is missing, when it is `[]`, or when every entry is blank after trim. A missing key is what a private playlist looks like to someone who is not the owner, and what an older stored phone row looks like. Do not add a prop to hide the line.
- Every caller of these two rows shows the line, including My Playlists, Subscribed, Library, profile lists, Browse, and the web add-to-playlist dialog. The request is that tags stay visible on a screen that has no tag filter.
- The line sits under the creator line when that line is shown, and under the item-count line when it is not. It is the last line in the row.
- Type matches the item-count line (`--font-size-sm` and light weight on web, `typography.body` on the phone). Color is secondary text on both, so the line is not a second copy of the primary subtitle and not the link-colored creator line.
- Ellipsis is paint only. Web uses the existing single-line ellipsis mixins. The phone uses `numberOfLines={1}`. Do not cut the string in JavaScript. A screen reader still reads every name.
- The phone line is an optional footer on `ListRow`, inside the same pressable and the same column gap as the title. A sibling under the row would miss taps and sit outside the spoken label.

## Shared formatter

Add `packages/helpers/src/lib/playlistTagLine.ts`. It imports nothing. Do not edit `playlistTag.ts` or the playlist DTO.

```typescript
export const formatPlaylistTagLine = (tags: readonly string[] | undefined): string | null => {
  if (tags === undefined) {
    return null;
  }
  const names: string[] = [];
  for (const tag of tags) {
    const name = tag.trim();
    if (name.length > 0) {
      names.push(name);
    }
  }
  if (names.length === 0) {
    return null;
  }
  return names.join(', ');
};
```

`packages/helpers/src/index.ts` already exports `./lib/playlist.js`. Add `export * from './lib/playlistTagLine.js';` immediately after the `playlistTag` export when that line exists, and immediately after the playlist export when it does not.

`packages/helpers/package.json` `exports`: add `./playlistTagLine` in the same shape as `./listScreenDefaults` (`types` → `./dist/lib/playlistTagLine.d.ts`, `default` → `./dist/lib/playlistTagLine.js`). Place it next to `./playlistTag` when that key exists, otherwise next to `./listScreenDefaults`.

Web imports the function from `@podverse/helpers`. The phone imports `@podverse/helpers/playlistTagLine`. Do not add a value import of the helpers barrel on the phone.

Unit tests in `packages/helpers/src/lib/playlistTagLine.test.ts`, same style as `titleFilter.test.ts` (import the `.js` specifier):

- `undefined`, `[]`, and `['', '  ']` return `null`.
- `['adam curry', 'podcasting-2.0']` returns `adam curry, podcasting-2.0`.
- Order is kept. `['  Adam Curry  ', 'news']` returns `Adam Curry, news` (trim only; no fold).
- One name has no comma.

## Web row

`apps/web/src/components/List/Playlists/ListPlaylistRow.tsx`

Keep the `DTOPlaylist` type import on its own line. Add a value import of `formatPlaylistTagLine` from `@podverse/helpers`.

Inside the component, `const tagLine = formatPlaylistTagLine(playlist.tags);`.

Render the line only when `tagLine !== null`, as the last node inside `styles.content`, after the `showCreator` block:

```tsx
{tagLine !== null ? (
  <div className={styles.tags} data-testid={`playlist-row-tags-${playlist.id_text}`}>
    {tagLine}
  </div>
) : null}
```

The node stays inside the existing `Link`, so the whole row, including the tag text, remains the click target. Do not set `aria-hidden`. The link's accessible name already includes its text.

`apps/web/src/styles/components/List/Playlists/ListPlaylistRow.module.scss`

Add `@use '../../../mixins/ellipsis' as *;` beside the existing line-clamp use.

`.listItem` already fills the link. Give `.content` the row width so a long line clips instead of widening the row:

- `flex: 1 1 auto`
- `width: 100%`
- `@include ellipsisSingleLineParent` (`min-width: 0`)

Leave `align-items: flex-start`. Leave `.title`, `.subtitleWrapper`, and `.creator` as they are. The subtitle's existing one-line clamp then uses this same width.

`.tags`:

- `@include ellipsisSingleLineChild` (`white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`, `max-width: 100%`)
- `width: 100%`
- `margin-top: var(--spacing-sm)` (the same seam as the subtitle and the creator)
- `font-size: var(--font-size-sm)`
- `font-weight: var(--font-weight-light)`
- `color: var(--text-color-secondary)`

No border, background, or radius. No `var()` fallback.

## Phone row

`apps/mobile/src/components/primitives/ListRow.tsx` has no fourth line. Add optional `footer?: string` and `footerTestID?: string` to `ListRowProps`.

In `createStyles`, add `footer` with the same type and color as `subtitle` (`typography.body` and `themeStyles.textSecondary.color`). Do not add margin. The content column's `gap` is the seam.

Render a `Text` after the meta block, inside `styles.content`, only when `footer` is a string whose length is greater than 0:

- `numberOfLines={1}`
- `style={styles.footer}`
- `testID={footerTestID}`

On the pressable path, append that string to `spokenParts` after `meta`, using the same `'. '` join. A caller that passes `accessibilityLabel` still replaces the built label; `PlaylistListRow` does not pass one. When `onPress` is omitted, the footer text is in the tree on its own. When `footer` is omitted or blank, render nothing and leave the spoken label as it is today.

`apps/mobile/src/components/content/PlaylistListRow.tsx`

Import `formatPlaylistTagLine` from `@podverse/helpers/playlistTagLine`. Call it once per render. Pass `footer` only when the result is not `null`. Pass `footerTestID` as `` `${testID}-tags` `` only when `testID` is defined and the line exists. Do not pass a new object or array into `ListRow`. Do not subscribe to playback, theme context beyond `useThemedStyles`, or any store.

Update the file comment so it describes the row as it stands: title, item count, optional description, optional creator, and an optional single-line tag list.

Do not edit `BrowseScreen.tsx`, `LibraryPlaylistsScreen.tsx`, `ProfileContentSections.tsx`, `playlistRepository.ts`, or `catalogRowCopy.ts`.

## Tests

Helper unit tests are listed under Shared formatter. No API integration test. No Maestro flow. The join is pure, and a phone flow would have to create tags through the playlist form, which is another plan. `library-playlists.yaml` already asserts `library-playlist-row-.*-subtitle`. Leave that id alone. The new id is `${testID}-tags` and is absent when the playlist has no tags.

Web Playwright is required. Add `apps/web/e2e/playlist-row-tags.spec.ts`. In `makefiles/local/e2e-spec-order-web.txt`, put that path on the line after `apps/web/e2e/playlists-profiles-chips.spec.ts`.

Suite title: `Playlist row tags`.

One test: `When a playlist has tags, My Playlists and Global each show those names on one line under the title.`

Follow `apps/web/e2e/playlist-edit-play.spec.ts` for login (`http://localhost:4030/api/v2/auth/login`, `e2e-user@example.com`, `Test!1Aa`) and for `capturePageLoad` from `./helpers/stepScreenshots`. Set the viewport to 1280 by 720, as `playlists-profiles-chips.spec.ts` does. Do not raise the test timeout.

After login, `page.request.post` `http://localhost:4030/api/v2/playlist` twice. The 201 body is the playlist object (`preparePlaylistForJson`), and `id_text` is a top-level string. Body fields:

- Public: `title` `A E2E Tag Row`, `description` `''`, `medium` `'av'`, `sharable_status_id` `1`, `tags` `['Adam Curry', 'podcasting-2.0']`.
- Private: `title` `A E2E Tag Private`, the same description and medium, `sharable_status_id` `3`, `tags` `['news']`.

The row prints the stored strings. Expect `adam curry, podcasting-2.0` and `news`.

In a `finally`, `page.request.delete` `http://localhost:4030/api/v2/playlist/${idText}` for each id that was created, so later specs do not keep these rows.

Step 1. Open `/playlists?type=private&sort=a_z`. Assert the Playlists heading is visible, and that the My Playlists chip (`getByTestId('playlists-type-chips')`, button name `My Playlists`) has `aria-pressed` `true`. The public row's tag node `playlist-row-tags-${publicId}` has text `adam curry, podcasting-2.0`. The private row's tag node has text `news`. Both are visible. The seeded link `a[href="/playlist/e2eRemPlay01"]` (`E2E Removed Playlist`, owned by this account, no tags) is visible and contains no `playlist-row-tags-e2eRemPlay01` node. For each tagged row, the tag node's top is below the title node's top (`boundingBox`). `toHaveCSS('text-overflow', 'ellipsis')` and `toHaveCSS('white-space', 'nowrap')` on the public tag node. Pass that node to `capturePageLoad` as the scrolled element. The link that contains the public tag node also contains the title `A E2E Tag Row`.

Step 2. Open `/playlists?type=public&sort=recent`. Assert the heading, and that Global (`button` name `Global`) has `aria-pressed` `true`. The public tag node is visible with the same comma-joined text, and its top is below its title. The private title `A E2E Tag Private` is not on the page. The private tag test id has count 0. Capture with the public tag node scrolled into view.

Do not assert pixel overflow. A wide viewport may fit two short names; the CSS contract is the ellipsis.

## Out of scope

- Playlist page chips, the embed, and phone playlist detail (area I).
- The tag filter and env defaults (areas F and G).
- Create and edit forms (areas D and E).
- CarPlay and Android Auto. They do not render these rows.
- No new catalog key. The names are playlist data. The comma is not a translated word.

## Files

- `packages/helpers/src/lib/playlistTagLine.ts`
- `packages/helpers/src/lib/playlistTagLine.test.ts`
- `packages/helpers/src/index.ts`
- `packages/helpers/package.json`
- `apps/web/src/components/List/Playlists/ListPlaylistRow.tsx`
- `apps/web/src/styles/components/List/Playlists/ListPlaylistRow.module.scss`
- `apps/web/e2e/playlist-row-tags.spec.ts`
- `makefiles/local/e2e-spec-order-web.txt`
- `apps/mobile/src/components/primitives/ListRow.tsx`
- `apps/mobile/src/components/content/PlaylistListRow.tsx`

## Release scratchpad

```markdown
## Playlist rows show tags

- Surfaces: web, mobile
- Change: A playlist list row shows that playlist's tags on one line at the bottom when the payload includes them. The names stay in the owner's order, separated by commas. A line that reaches the end of the row ends in an ellipsis. The line is on every screen that uses the playlist row, including lists that have no tag filter. A playlist with no tags looks the same as before.
- Who notices: anyone looking at a playlist list
- Operator steps: none
```
