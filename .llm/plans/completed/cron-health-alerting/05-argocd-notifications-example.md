**Cursor model:** Codex 5.3 · **Reasoning:** high

# 05 — Example: Argo CD notifications to Matrix and ntfy

## Rows

R8, R9, R10

## Runs after

none

## Goal

Post to the environment's Matrix room when a deploy goes live, when a sync fails, and when an app
turns Degraded. Sync failures and Degraded apps also push to phones through ntfy; routine deploys
do not. Argo CD's notifications controller is part of a standard install; it only needs config.

## Decisions

1. `argocd-notifications-cm.yaml`: the `argocd-notifications-cm` ConfigMap for namespace `argocd`.
   Verify every field against the Argo CD notifications docs for a current Argo CD release (state
   the version in the final message), including how `$key` references to
   `argocd-notifications-secret` work in service config.
2. **Matrix service:** `service.webhook.matrix` calling
   `PUT https://matrix-client.matrix.org/_matrix/client/v3/rooms/{roomId}/send/m.room.message/{txnId}`
   (homeserver commented as overridable) with `Authorization: Bearer $matrix-token`. The room id
   comes from the subscription recipient or a template variable; pick whichever the webhook
   service supports and explain. `txnId` must be unique per message (app name, revision, trigger
   name, operation finish time). Rooms must be unencrypted.
3. **ntfy service:** `service.webhook.ntfy` posting to the environment's topic URL from the secret
   (`$ntfy-podverse-alpha-url`, `$ntfy-metaboost-alpha-url`), with `Title`, `Priority` (5 for sync
   failed, 4 for degraded), `Tags`, and `Click` (link to the app in Argo CD) headers, and
   `Authorization: Bearer $ntfy-token` when set. If a whole URL cannot come from a secret
   reference, put the base URL in the service and only the topic in the secret; explain.
4. **Triggers and templates:**
   - `on-deployed`: sync Succeeded and health Healthy, once per revision. Message: app, short
     revision, image tag when the app sets one, link `{{.context.argocdUrl}}/applications/…`.
     **Matrix only.**
   - `on-sync-failed`: operation phase Error or Failed, with the operation message. Matrix and
     ntfy.
   - `on-health-degraded`: health Degraded. Matrix and ntfy.
   Each template has a `webhook.matrix` and, where used, a `webhook.ntfy` section.
5. **Subscriptions:** default subscriptions in the ConfigMap, selected by an app label, with
   placeholders: apps labeled `podverse.fm/notify-env: podverse-alpha` → Podverse alpha room and
   topic; `metaboost-alpha` → Metaboost alpha room and topic. If default subscriptions cannot
   select by label in the verified version, use per-app annotations and show them in a comment.
6. The ConfigMap lives in `argocd`. Warn in a comment that a GitOps repo managing it must not let
   two sources own the same ConfigMap (Argo's own install vs this file).
7. **Secret generator** `infra/k8s/scripts/secret-generators/create_argocd_notifications_secret.sh`:
   writes `argocd-notifications-secret` (keys `matrix-token`, optional `ntfy-token`, and one
   `ntfy-<env>-url` per environment) to `./secrets/argocd-notifications-secret.enc.yaml` (SOPS),
   same style as plan 04's scripts. The README says a second Matrix bot account, separate from the
   alert relay's, limits what one leaked token can post.
8. Put README text and one generators-doc line in your final message under "Docs for 06".

## Files

- `infra/k8s/alpha/examples/optional-alerting/argocd-notifications-cm.yaml` (new)
- `infra/k8s/scripts/secret-generators/create_argocd_notifications_secret.sh` (new)

## Tests

None at the unit tier. The closing block includes a manual check: sync an app and watch the room;
break a sync on purpose in a test app and watch for the phone push.

## Release scratchpad

Surfaces: k8s, ops. Example Argo CD notifications config posts deploys, failed syncs, and degraded
apps to a Matrix room per environment, and pushes failed syncs and degraded apps to phones through
ntfy. New `create_argocd_notifications_secret.sh`.
