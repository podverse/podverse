# 594-stack-header-back-sketch

**Master step:** 9d.5
**Model (author + implement):** Auto
**Status:** done

## Scope

- Ensure nested stacks expose a **usable** header back (React Navigation default and/or
  `ScreenHeader`) so operators can navigate without guessing.
- Sketch only — iconography polish is Track 23. Android system back remains Track 7.10.

## Acceptance criteria

- Push screens in Home / Library / Search stacks can go back via header or system back
- No dead-end screens without an exit path
- Document intentional exceptions (tab roots)

## Audit result (implemented)

- **No code change needed for back.** Every tab stack (`Home` / `Search` / `My Library` / `RSS` /
  `More`) uses `createNativeStackNavigator` with the default header shown, so every **pushed**
  screen renders the platform header back button automatically. The new `PlaylistCreate` /
  `PlaylistEdit` routes inherit this — verified they push onto the Library stack with titles and a
  default back affordance (no dead-ends).
- **Documented exceptions (tab roots, no back by design):** `HomeRoot`, `SearchRoot`, `LibraryHub`,
  `AddByRssRoot`, `MoreRoot`.
- **In-app back paths also exist:** `PlaylistFormScreen` cancel/edit-save call `navigation.goBack()`;
  create uses `navigation.replace(PlaylistDetail)` so Back from detail returns to the playlists list.
- **Android system back (Track 7.10) untouched:** only the root `FullPlayer` modal keeps its custom
  `onClose` (`canGoBack()` → `goBack`, else navigate to `MainTabs`); no stack `headerLeft` overrides
  were added.

## E2E smoke

- `apps/mobile/e2e/library-playlists.yaml` — login → Library → Playlists → create → detail → edit →
  save (`goBack`) → detail. Registered in `flow_needs_e2e_api` (needs :4230; no test-assets).

## Web parity references

- N/A (platform navigation)

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
