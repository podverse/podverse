# 22 — Home-stack add-by-RSS detail

Register a typed Home-stack route for local add-by-RSS feed identity. Render the persisted feed
bundle and episodes offline, reuse the add-by-RSS playback path, persist a feed-scoped episode
sort, mark the feed seen with the `add-by-rss` kind, and remove it with a Home refresh notification.

Keep server-only directory features unavailable and represent processing/empty/error states with
localized accessible UI. Do not run tests during implementation; provide operator verification
commands in the response.
