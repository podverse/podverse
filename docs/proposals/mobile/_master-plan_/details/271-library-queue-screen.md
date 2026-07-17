# 271-library-queue-screen

**Master step:** 9.12
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

- My Library — manual queue screen via queue resource endpoints.
- List now-playing + upcoming; reorder/remove affordances (UI here; full queue store is Track 10).
- Read-only-ish v1 acceptable if Track 10 not landed; wire to queue store when available.

## Acceptance criteria

- Queue items load from same endpoint semantics as web queue page
- Layout mirrors web queue page, adapted to RN, tokenized
- Reorder/remove UI present with `testID`s; loading/empty/error via 8.11

## Web parity references

- [`apps/web/src/app/queues`](/apps/web/src/app/queues),
  [`apps/web/src/components/Queue`](/apps/web/src/components/Queue),
  [`apps/web/src/components/List/Queues`](/apps/web/src/components/List/Queues)
- **Visual parity:** `.cursor/skills/mobile-theme-parity/SKILL.md` § Screen & visual parity

## Verification

```bash
npm run mobile:ios -- --device "iPhone 17 Pro"
```
