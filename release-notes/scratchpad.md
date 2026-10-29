## Mobile notification settings drops the lower "permission required" hint

- Surfaces: mobile
- Change: More › Settings › Notifications no longer shows the "permission required" hint and its
  "Open System Settings" button under the system notifications card, in any state. The device
  push warning banner at the top of the same screen covers a phone without notification
  permission (separate entry). Turning on a Push switch and refusing the system prompt still
  leaves the switch off, saves nothing, and shows the "permission required" message in the
  screen's error line. The first-Subscribe Enable Push answer and the Push switches now share one
  enable path; otherwise their behavior is unchanged.
- Who notices: members who refuse notification permission from a Push switch
- Operator steps: none

## Web asks for push once after signing in on a new browser

- Surfaces: web
- Change: on the first page after signing in, a browser that has not granted notification
  permission shows a one-time dialog (Enable Push / Not Now) when at least one notification
  category has Push on and the account already has a push device on another browser or phone.
  Enable Push opens the browser permission prompt and registers this browser; Not Now only closes
  it. Neither answer changes notification settings. The dialog is remembered per account in this
  browser and never shows on later page loads of the same session.
- Who notices: people who turned on push on one device and then sign in on another browser
- Operator steps: none

## Web channel bell always turns notifications on and stops re-asking for push after the sign-in prompt

- Surfaces: web
- Change: turning on a podcast, album, or artist's notifications asks the browser for push
  permission only while this browser has never shown the sign-in push dialog for the account.
  After that dialog has been shown, and on browsers that blocked notifications or cannot receive
  push, the bell turns the channel's notifications on without asking; push for this browser is
  turned on from notification settings. When the bell does ask and the person refuses or dismisses
  the browser prompt, the channel's notifications still turn on, so its inbox notifications arrive
  without push (the mobile app already worked this way). Before, refusing the prompt left the
  channel off, a blocked browser's bell did nothing, and an unsupported browser showed an error.
- Who notices: people who refuse the browser's notification prompt, dismissed the sign-in push
  dialog, or blocked notifications in their browser, and then turn on a channel's notifications
- Operator steps: none

## Web notification settings warn when this browser lacks push

- Surfaces: web, packages/ui
- Change: the Notifications settings tab shows a warning banner at the very top when the account
  already has a push device registered somewhere (a phone, another browser, or Unified Push), at
  least one notification category has Push on, and this browser has not allowed notifications (or
  is not registered). Its "Allow on This Device" button opens the browser permission prompt and
  registers this browser. When the browser has blocked notifications, the button shows how to
  allow them from the site settings next to the address bar. The banner is hidden for accounts
  with no push device (new accounts with the default settings), when no category has Push on,
  when this browser already receives push, when the account uses Unified Push, and on browsers
  that cannot receive push. The shared `Banner` component gained a `warning` variant (warning
  tint and border from the theme) for this banner and any later warning banner.
- Who notices: signed-in people who turned on push on another device and open notification
  settings on a browser without push permission
- Operator steps: none

## Mobile asks once to allow push after signing in on a new phone

- Surfaces: mobile
- Change: right after signing in on a phone that has not allowed notifications, a member whose
  account has Push on for at least one category and a push device elsewhere sees "Turn On Push
  Notifications on This Device?" once. Enable Push shows the system prompt and registers the
  phone; Not Now only records that it was asked. Category settings do not change. The dialog waits
  until the Terms and Taste Profile screens are done, never appears when the app opens already
  signed in, and is remembered per account on that phone, including after sign-out.
- Who notices: members signing in on a second phone or after reinstalling
- Operator steps: none

## Mobile channel bell asks for push on a phone that has never been asked

- Surfaces: mobile
- Change: turning on a podcast, album, or artist's notifications (header bell or the channel's
  settings switch) now shows the system notification prompt first when the phone has not decided
  yet and the post-sign-in push dialog has never been shown there for this account. The channel's
  notifications turn on whatever the answer. Once the post-sign-in dialog has been shown on that
  phone, the bell never prompts; push is turned on from Notification settings. The first-Subscribe
  push prompt is unchanged.
- Who notices: members who turn on a show's notifications on a phone that never allowed push
- Operator steps: none

## Mobile notification settings warns when this phone lacks push permission

- Surfaces: mobile
- Change: More › Settings › Notifications opens with a warning-colored banner at the top when the
  account already has a push device registered somewhere (FCM, Web Push, or Unified Push), has
  Push on for at least one category, and this phone has not allowed notifications. A new account
  with only the default category settings and no push device does not see it. "Allow on This
  Device" shows the system prompt while the phone can still ask. Once the system will not ask
  again, it opens a short guide whose "Open System Settings" button goes straight to Podverse's
  own notification settings page on Android (falling back to the app info page if the phone
  refuses that page) or to Podverse's page in Settings on iOS. Returning from system settings with
  notifications allowed registers the phone right away. The banner replaces the lower
  "permission required" hint (separate entry).
- Who notices: members who use push on another device, on a phone that never allowed, or later
  blocked, notifications
- Operator steps: none
