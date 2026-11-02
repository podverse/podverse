## Web playback speed submenu and shell layout

- Surfaces: web, packages/ui, packages/helpers
- Change: Player More → Playback Speed opens a secondary dropdown page listing every rate
  (same panel as sleep timer) instead of cycling or a full-screen modal. Removed unused
  `SideContent` rail; `MainSidebarLayout` is a single-column page gutter. Shell height is
  flex-only (no double `100dvh` player subtract); segment strip reserves flex space; lazy
  player mount keeps `#media-player`; loading overlay no longer uses `100vw` offset.
- Who notices: web listeners picking speed; anyone on wide viewports where the empty side rail
  made the main column look detached or jumping under the player bar
- Operator steps: none

## Mobile Recommendations login CTA when already signed in

- Surfaces: mobile
- Change: A session with tokens but no cached account snapshot no longer parks
  `account-refresh` behind terms consent, and For Me / Recommendations no longer treats a
  missing account as signed-out. That combination had shown "Log in to use this feature" while
  More still said Log Out, and the Login button could not open the auth sheet.
- Who notices: signed-in listeners who opened Recommendations / For Me before the account
  snapshot was ready, or after a cold start with tokens but no local account cache
- Operator steps: none
