# 570-foss-flavor-definition

**Master step:** 20.1
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

Define the **FOSS product flavor**: a build variant that contains **no Google Play Services, no
Firebase, and no proprietary blobs**, suitable for F-Droid / de-Googled Android. Codifies the
policy captured in the **mobile-fdroid-flavors** skill as the Track 20 baseline.

## Flavor split (target)

| Concern              | playstore flavor                         | FOSS flavor                                      |
| -------------------- | ---------------------------------------- | ------------------------------------------------ |
| Push transport       | FCM (+ APNs via Firebase on iOS typical) | **UnifiedPush** via `/account/up-device/*` (571) |
| Google Play Services | Allowed where required                   | **None**                                         |
| In-app purchases     | Store billing (Track 19)                 | **Unavailable** — link to web membership (575)   |
| Signing              | Play / App Store upload keys             | Separate FOSS signing key (574)                  |
| Media engine         | Media3 ExoPlayer (FOSS-clean)            | Same — no gating needed                          |

## Architecture notes

- Prefer **interfaces + flavor-specific implementations** over `#ifdef`-style copy-paste (e.g. the
  push transport abstraction already used by Track 14).
- FOSS builds must not require Google Play Services / Firebase **at runtime**, not merely at build
  time. Any non-FOSS native/npm dep is gated to the **playstore** variant and recorded in the
  dependency register (572, `446-fdroid-register`).
- The first-party `podverse-media-engine` (Media3 ExoPlayer / AVFoundation) is FOSS-clean and ships
  in **both** flavors with no gating.

## Acceptance criteria

- The FOSS-vs-playstore split is documented here as canonical for Track 20.
- Non-FOSS deps have a gating + register requirement (572).
- Push (571), IAP (575), and signing (574) FOSS positions are cross-linked.

## Web parity references

- **mobile-fdroid-flavors** skill; **Track 14** push (completed under `mobile-track14-push`).

## Verification

- Doc-only. FOSS build enforcement is validated when the FOSS variant is wired (later Track 20
  implementation) via `npm run lint` + a FOSS-variant build that excludes Play Services/Firebase.
