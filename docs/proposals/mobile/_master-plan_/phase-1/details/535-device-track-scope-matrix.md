# 535-device-track-scope-matrix

**Master step:** 18.15
**Model (author + implement):** Auto
**Status:** done

## Scope

Document which existing tracks are **phone-only** vs **shared native modules** per device, so watch
(18.6–18.9) and TV (18.10–18.14) work knows what it inherits vs must build. Extends the device
matrix doc (510) with a per-track column.

Produce a table mapping tracks/subsystems to each device target:

| Subsystem                        | Phone            | Tablet           | Wear/Watch          | TV (Android TV)      |
| -------------------------------- | ---------------- | ---------------- | ------------------- | -------------------- |
| RN screens / navigation          | Yes              | Yes (responsive) | No (remote only)    | Yes (D-pad focus)    |
| SQLite repositories (Track 9b)   | Yes              | Yes (shared)     | No (native cache)   | Yes                  |
| Media engine (Track 2)           | Yes              | Yes              | Remote commands     | Yes                  |
| Native cache / MediaSession (12) | Yes              | Yes              | **Source of truth** | Yes                  |
| Downloads (Track 13)             | Yes              | Yes              | No                  | Optional             |
| Mini/full player (Track 11)      | Yes              | Yes (two-col)    | Complication only   | Full-screen, no mini |
| Membership gating (Track 19)     | Yes (RN)         | Yes (RN, shared) | **N/A** (see below) | Yes (RN)             |
| V4V boost entry (19.6, 359)      | Full player (RN) | Full player (RN) | **N/A**             | Full player (RN)     |

## Membership gating is RN-only; car/watch are ungated by design

Membership entitlement gates only premium **mutations/features** — queue add, playlists,
notifications, directory add-by-RSS, clip authoring — and it is enforced by the **API** (HTTP 403 with
a `membership.*` `i18nKey`; see [563-membership-gating-ui](/docs/proposals/mobile/_master-plan_/phase-1/details/563-membership-gating-ui.md)).
Every gated action originates from an **RN screen**, so gating lives entirely in the JS layer and the
shared helpers (`@podverse/helpers` `deriveMembershipState`, `@podverse/helpers-requests`
`parseMembershipGateError` / `membershipDenialReason`) — identical on **phone, tablet, and Android-TV**
RN surfaces; no per-surface handling.

**Car (CarPlay / Android Auto) and watch do NOT gate anything.** They are native-only, app-closed
consumers of the native cache that **browse and play already-cached content via a direct transport
action** ([394](/docs/proposals/mobile/_master-plan_/phase-1/details/394-car-playback-url-resolution.md)); they
issue **no** member-gated mutation API calls. Playback is not a gated feature, so a 403 can never
originate from these surfaces. **Do not add a membership/entitlement check to the native car/watch
browse or playback path** — doing so would couple cached playback to entitlement state and break the
hard app-closed constraint ([car-ux-parity/000-OVERVIEW.md](/docs/proposals/mobile/car-ux-parity/000-OVERVIEW.md)).
V4V (19.6) is a full-player RN entry only (hidden by default, [359](/docs/proposals/mobile/_master-plan_/phase-1/details/359-v4v-boost-entry-stub.md)),
with no car/watch surface in v1.

## Acceptance criteria

- One committed table, one row per major subsystem/track, one column per device target.
- Marks watch as MediaSession/native-cache consumer (no SQLite), consistent with 510 and
  [DOCS-MOBILE-DATA-LAYER-OFFLINE.md §7.1](/docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DATA-LAYER-OFFLINE.md).
- Linked from Track 18 and referenced by the watch/TV detail docs when they are authored.

## Verification

```bash
grep -q "phone-only" docs/proposals/mobile/initial-decisions/DOCS-MOBILE-DEVICE-MATRIX.md || true
```
