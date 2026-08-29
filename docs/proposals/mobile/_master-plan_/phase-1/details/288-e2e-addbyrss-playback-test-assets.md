# 288-e2e-addbyrss-playback-test-assets

**Master step:** 9.29
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Extend `apps/mobile/e2e/add-by-rss.yaml` beyond list visibility: tap Play on the first feed and
  assert real playback using the shared `tools/test-assets` fixture on **2111**.
- Enclosure URL comes from the fixture-enabled parse payload (same URL as web seedConstants /
  `E2E_ADDBYRSS_FRESH_ENCLOSURE_URL`).
- Expose an E2E-only `testID` when the native bridge reports playing (do not rely on Hello World
  debug panel).

## Acceptance criteria

- Flow requires `:2111` (runner preflight) + `:4230` fixtures
- After `rss-feed-play-first`, assert playback-active testID (or equivalent stable signal)
- Passes on iOS + Android E2E devices with screenshots

## Web parity references

- [`apps/web/e2e/media-player-addbyrss-resume.spec.ts`](/apps/web/e2e/media-player-addbyrss-resume.spec.ts)
- [`apps/web/e2e/helpers/seedConstants.ts`](/apps/web/e2e/helpers/seedConstants.ts)
- List-only step 9.27 / [286-e2e-add-by-rss-flow](./286-e2e-add-by-rss-flow.md) remains done

## Verification

```bash
npm run mobile:e2e:test -- add-by-rss
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```

## Depends on

- 5.21–5.23 / 335–337, 9.21 / 280, 9.27 / 286
