# 10 — User Communication

## Goal

Tell v4 users what is coming, what to expect during the grace period, and when
the old app will stop working — without shipping a new v4 mobile binary.

## Status

An announcement will go out. The public name is NextGen. The date in that
message is earlier than the real grace end.

## What we know

- Free-text in-app announcement is **not** available from the current v4 meta
  API ([02](02-capabilities-and-limits.md)). The only one-time full screen is
  the maintenance overlay. Its words are compiled into the app. The server
  supplies the start and end times only.
- A notification tap in the installed app opens Podverse, then an episode when
  the payload has a podcast id and an episode id. It does not open a browser.
  There is no mass notification.
- Available levers: mass email, store listing text, a longer reply sent when
  someone contacts us, and at the end `MINIMUM_MOBILE_VERSION` (blocking
  overlay with hardcoded "update" copy). There is no public migration page.
- Maintenance overlays are the wrong tone for migration news.

## Proposed approach

### Timeline of messages

| Phase | Channel | Intent |
| ----- | ------- | ------ |
| Before store submit | Email; Play/App Store "what's new" draft | Short heads-up. |
| Store live (grace start) | Email + listing | Update when ready; data migrates on login; keep using v4 until you switch |
| Mid grace | Reminder email to not-yet-migrated (if measurable) | Nudge. |
| Grace end approaching | Email | A public date, earlier than the real end. After it, people who have not updated to NextGen are told we will migrate them. |
| Grace end | Raise `MINIMUM_MOBILE_VERSION` | The real end, which can be later than the announced date. Force update path to the NextGen build on the same listing. |

### Reply when someone asks

There is no public migration page. The email is the short public message.
When someone asks through an existing contact option, we reply with a longer
text that explains the move in more detail. That text is not a web page and
it is not linked from the announcement. It is not drafted yet.

### Content principles

- The public name is NextGen.
- The message is short. It says what will happen, asks people to back up their
  data, and says we keep a backup if they do not make their own.
- It gives an end date. That date is earlier than the real grace end. A line
  says that after the announced date, an account that has not updated to
  NextGen is migrated for them. The batch itself waits for the real end
  ([12](12-production-launch-and-grace-period.md)).
- Same email and password.
- On-device files are best-effort ([08](08-mobile-first-launch-migration.md)).
  Review that plan before the backup sentence is final, so the message does
  not promise a local file the app cannot map.
- Beta testers: installing beta replaces v4 on that device.
- Someone who writes in gets the longer reply. There is no public page for it.
- No secrets, no raw account dumps in any tooling that builds the list.

### Email list

The list is the 20,520 v4 accounts with `emailVerified`. The other 1,990 have
an email and never got a login session: v4 answers login with "Please verify
your email address to login." They have no history rows and no playlists. 571
have podcast ids stored at signup, and 4 have a future membership. They are
not emailed. They are still seeded as v5 accounts
([07](07-account-and-data-migration-model.md)). Export stays outside the repo.
The from-address is `contact@podverse.fm`. The send method is not chosen yet.
When it is, the send still follows unsubscribe and legal requirements.

### Draft

English only. v4 does not store a user locale. `users` has no locale column,
and neither do `fcmDevices` or `upDevices`. A podcast's `language` is the
feed's language, not the listener's.

From `contact@podverse.fm`. The date is filled in when the public date is
known. It is earlier than the real grace end. Do not put the real end in this
message.

```text
Subject: Update to NextGen

Podverse NextGen is the next version of Podverse. You sign in with the same
email and password. When you sign in, your account is copied over.

Please back up your data. We keep a backup if you do not make your own.
Files saved only on your device may not all come across.

After [announced date], if you have not updated to NextGen, we will migrate
your account for you.
```

## Honest limits and risks

- Users without email, with bouncing addresses, or with notifications disabled
  will only see the store listing or the final force-update screen.
- Hardcoded overlay copy cannot explain "migration in progress" nuance.
- Sending too early (before the v5 build is actually available) creates support
  load.

## Future plan sets

- Copy deck (email / longer reply / listing).
- Operator runbook for list export and send (PII outside git).
- Metrics: migrated vs contacted vs remaining.
