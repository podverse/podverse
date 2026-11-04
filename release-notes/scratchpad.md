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

## Recent-feeds survives a Podcast Index page timeout

- Surfaces: workers
- Change: `/recent/data` and `/episodes/byfeedid` wait 30 seconds and retry a deadline abort. If
  the page still times out, `worker-recent-feeds` stops cleanly and the next run resumes from the
  last finished page or gap-sweep chunk.
- Who notices: alpha operators watching `podverse-alpha-cron` and the recent-feeds CronJob
- Operator steps: after the new workers image is on alpha, delete the old Failed Jobs in
  `podverse-alpha` so Argo CD drops Degraded. `failedJobsHistoryLimit` stays 5.

## Cron overlay pins management-api for admin session purge

- Surfaces: k8s, ops
- Change: The alpha cron Kustomize overlay sets `newTag` for
  `ghcr.io/podverse/podverse/management-api` as well as workers, so the
  `management-api-admin-session-purge` CronJob no longer pulls an untagged image. The CronJob
  contract check fails when a Podverse image under `infra/k8s/base/cron/` is missing from that
  overlay's `images:` list.
- Who notices: alpha operators after the GitOps pin syncs; daily admin session purge can run again
  once the stuck Job is deleted
- Operator steps: push the k.podcastdj.com cron overlay change; after Argo syncs, delete Job
  `management-api-admin-session-purge-29892165` in `podverse-alpha`
