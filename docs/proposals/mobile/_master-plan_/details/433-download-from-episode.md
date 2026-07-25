# 433-download-from-episode

**Master step:** 13.4
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- From episode detail (and media-row **Download** when wiring is ready), enqueue a download job
  and show progress (percent or indeterminate + status text).
- Wire through repository / download manager — functional sketch + stable `testID`s.
- Prefer existing `features.download.*` i18n keys from consumer catalog when present.
- **Gating:** hide or disable Download when eligibility fails (`live_item`, HLS / m3u8, no
  enclosure). Surface a short reason if the user somehow triggers enqueue (manager rejects).
- Match web: livestream screens/rows never offer Download (web uses separate livestream UI).

## Acceptance criteria

- User can start a download from **non-live** episode detail with a progressive enclosure
- Download control absent or disabled for livestream items (`item.live_item` set)
- HLS-only / m3u8 enclosures are not downloadable
- In-progress state visible (`testID` e.g. `episode-download-progress`)
- Duplicate tap does not spawn unbounded jobs
- Errors surface in UI (**mobile-surface-async-errors**)
- Ship bar: no pixel polish (Track 23)

## Web parity references

- Intent parity with web download affordances on episode rows/headers
  (`features.download.*`) — behavior is **offline store**, not browser save-as
- Livestream UI has no Download — mirror that on mobile
- `docs/.../details/497-media-row-actions-inventory.md` (Download deferred here)
- [DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md](/docs/proposals/mobile/app-development-process/DOCS-MOBILE-PROCESS-MOBILE-ONLY-FEATURES.md)
  §1.1–1.2

## Verification

```bash
npm run mobile:e2e:test -- library-downloads
```
