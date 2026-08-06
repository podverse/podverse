# 583-defer-clip-authoring

**Master step:** 21.4
**Model (author + implement):** Auto
**Status:** done

## Scope

Record **clip authoring / upload from mobile** (create/edit clip screens) as a **v1 deferral**.
Mobile can **play** and **share** clips; creating/editing clips is deferred.

## Rationale

- Clip creation is a design-heavy authoring surface (waveform scrubbing, precise in/out points) that
  falls under Track 23 / design-heavy deferrals, not the functional-sketch MVP.
- Web already provides clip authoring; mobile playback + share covers the primary consumer need.

## Revisit trigger

- Operator visual polish (Track 23) is complete **and** there is demand for on-device clip creation;
  requires a dedicated authoring UX plan (not a sketch).

## Acceptance

- Deferral captured here, linked from the deferrals appendix (589) + placeholder issue (588).
- No create/edit clip screens in v1 (playback + share remain).
