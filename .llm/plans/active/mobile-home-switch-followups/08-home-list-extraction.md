# 08 — Move one Home media type's list into its own component (same behavior)

## Goal

`HomeScreen.tsx` is one 1,400-line component: the chip row, the remembered list choices, and every
row, read, and reload trigger of the list all live together. Kept lists (09) need the list as a
component that can stay mounted on its own. This milestone only moves code:

- `HomeScreen` keeps the chip row, the remembered choices (`listPrefs`), the pending spinner
  overlay, the title-bar menu, and the add-to-playlist sheet.
- New `HomeMediaTypeList` owns the rows, loading / empty / error states, row actions, reads, reload
  triggers (refresh, sync, downloads), and the `spinner.visible` / `list.visible` stamps.
- The screen renders one list keyed by media type, so a switch still unmounts the old list under
  the pending spinner. The key replaces the four setters that used to clear the list.

**Prediction:** no change. C8 chips metrics stay inside the noise floor of the last kept Home
capture, and the Maestro `home` flows pass.

## Preconditions

- 07 done and R7 reviewed (kept or reverted).
- `apps/mobile/src/screens/home/HomeMediaTypeList.tsx` does not exist.

## Files

- New: `apps/mobile/src/screens/home/HomeMediaTypeList.tsx`
- `apps/mobile/src/screens/home/HomeScreen.tsx`
- Plan inputs (read them, do not edit them), all in
  `.llm/plans/active/mobile-home-switch-followups/tools/`:
  - `home-list-skeleton.tsx.txt` — the new file's import block, the component shell, and two slot
    markers
  - `home-list-spec.json` — which blocks of `HomeScreen.tsx` move into which slot
  - `home-list-glue.edits` — the exact edits that connect the two files
  - `move-blocks.mjs` — the helper that runs the three inputs above

## How this milestone works

Commands make every edit. Do not retype moved code and do not hand-edit either file unless a step
says so. Each helper command either succeeds completely or writes nothing and prints why. If one
fails, **stop and report its output**; do not work around it.

Run every command from the monorepo root.

## Step 1 — Back up the screen

```bash
mkdir -p .llm/plans/active/mobile-home-switch-followups/backup
cp apps/mobile/src/screens/home/HomeScreen.tsx .llm/plans/active/mobile-home-switch-followups/backup/HomeScreen.pre08.tsx.txt
```

## Step 2 — Create the list file from the skeleton

```bash
cp .llm/plans/active/mobile-home-switch-followups/tools/home-list-skeleton.tsx.txt apps/mobile/src/screens/home/HomeMediaTypeList.tsx
```

## Step 3 — Move the blocks

```bash
./scripts/nix/with-env node .llm/plans/active/mobile-home-switch-followups/tools/move-blocks.mjs move .llm/plans/active/mobile-home-switch-followups/tools/home-list-spec.json
```

Expect seven `…: moved source lines …` lines (`MODULE[0]`, then `BODY[0]` to `BODY[5]`) and a final
`Wrote …` line. What moves:

- **MODULE:** everything between the imports and `export function HomeScreen() {` — the prefs
  state type, row key extractor, `HomeFeedListItem`, and `HomeUnsubscribedDownloadRow`.
- **BODY:** the auth / sync / responsive hooks; the list state (`feedRows` … refs) and
  `useHomeRowPlayback`; the view-mode eligibility lines; the playlist target; everything from
  `handleFilterTermChange` through `handleMarkAllSeen` (reads, reload effects, row actions); and
  everything from `handleRowPress` through `feedList` (styles, empty states, `renderItem`).

## Step 4 — Connect the two files

```bash
./scripts/nix/with-env node .llm/plans/active/mobile-home-switch-followups/tools/move-blocks.mjs apply-edits .llm/plans/active/mobile-home-switch-followups/tools/home-list-glue.edits
```

Expect 11 `applied …` lines. For review, the edits do this:

1. Replace the screen's import block with the imports it still uses.
2. Remove `const { t } = useTranslation();` from the screen (the list translates its own copy).
3. Add screen state `canMarkAllSeen` (reported by the list) and `listRef` (the list's handle).
4. In `commitMediaTypeChange`, drop the request-id advance and the four list setters; the new
   comment explains that the key change unmounts the old list and abandons its read.
5. Add `handleMarkAllSeen`, which calls `listRef.current?.markAllSeen()`, above the title-bar
   effect.
6. The screen stamps `spinner.visible` only for the pending overlay; the list stamps its own
   spinner and rows.
7. Give the screen its own `styles` (container, list area, hidden list area, pending overlay,
   chip row insets).
8. Render `<HomeMediaTypeList … key={selectedMediaType} …/>` where `{feedList}` was.
9. Export `HomeListPrefsState` from the list and drop the five style entries the list no longer
   uses.

The list's shell (from the skeleton) destructures its props as the names the moved code already
uses: `mediaType: selectedMediaType` and `prefs: resolvedPrefs`. It adds an unmount effect that
abandons a read still in flight, reports `canMarkAllSeen` to the screen, and exposes
`markAllSeen` through `useImperativeHandle`.

## Step 5 — Check imports, then format

```bash
./scripts/nix/with-env node .llm/plans/active/mobile-home-switch-followups/tools/move-blocks.mjs unused-imports apps/mobile/src/screens/home/HomeScreen.tsx apps/mobile/src/screens/home/HomeMediaTypeList.tsx
```

Both files must print `no unused imports`. The one expected exception: if 07 was reverted, the list
reports `reconcileHomeFeedRows` as unused — delete the line
`import { reconcileHomeFeedRows } from './reconcileHomeFeedRows';` from `HomeMediaTypeList.tsx` and
run the check again. Any other name: stop and report.

```bash
./scripts/nix/with-env npx prettier --write apps/mobile/src/screens/home/HomeScreen.tsx apps/mobile/src/screens/home/HomeMediaTypeList.tsx
```

## Step 6 — Sanity checks

Each must print what is listed:

```bash
rg -n "@@SLOT" apps/mobile/src
rg -n "setFeedRows|loadFeed|useHomeRowPlayback" apps/mobile/src/screens/home/HomeScreen.tsx
rg -n "export function HomeScreen|export const HomeMediaTypeList" apps/mobile/src/screens/home
rg -c "stampPerfFrame\('spinner.visible'\)" apps/mobile/src/screens/home
```

1. No matches.
2. No matches.
3. One line in `HomeScreen.tsx`, one in `HomeMediaTypeList.tsx`.
4. `HomeScreen.tsx:1` and `HomeMediaTypeList.tsx:1`.

## Do not

- Do not rename anything inside the moved code, and do not "tidy" it.
- Do not change any `testID`, accessibility prop, style value, or user-facing string.
- Do not remove the pending overlay or `commitMediaTypeChange`; 09 replaces them.
- Do not delete the backup file; the revert rule needs it until C8 is reviewed.

## Done when

- [ ] Steps 1–6 done and their outputs match.
- [ ] COPY-PASTA 08 ticked; this file moved to `.llm/plans/completed/mobile-home-switch-followups/`.

## Keep / revert

- **Keep** when C8 chips metrics are inside the noise floor of the last kept Home capture, the
  Maestro `home` flows pass, and the operator sees no difference.
- **Revert** when a Maestro `home` flow fails because of the move, or the operator sees any
  behavior change. Revert = copy
  `.llm/plans/active/mobile-home-switch-followups/backup/HomeScreen.pre08.tsx.txt` back over
  `apps/mobile/src/screens/home/HomeScreen.tsx` and delete `HomeMediaTypeList.tsx`. Then stop the
  set and report; 09 depends on this milestone.

## Operator checkpoint — C8

**Mobile** — type-check first; a pure move shows up there before anywhere else:

```bash
npm run type-check:mobile
```

The only error allowed is the known one in `authRequestWithRefresh.test.ts`.

Capture **C8** (`chips`) per [CHECKPOINT.md](./CHECKPOINT.md). Then run the Maestro `home` flows as
[CHECKPOINT.md § Maestro run](./CHECKPOINT.md#maestro-run) describes. Reply `collected C8` with the
impression and the Maestro result.
