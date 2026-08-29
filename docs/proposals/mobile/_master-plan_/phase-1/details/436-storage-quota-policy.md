# 436-storage-quota-policy

**Master step:** 13.7
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Define a simple storage quota policy (default cap + user-visible usage) and a manage-storage
  sketch screen or section (can live on Downloads or Settings).
- Show total downloaded bytes; allow delete-all / delete-oldest affordances (functional sketch).
- Persist quota preference in tiny prefs (AsyncStorage/MMKV) if user-adjustable — optional for v1
  sketch (fixed default OK).

## Acceptance criteria

- Documented default quota (e.g. 2–5 GB or device-relative) in code comment / README
- UI shows usage summary with `testID`s
- User can free space by deleting downloads
- Ship bar: no fancy charts

## Web parity references

- Mobile-only — web has no offline quota

## Verification

```bash
npm run mobile:e2e:test -- library-downloads
```
