## Add by RSS listens in History

- Surfaces: mobile, web
- Change: History lists Add by RSS episodes and tracks in the same order as catalog listens. On mobile, Play resumes from the saved position, or pauses and resumes when that listen is already current, and Queue Next and Queue Last put it back on the queue. On the web, the row menu matches an episode: Play, Queue Next, Queue Last, Add to Playlist, and Mark as Played. A private placeholder stays a title. Edit mode on the web queue stays Remove only.
- Who notices: listeners of Add by RSS feeds, on the phone and on the website
- Operator steps: none

## Management API image includes the Podcast Index client

- Surfaces: management-api
- Change: The management API runtime image copies `@podverse/external-services-podcast-index`, so the process can start and the catalog allowlist route can load.
- Who notices: operators of a deployment that rolls the management API image; the previous image crash-loops on startup
- Operator steps: publish a new image and roll the management API
