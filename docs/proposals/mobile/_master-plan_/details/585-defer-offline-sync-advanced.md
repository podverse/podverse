# 585-defer-offline-sync-advanced

**Master step:** 21.6
**Model (author + implement):** Auto
**Status:** done

## Scope

Record **advanced offline playlist sync conflict resolution** as a **v1 deferral**. The offline-first
data layer (Track 9b) uses last-write-wins / simple reconciliation; complex multi-device merge cases
are deferred.

## Rationale

- The offline-first repositories already give correct single-device and typical multi-device behavior.
- Advanced conflict resolution (three-way merges, per-item vector clocks) is high-complexity for rare
  edge cases and can regress reliability if rushed.

## Revisit trigger

- Field data shows real multi-device conflict loss that last-write-wins does not handle acceptably.

## Acceptance

- Deferral captured here, linked from the deferrals appendix (589) + placeholder issue (588).
- v1 keeps the existing Track 9b reconciliation; no advanced merge engine added.
