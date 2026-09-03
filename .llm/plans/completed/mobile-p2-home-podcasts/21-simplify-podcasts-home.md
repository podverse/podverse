# 21 — Simplify Podcasts Home

Make Podcasts Home read the complete merged subscription list without rendering or persisting a
Home source filter. Keep the local title filter, sort, list/grid layout, metadata, seen state, and
offline behavior. Protect media-switch requests from stale async results, surface Mark All As Seen
failures, and keep touched controls screen-reader accessible and localized.

Do not run tests during implementation; provide operator verification commands in the response.
