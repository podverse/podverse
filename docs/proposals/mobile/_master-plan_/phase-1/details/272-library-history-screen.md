# 272-library-history-screen

**Master step:** 9.13
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- My Library — history screen via history resource endpoints.
- List recently played items with resume affordance; item rows reuse episode/track rows.
- Pagination consistent with web history; loading/empty/error via 8.11.

## Acceptance criteria

- History loads from same endpoint semantics as web history page
- Layout mirrors web history page, adapted to RN, tokenized
- Resume/play action wired to playback stub/hook

## Web parity references

- [`apps/web/src/app/history`](/apps/web/src/app/history)
  (`HistoryPageClient.tsx`, `HistoryPageList.tsx`)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
