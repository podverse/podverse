# 434-library-downloads-list

**Master step:** 13.5
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Replace `LibraryDownloadsScreen` placeholder
  (`apps/mobile/src/navigation/index.tsx` → `library-downloads-screen`) with a real list:
  in-progress + completed downloads from `downloadsRepository`.
- Row: title, status/progress, play (when complete), delete/cancel affordances.
- Use primitives + tokens; FlatList for the list.

## Acceptance criteria

- Library → Downloads shows repository-backed rows (not placeholder)
- Empty / loading / error states with `testID`s
- Cancel in-progress and delete completed remove row (+ file when present)
- Auth-empty / guest: sensible empty or login path (no crash)

## Web parity references

- No web offline library — mobile-only screen under My Library stack
- Nav already: `LIBRARY_STACK_ROUTES.LibraryDownloads`, `library-nav-downloads`

## Verification

```bash
npm run mobile:e2e:test -- library-downloads
```
