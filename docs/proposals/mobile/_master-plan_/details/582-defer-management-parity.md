# 582-defer-management-parity

**Master step:** 21.3
**Model (author + implement):** Auto
**Status:** done

## Scope

Record **full management-web parity on mobile** as a **v1 deferral**. The mobile app targets the
consumer surface (listen, subscribe, playlists, downloads, car). Admin/management flows stay on
`management-web`.

## Rationale

- Management features serve a small operator/admin audience already well served by the web dashboard.
- Building admin CRUD on mobile would divert effort from the consumer MVP with little user benefit.

## Revisit trigger

- A concrete operator workflow needs on-the-go mobile access **and** cannot be served by
  `management-web` responsive layouts.

## Acceptance

- Deferral captured here, linked from the deferrals appendix (589) + placeholder issue (588).
- No management/admin screens are added to the mobile app in v1.
