# PG-10 tablet responsive — phase summary

**Phase slug:** `mobile-pg10-tablet`
**Parallel group:** PG-10 (Track 18 — multi-device targets), **tablet slice**
**Covers master steps:** 18.1, 18.2, 18.3, 18.4, 18.5, 18.15
**Detail IDs:** 510, 511, 512, 513, 514, 535

## Scope

First implementable slice of Track 18: make the existing phone app render well on tablets
(responsive Home/browse grid, optional split podcast detail, width-capped mini + two-column full
player) plus the two Track 18 documentation steps (device matrix, device/track scope matrix).

Ship bar = **functional sketch + component reuse**: branch existing screens on a shared
`useResponsive()` hook; do not redesign screens (that is Track 23 operator polish). Phone layout
must remain unchanged behind every `!isTablet` branch.

## Steps in this phase

| Step  | Detail | Model     | Summary                                             |
| ----- | ------ | --------- | --------------------------------------------------- |
| 18.1  | 510    | Auto      | Device matrix doc                                   |
| 18.15 | 535    | Auto      | Device/track scope matrix doc                       |
| 18.2  | 511    | Codex 5.3 | Breakpoints token + `useResponsive`; Home grid cols |
| 18.3  | 512    | Codex 5.3 | Tablet split podcast detail (functional sketch)     |
| 18.4  | 513    | Codex 5.3 | Tablet mini-player width cap + full-player two-col  |
| 18.5  | 514    | Codex 5.3 | Maestro tablet screenshots (Home + podcast detail)  |

## Prerequisites (all satisfied)

- Track 7 (navigation shell) — **done**.
- Track 11 (mini/full player) — **done**.
- Track 9b (SQLite repositories) — **done** (tablets share phone repositories).

## Open decisions locked for this phase

- **Breakpoints:** `md: 600`, `lg: 900` (dp). Adjust in 511 if device testing shows better cutoffs.
- **Tablet E2E is opt-in**, not added to the default phone matrix (keeps PR gate fast).
- **Split view scope:** podcast detail only; navigation to episode detail unchanged (no inline
  third pane — Track 23).

## Out of scope (this phase)

- Watch (18.6–18.9) and TV (18.10–18.14) — separate follow-on phases.
- CI tablet nightly (18.16) and per-form-factor store screenshots (18.17) — after the layouts land.
- Any pixel polish / redesign — Track 23.
