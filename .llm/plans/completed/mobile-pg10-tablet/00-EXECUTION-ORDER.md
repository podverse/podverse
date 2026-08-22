# Execution order — mobile-pg10-tablet

Run the numbered plans in order. Plan 02 must land first among the code plans because it introduces
the shared `useResponsive()` hook + breakpoint tokens that 03 and 04 depend on.

```text
01-device-docs.md            (18.1, 18.15)  — docs only; can run any time / in parallel
02-responsive-home-grid.md   (18.2)         — breakpoints + hook + Home/browse columns  [foundation]
03-tablet-detail-and-player.md (18.3, 18.4) — split podcast detail + tablet player       (needs 02)
04-tablet-e2e-screenshots.md (18.5)         — Maestro tablet flow                        (needs 02–03)
```

## Dependency notes

- **02 is the foundation.** The `useResponsive()` hook and `breakpoints` token from 02 are imported
  by 03 (split detail, player) and exercised by 04 (E2E). Do not start 03 before 02 is implemented.
- **01 is independent docs** (device matrix + scope matrix) — safe to do first or in parallel.
- **04 last** — it screenshots the layouts delivered by 02–03.

## Parallelization

- 01 (docs) may run in parallel with 02.
- 03 and 04 are sequential after 02.
