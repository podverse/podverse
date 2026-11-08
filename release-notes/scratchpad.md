## Test push can target an account by email

- Surfaces: workers
- Change: `notificationsTestPush` accepts `--email` as an alternative to `--username`. The k8s launcher allows `@` and `+` in that argument. Pass one of the two flags, not both.
- Who notices: operators sending a test push to an account that has an email and no username
- Operator steps: the alpha workers image has to include this change before `--email` works on the cluster

## Sync progress stays quiet when the work is already done

- Surfaces: mobile
- Change: The sync progress row waits 400 ms before it appears and stays at least 500 ms once
  shown, so a run that finishes immediately does not flash above the tab bar. Closing the iOS
  screenshot preview, Control Center, or a system alert does not start a sync, because the app
  never went to the background. A real return from the background still syncs, on iOS and Android.
- Who notices: anyone who takes a screenshot, or comes back to a sync that finishes immediately
- Operator steps: none
