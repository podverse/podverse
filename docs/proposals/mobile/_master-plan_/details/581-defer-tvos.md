# 581-defer-tvos

**Master step:** 21.2
**Model (author + implement):** Auto
**Status:** done

## Scope

Record **tvOS native app** as a **v1 deferral**. Android TV (leanback) is the first TV target
(Track 18.10–18.14); Apple TV / tvOS comes later.

## Rationale

- Android TV reuses more of the existing RN/Android surface and emulator tooling already in CI.
- tvOS needs a separate focus/remote model and App Store review, with limited incremental reach for
  an early release.

## Revisit trigger

- Android TV (18.10–18.14) ships and is stable, **and** there is user demand or a partner reason to
  add Apple TV.

## Acceptance

- Deferral captured here, linked from the deferrals appendix (589) + placeholder issue (588).
- No tvOS target in v1.
