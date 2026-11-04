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

## Signed-out homepage subscriptions empty state

- Surfaces: web
- Change: A signed-out visit to Subscribed home shows "Your subscriptions will appear here."
  with Login on that line, which opens the login dialog. Search and Browse buttons sit under
  the sentence, Search first. The longer getting-started paragraph and the separate "Log in to
  use this feature." prompt are gone from that landing view. Other signed-out lists keep their
  existing login prompt.
- Who notices: visitors who open the site without an account
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

## DeploymentScaledToZero ignores expected zero replicas

- Surfaces: k8s, ops
- Change: Deployments labeled `podverse.fm/expected-replicas: "0"` no longer raise
  `DeploymentScaledToZero`. The keyvaldb GUI Deployment carries that label. kube-state-metrics
  allowlists the label on Deployments so the PromQL `unless` can see it.
- Who notices: alpha operators; the repeating keyvaldb-gui scaled-to-zero warning stops after
  the rule, allowlist, and label sync
- Operator steps: push monorepo and k.podcastdj.com changes; after Argo syncs prometheus,
  kube-state-metrics, and podverse-alpha-ops, wait for the next rule evaluation
