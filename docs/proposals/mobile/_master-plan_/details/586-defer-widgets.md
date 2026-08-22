# 586-defer-widgets

**Master step:** 21.7
**Model (author + implement):** Auto
**Status:** done

## Scope

Record **home-screen widgets / iOS Live Activities / Dynamic Island** as a **v1 deferral**. v1 ships
standard now-playing via the OS media session / lock-screen controls only.

## Rationale

- Widgets and Live Activities are separate native targets with their own update lifecycles and design
  work — polish surfaces, not MVP functionality.
- The system media session already provides lock-screen / notification transport parity.

## Revisit trigger

- Post-v1 polish cycle **and** demand for glanceable now-playing beyond the system media session.

## Acceptance

- Deferral captured here, linked from the deferrals appendix (589) + placeholder issue (588).
- No widget / Live Activity / Dynamic Island target in v1.
