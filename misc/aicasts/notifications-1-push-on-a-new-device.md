# Notifications 1: Push on a New Device

- **Version:** 2026-10-29T21:06-05:00
- **Episode ID:** notifications-push-on-a-new-device
- **Changed:** First version.
- **Description:** When Podverse asks to allow push on a device the account has just signed
  in on, why a new account does not see that question, and the warning at the top of
  notification settings when this device still cannot show alerts.
- **Status:** Built
- **Group:** Notifications, part 1
- **Sources:** `packages/helpers/src/lib/notificationPush.ts`,
  `apps/web/src/components/Auth/SignInPushPrompt.tsx`,
  `apps/web/src/components/Settings/Panels/SettingsNotifications/DevicePushBanner.tsx`,
  `apps/mobile/src/notifications/SignInPushPromptHost.tsx`,
  `packages/i18n-catalog/consumer/originals/en-US.json` (the sign-in prompt and device
  banner strings),
  `packages/i18n-catalog/mobile/originals/en-US.json` (`device_push_blocked_mobile_body`)
- **Length:** about 4 minutes (673 words)

## Directions for the voice service (do not read aloud)

- Two voices. **Claire** is a woman: warm, clear, measured. **Tom** is a man: relaxed, curious.
  Each line starts with the speaker's name and a colon. That name picks the voice. Never read it.
- About 150 words per minute. Natural turn-taking, no overlap.
- Read only the lines under **Script**, exactly as written. Do not read headings or these
  directions.
- A line that says `(pause)` is about one and a half seconds of silence. Never say "pause".
- No music, sound effects, intro, or outro.
- Pronunciation: **Podverse** "POD-verse". The shared checks are **should offer sign-in push
  prompt** and **should show device push banner**.
- If your service writes its own script from this one, keep every number and every claim
  exactly, keep both voices, and add nothing the text does not say.

## Script

CLAIRE: This is part one of Notifications. It covers the one question we ask when someone signs in on a device that cannot show push yet, and the warning that stays on notification settings until this device can. It's built on the website and the phone. Both sides use the same checks.

TOM: Who is this for? Everyone who signs in?

CLAIRE: No. It's for someone who already receives push on another device, and has just signed in here. A brand-new account does not see it. Opening the app while you are already signed in does not ask either. On the phone, the question comes right after a sign-in on this device.

(pause)

TOM: Why not ask every new account? Push has to start somewhere.

CLAIRE: New accounts are seeded with Push on for some categories. If we treated that seed as a choice, we would ask on the first sign-in of every account. The extra requirement is a push device already registered on the account. That is what separates a choice they made from the defaults.

TOM: So what all has to be true?

CLAIRE: Four things, in the check named should offer sign-in push prompt. This device has not already been shown the dialog for this account. This device can still show the system permission prompt. The account already has a registered push device. And at least one category has Push on. On the website, a server-environment notice has to be out of the way first. If the check fails, the dialog stays closed, and we do not record that we asked.

(pause)

TOM: What does the dialog say, and what do the buttons do?

CLAIRE: The title is Turn On Push Notifications on This Device? The body says, Push notifications are turned on for your account. Allow them on this device to get alerts here too. The buttons are Not Now, then Enable Push. We record that this device was shown the dialog at the moment it opens, in storage on this device, keyed by the account. Enable Push asks the system for permission and registers this device. Not Now only closes the dialog. Neither answer changes which categories have Push on.

TOM: So Not Now still counts. The next sign-in on this device will not ask again.

CLAIRE: Right. And once that flag is set, turning notifications on from a show's bell does not open an automatic enable-push prompt. This device gets push from notification settings.

(pause)

TOM: What if they said Not Now, or the system will not ask again?

CLAIRE: Notification settings shows a warning at the top. The check is named should show device push banner. It needs the same account facts: a registered push device somewhere, and a category with Push on. This device has not allowed notifications. That includes the case where the platform will not show its prompt again. The message is, Push notifications are turned on for your account, but this device doesn't have permission to show them. The button is Allow on This Device.

TOM: And if the platform has already refused to ask?

CLAIRE: The button opens guidance instead of the system prompt. The title is Notifications Are Blocked. On the website, the text says to open the site settings from the icon next to the address bar, set Notifications to Allow, and reload the page. On the phone, it says to tap Open System Settings, turn notifications on, and come back to this screen.

(pause)

TOM: What I would tell the next person. Ask once, right after sign-in, and only when this account already has push on a device and this device can still be asked. A new account's seeded Push switches are not that signal. Record the ask when the dialog opens, and leave the category switches alone. After that, the bell does not ask, and notification settings keeps the warning until this device can show alerts. If the system will not prompt, the button explains how to allow it, instead of asking again.

CLAIRE: Same four facts on the website and the phone. The storage is on the device, so each browser and each phone answers for itself.
