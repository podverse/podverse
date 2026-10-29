## Inbox rows keep their unseen dot for the whole visit

- Surfaces: web, mobile
- Change: Opening the notifications inbox still marks every notification seen, and the next open
  shows no dot on them. During the visit itself, rows that were unseen when it started, or that
  arrived while it was open, now keep their dot even when the list reloads (a stream resync, a
  token refresh, Retry, an Offline Mode switch on mobile, or paging back to page 1 on web). On
  mobile, a notification that arrives while the inbox is open is no longer cached as unseen, so
  the next open does not flash a dot on it before the list loads.
- Who notices: signed-in members who use the inbox
- Operator steps: none

## Mobile notification times read like web, with no raw "#"

- Surfaces: mobile, web, shared i18n catalog
- Change: the time under each mobile inbox notification and in the in-app banner read like
  "2 other {# hours ago}}". Mobile now formats it with the platform relative-time formatter, as
  web does, in the app's language: "2 hours ago", "yesterday", "now". Screen readers on inbox rows
  hear the same corrected text. Web's inbox uses the same shared formatter with no visible change.
  Mobile now bundles small `Intl.PluralRules` and `Intl.RelativeTimeFormat` polyfills for its four
  languages, because Hermes lacks both. That also gives the app's plural strings each language's
  own plural rules (French "0" takes the singular form). The unused
  `notifications_page.relative_time_*` catalog keys are removed.
- Who notices: signed-in mobile users with notifications; screen reader users on the inbox;
  translators (nine fewer keys, none of which had override text)
- Operator steps: none. The polyfills are JavaScript only, so no native rebuild is needed.

## Mobile reads the shared catalog's plural strings

- Surfaces: mobile, shared i18n catalog
- Change: mobile now expands the catalog's ICU plural strings (`{count, plural, …}`) into its own
  plural keys as it loads its strings, so a plural string written once for web also renders on
  mobile. Removed Content (the clip and playlist entry counts) and the OPML import rate-limit
  message now use the same shared strings as web, and the mobile-only copies of those strings are
  deleted from the mobile catalog in all four languages. The text people see does not change. A
  plural string added to the shared or consumer catalog later renders on mobile with no extra
  mobile copy.
- Who notices: translators and operators, who now edit these strings in one place; listeners see
  no change
- Operator steps: none
