# 263-episode-detail-tabs

**Master step:** 9.4
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Episode detail tabs matching web: **chapters, soundbites, clips, transcript** (show only tabs the
  item supports).
- Each tab lazy-loads its data via the matching request wrappers; reuse the clip row (8.6),
  chapter/soundbite list components.
- Transcript tab uses an RN-friendly transcript viewer; segment tap seeks (wired to engine later).

## Acceptance criteria

- Only supported tabs render; switching tabs loads the right data set
- Chapter/soundbite/clip/transcript layouts mirror web tab content, adapted to RN, tokenized
- Loading/empty/error per tab via 8.11

## Web parity references

- [`apps/web/src/components/List/ItemChapters`](/apps/web/src/components/List/ItemChapters),
  [`ItemSoundbites`](/apps/web/src/components/List/ItemSoundbites),
  [`apps/web/src/components/ItemTranscript`](/apps/web/src/components/ItemTranscript)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:e2e:test -- podcast-episode
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
```
