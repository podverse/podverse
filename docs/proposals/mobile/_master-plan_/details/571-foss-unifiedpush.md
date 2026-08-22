# 571-foss-unifiedpush

**Master step:** 20.2
**Model (author + implement):** Opus 4.8
**Status:** done

## Scope

Document that the **FOSS flavor uses UnifiedPush instead of FCM**. The transport itself was
implemented in **Track 14** (push) — this detail records the FOSS-flavor position and the endpoint
contract so Track 20 flavor wiring reuses it rather than reintroducing Firebase.

## Current state (implemented in Track 14)

- Push transport is abstracted; the **playstore** flavor uses FCM (`/account/fcm-device/*`) and the
  **FOSS** flavor uses **UnifiedPush** (`/account/up-device/*`). Notification tap routing flows
  through the Track 15 deep-link path map. See `.llm/plans/completed/mobile-track14-push/`.
- Typed API wrappers live in `packages/helpers-requests/src/api/account/`.

## Architecture notes

- FOSS builds must **not** link Firebase for push; the UnifiedPush distributor is user-provided
  (e.g. ntfy). No Google Play Services dependency is introduced by the FOSS push path.
- Do **not** port the web **Web Push** / service-worker path to mobile.

## Acceptance criteria

- FOSS-flavor push = UnifiedPush (`/account/up-device/*`); playstore = FCM. Recorded and cross-linked
  from the flavor definition (570).
- No Firebase in the FOSS artifact.

## Web parity references

- **mobile-fdroid-flavors** skill § Push endpoints; **Track 14.6** (UnifiedPush).

## Verification

- Doc-only. Runtime is covered by the Track 14 FOSS register + push-routing E2E.
