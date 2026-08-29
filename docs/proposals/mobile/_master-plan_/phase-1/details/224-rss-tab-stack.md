# 224-rss-tab-stack

**Master step:** 7.5
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- Dedicated **RSS** tab stack for Add-by-RSS (feeds Track 9 RSS screens).
- Placeholder “Add by RSS” screen until 9.18+.

## Acceptance criteria

- RSS is its own tab (not buried under More)
- Stack ready for feed list + add flow routes

## Web parity references

- Web `/add-by-rss`

## Verification

```bash
rg -n "RSS|AddByRss|AddByRSS" apps/mobile/src/navigation || true
```
