# 580-defer-apple-watch

**Master step:** 21.1
**Model (author + implement):** Auto
**Status:** done

## Scope

Record **Apple Watch standalone app** as an explicit **v1 deferral**. Wear OS remote-control is the
watch target for v1 (see Track 18.6–18.9); a native watchOS app is out of scope until post-v1.

## Rationale

- watchOS requires a separate native target, its own connectivity bridge, and App Store review path
  distinct from the phone app.
- v1 value on the watch is remote transport control, which Wear OS covers first (single codebase
  footprint, larger install base for early feedback).

## Revisit trigger

- Wear OS remote-control (18.7) ships and is stable, **and** there is demonstrated user demand for a
  watchOS equivalent, **or** a monetization/entitlement reason to prioritize Apple hardware.

## Acceptance

- This deferral is captured here and linked from the Track 21 deferrals appendix (589) with a
  placeholder issue (588).
- No watchOS target is added in v1.
