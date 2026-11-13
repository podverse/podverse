**Cursor model:** Cursor Grok 4.7 · **Reasoning:** high

# 51 — Credentials note matches who receives the password

`features.add_by_rss.credentials_page_device_note` in the consumer catalog says the service
receives the username and password over HTTPS and does not keep them. That sentence is true on
the website and for every signed-in user on mobile, because a signed-in user always uses the
server parse. It is false only while signed out: the phone parses the feed, and the password
goes only to the feed host.

The key is shared, and a duplicate key path in the mobile layer is rejected
(`packages/i18n-catalog/scripts/i18n-validate.ts`, consumer+mobile). Do not edit the consumer
string. Add a mobile-only key and choose it from the parse path.

## Rows

R4

## Runs after

32, 50, 71

## Files

packages/i18n-catalog/mobile/originals/en-US.json
packages/i18n-catalog/mobile/originals/es.json
packages/i18n-catalog/mobile/originals/fr.json
packages/i18n-catalog/mobile/originals/el-GR.json
apps/mobile/src/screens/rss/AddByRssCredentialsScreen.tsx
apps/mobile/src/screens/home/addByRss/AddByRssSettingsPane.tsx
release-notes/scratchpad.md

`npm run i18n:compile` (repo root) may add an empty slot for the new key under
`packages/i18n-catalog/mobile/overrides/`. If it does, those override files are part of this
change. Do not type override values by hand. Do not edit `*/compiled/`.

Plans 70 and 71 edit the same mobile originals. They own `settings.opml.export_description_device`,
`settings.opml.export_device_empty`, and `authentication.signup_add_by_rss_limit.*`. Plan 64
inserts `features.add_by_rss.feed_limit_help` in this same `features.add_by_rss` block. Insert
only `credentials_page_host_note`. Do not rewrite their keys or their sentences.

## Decisions already made (transcribe, do not revisit)

- Branch on parse path. One shared sentence cannot be true on the website, where there is no
  device parse. The consumer string stays the server-path sentence, including on mobile when
  `useAddByRssParsePath()` is `'server'`.
- The hook returns `'device'` only when there is no signed-in session. Every signed-in session
  returns `'server'`, including a free account, a lapsed membership, and the gap while the
  account snapshot has not loaded. The host note shows only while signed out. Do not add a
  third string, and do not switch a signed-in user to the host note when the snapshot arrives.
- Do not mention the product name in the new string. The consumer string already hardcodes it;
  leave that string unchanged.

## 1. Mobile catalog key

Search `features.add_by_rss` in each mobile `originals` file (**large-file-reading**: do not
rewrite the file). Insert `credentials_page_host_note` beside `credentials_mobile_media_note`.

en-US (sentence case; this is help text):

`Your username and password stay on this device, so you need to enter them again on each device you use. This app sends them only to the feed's site.`

es:

`El usuario y la contraseña se quedan en este dispositivo, así que debes introducirlos de nuevo en cada dispositivo que uses. Esta app los envía solo al sitio del feed.`

fr:

`L'identifiant et le mot de passe restent sur cet appareil : vous devez les saisir à nouveau sur chaque appareil. Cette app les envoie uniquement au site du flux.`

el-GR:

`Το όνομα χρήστη και ο κωδικός μένουν σε αυτή τη συσκευή, οπότε πρέπει να τα εισαγάγετε ξανά σε κάθε συσκευή. Αυτή η εφαρμογή τα στέλνει μόνο στον ιστότοπο της ροής.`

Then, from the repo root, run `npm run i18n:compile` so override slots stay in sync. Do not
edit `packages/i18n-catalog/consumer/originals/*`.

## 2. Both mobile screens

`useAddByRssParsePath` is created by plan 32 (`apps/mobile/src/hooks/useAddByRssParsePath.ts`).

In `AddByRssCredentialsScreen.tsx`, import it from `../../hooks/useAddByRssParsePath`. In
`AddByRssSettingsPane.tsx`, import it from `../../../hooks/useAddByRssParsePath`.

In each component, next to the existing `useTranslation()` call:

```tsx
const parsePath = useAddByRssParsePath();
const credentialsNoteKey =
  parsePath === 'device'
    ? 'features.add_by_rss.credentials_page_host_note'
    : 'features.add_by_rss.credentials_page_device_note';
```

Replace the `t('features.add_by_rss.credentials_page_device_note')` call with
`t(credentialsNoteKey)`. Leave `credentials_page_intro` and `credentials_mobile_media_note` as
they are. Leave `testID="rss-credentials-device-note"` on the credentials screen. The settings
pane's description has no testID; do not add one.

Web (`AddByRSSCredentialsPageClient.tsx`, `AddByRSSCredentialsSettingsSection.tsx`) keeps
`credentials_page_device_note`. Do not edit those files.

## Tests

No new test. The sentence is catalog copy chosen by a hook plan 32 already covers. Maestro
flows assert `rss-credentials-device-note` by id, not by the sentence
(`apps/mobile/e2e/add-by-rss-credentials.yaml`). Do not add a flow.

## Release scratchpad

```markdown
## Add by RSS password note when the phone parses the feed

- Surfaces: mobile
- Change: On the username-and-password screen, a signed-out phone says the app sends the username and password only to the feed's site. A signed-in user, including a free account or a lapsed membership, still uses the sentence that says the service receives them over HTTPS and does not keep them. The website keeps that sentence.
- Who notices: signed-out mobile users entering a feed username and password
- Operator steps: none
```
