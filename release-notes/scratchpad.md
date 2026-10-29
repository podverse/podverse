## Tab rows scroll by dragging, without a scrollbar

- Surfaces: web, management-web
- Change: Settings, profile, and management tab rows hide the horizontal scrollbar and scroll with a
  click-and-drag, the same way chip rows do. Both use `HorizontalDragScroller`.
- Who notices: anyone whose window is too narrow for the full tab row

## Alpha test push

- Surfaces: workers, k8s ops, alpha workers env
- Change: `notificationsTestPush` lists an account's registered devices or sends a visible test
  push and prints each provider result. It refuses unless `NOTIFICATIONS_TEST_PUSH_ENABLED` is
  `true`. Alpha workers env sets that flag. Operators start a Job with
  `npm run notifications:test-push:k8s`.
- Who notices: operators debugging push delivery on alpha
- Operator steps: publish a workers image that contains the command, pin the alpha ops app to a
  ref that includes the `ops-notifications-test-push` CronJob, sync the workers ConfigMap, then
  run the script
