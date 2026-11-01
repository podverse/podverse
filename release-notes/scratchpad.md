## Subscribed lists wait for parsed Add by RSS

- Surfaces: web
- Change: Subscribed podcasts, episodes, artists, albums, tracks, and livestreams read this
  browser's parsed Add by RSS feeds before the follow-stub request and before rebuilding the
  local item index. When the account follows Add by RSS feeds, those lists stay on the spinner
  until that local mix is ready, then paint once. A feed that is not parsed yet can still appear
  when its parse finishes.
- Who notices: someone refreshing a subscribed list that includes Add by RSS
- Operator steps: none

## Subscribe seeds recommendations at weight 1

- Surfaces: api, web, mobile
- Change: Following a directory show with Taste Profile on adds that show to the Taste Profile at
  recommendation weight 1 without recording a listen. Unfollowing drops that seed when there are
  still no listens and no manual weight. The Recommendations empty-state copy says recommendations
  update as you subscribe to content and as you listen.
- Who notices: someone who turns on Taste Profile and subscribes before listening; Recommendations
  and Taste Profile Settings
- Operator steps: none
