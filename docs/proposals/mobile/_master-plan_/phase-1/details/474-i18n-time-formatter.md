# 474-i18n-time-formatter

**Master step:** 17.5
**Model (author + implement):** Auto
**Status:** done

## Scope

- Use `@podverse/helpers` `formatSecondsToReadableDuration` (or exported timeFormatter) for duration
  labels in player/queue UI.
- Pass active locale into formatter where API supports it.

## Acceptance criteria

- No duplicate duration formatting logic in mobile
- Duration display matches web for same locale/input

## Web parity references

- [`packages/helpers/src/lib/i18n/timeFormatter.ts`](/packages/helpers/src/lib/i18n/timeFormatter.ts)

## Verification

```bash
grep -rq 'timeFormatter\|formatSecondsToReadableDuration' apps/mobile/src
npm run test -w @podverse/helpers
```
