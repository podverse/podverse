# Mobile device matrix (Track 18)

Authoritative reference for which form factors the next-gen mobile app targets in v1, how each is
driven, and which app process / data store feeds it. Later Track 18 slices (tablet responsive,
watch, TV) and agents implementing them should use this doc — not invent per-device assumptions.

> **Status:** Decision doc for Track 18. Implementation of tablet layouts is
> `.llm/plans/active/mobile-pg10-tablet/`; watch / TV remain `_TBD_` until their scope steps land.

## Device matrix

| Device       | v1 status                | Input        | Process / data source                   |
| ------------ | ------------------------ | ------------ | --------------------------------------- |
| Phone        | Primary                  | Touch        | RN app + SQLite repositories            |
| Tablet       | Supported (responsive)   | Touch        | Same RN app process + SQLite (shared)   |
| Wear OS      | Remote/complication only | Touch/rotary | MediaSession / native cache (no SQLite) |
| Apple Watch  | Deferred (post-v1)       | Touch/crown  | MediaSession bridge (if adopted)        |
| Android TV   | Supported (leanback)     | D-pad        | RN app process, D-pad focus nav         |
| tvOS         | Deferred (post-v1)       | Remote       | —                                       |

### Storage note (phone UI vs car / watch)

- **Tablets** share the phone app process. They use the same SQLite repositories as phone — no
  separate tablet DB.
- **Watches do not read SQLite.** Wear OS / Apple Watch now-playing complications and remote
  controls consume **MediaSession / native cache** (or a phone bridge), the same projection path as
  CarPlay / Android Auto.

See
[DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
(dual-store model: phone UI vs car / watch).

## Device / track scope matrix

Which existing tracks and subsystems are phone-only vs shared per device. Use this when detailing
watch (18.6–18.9) and TV (18.10–18.14) so those phases inherit the right modules and do not assume
SQLite on the watch.

| Subsystem                        | Phone | Tablet           | Wear/Watch          | TV (Android TV)      |
| -------------------------------- | ----- | ---------------- | ------------------- | -------------------- |
| RN screens / navigation          | Yes   | Yes (responsive) | No (remote only)    | Yes (D-pad focus)    |
| SQLite repositories (Track 9b)   | Yes   | Yes (shared)     | No (native cache)   | Yes                  |
| Media engine (Track 2)           | Yes   | Yes              | Remote commands     | Yes                  |
| Native cache / MediaSession (12) | Yes   | Yes              | **Source of truth** | Yes                  |
| Downloads (Track 13)             | Yes   | Yes              | No                  | Optional             |
| Mini/full player (Track 11)      | Yes   | Yes (two-col)    | Complication only   | Full-screen, no mini |

**Phone-only** here means “shipped and validated on phone first”; tablet reuses the same RN screens
with responsive layout. Watch never mounts RN screens — remote / complication only in v1.

## Tablet breakpoint decision (Decision A)

Track 18 tablet uses an intentional three-band responsive split (Decision A — keep as-is):

| Width band | Expected layout |
| --- | --- |
| `< md` (`< 600dp`) | Phone baseline: 1-column feeds, bottom tab bar, no split detail |
| `md..(lg-1)` (`600..899dp`) | Mid-band: 2-column-capable grids (`isTablet=true`), bottom tab bar, split detail only in landscape |
| `>= lg` (`>= 900dp`) | Tablet-wide: up to 3 columns, left tab rail (`tabBarPosition: left`), split detail allowed in portrait |

Rationale: density increases at `md`, but rail/split stay reserved for wider `lg` layouts. This
avoids over-promoting large-phone / small-tablet portrait widths into sidebar UX too early.

Coverage note: this mid-band is currently validated at the **logic level** (breakpoint unit tests)
rather than as a dedicated rendered E2E slot. The rendered matrix intentionally focuses on phone and
wide-tablet endpoints.

Optional follow-up (not a PR gate): if we want rendered proof of the 600–899dp band, add a
nightly-only small-tablet emulator under master-plan **18.16** (CI tablet-emulator nightly), not to
`mobile:e2e:test -- tablet`.

## Related

- Master plan Track 18:
  [001-MASTER-PLAN.md](/docs/proposals/mobile/_master-plan_/001-MASTER-PLAN.md)
- Detail steps: [510-device-matrix-doc](/docs/proposals/mobile/_master-plan_/details/510-device-matrix-doc.md),
  [535-device-track-scope-matrix](/docs/proposals/mobile/_master-plan_/details/535-device-track-scope-matrix.md)
- Offline data layer:
  [DOCS-MOBILE-DATA-LAYER-OFFLINE.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md)
- Car surfaces:
  [DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-CARPLAY-ANDROID-AUTO.md)
- Contributor guide: [APPS-MOBILE.md](/apps/mobile/APPS-MOBILE.md)
