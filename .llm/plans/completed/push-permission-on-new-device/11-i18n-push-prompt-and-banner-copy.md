**Cursor model:** Cursor Grok 4.7 · **Reasoning:** medium

# 11 — Catalog copy for the sign-in push dialog, banner, and blocked guidance

Every new string the set needs, for web and mobile. Areas B and C add no catalog keys; they use the
keys below and the existing keys listed under "Existing keys to reuse".

## Rows

R5, R6

## Runs after

none

## Files

packages/i18n-catalog/consumer/originals/en-US.json
packages/i18n-catalog/consumer/originals/es.json
packages/i18n-catalog/consumer/originals/fr.json
packages/i18n-catalog/consumer/originals/el-GR.json
packages/i18n-catalog/mobile/originals/en-US.json
packages/i18n-catalog/mobile/originals/es.json
packages/i18n-catalog/mobile/originals/fr.json
packages/i18n-catalog/mobile/originals/el-GR.json

## How to edit

These are large files (**large-file-reading**). Grep the anchor key named below, then insert with
StrReplace beside it. Do not rewrite a catalog file. Do not touch `overrides/` or `compiled/`.
Keep the existing two-space JSON indentation (the keys sit six spaces deep).

## Consumer layer — `settings.notifications.*`

Web and mobile both render these. In each consumer locale file, the anchor is the last key of the
`settings.notifications` block, `"first_subscribe_in_app_only"` (around line 1354–1366). Add a comma
after its value and append these eight keys after it, in this order.

| Key | en-US | es | fr | el-GR |
| --- | --- | --- | --- | --- |
| `sign_in_push_prompt_title` | Turn On Push Notifications on This Device? | ¿Activar las notificaciones push en este dispositivo? | Activer les notifications push sur cet appareil ? | Ενεργοποίηση push ειδοποιήσεων σε αυτή τη συσκευή; |
| `sign_in_push_prompt_body` | Push notifications are turned on for your account. Allow them on this device to get alerts here too. | Las notificaciones push están activadas en tu cuenta. Permítelas en este dispositivo para recibir alertas aquí también. | Les notifications push sont activées pour votre compte. Autorisez-les sur cet appareil pour recevoir aussi les alertes ici. | Οι push ειδοποιήσεις είναι ενεργές για τον λογαριασμό σας. Επιτρέψτε τες σε αυτή τη συσκευή για να λαμβάνετε ειδοποιήσεις και εδώ. |
| `sign_in_push_prompt_enable` | Enable Push | Activar push | Activer le push | Ενεργοποίηση push |
| `sign_in_push_prompt_not_now` | Not Now | Ahora no | Plus tard | Όχι τώρα |
| `device_push_banner_message` | Push notifications are turned on for your account, but this device doesn't have permission to show them. | Las notificaciones push están activadas en tu cuenta, pero este dispositivo no tiene permiso para mostrarlas. | Les notifications push sont activées pour votre compte, mais cet appareil n'a pas l'autorisation de les afficher. | Οι push ειδοποιήσεις είναι ενεργές για τον λογαριασμό σας, αλλά αυτή η συσκευή δεν έχει άδεια να τις εμφανίζει. |
| `device_push_banner_action` | Allow on This Device | Permitir en este dispositivo | Autoriser sur cet appareil | Επιτρέψτε σε αυτή τη συσκευή |
| `device_push_blocked_title` | Notifications Are Blocked | Las notificaciones están bloqueadas | Les notifications sont bloquées | Οι ειδοποιήσεις είναι αποκλεισμένες |
| `device_push_blocked_web_body` | This browser is blocking notifications for this site. Open the site settings from the icon next to the address bar, set Notifications to Allow, then reload this page. | Este navegador bloquea las notificaciones de este sitio. Abre la configuración del sitio desde el icono junto a la barra de direcciones, cambia Notificaciones a Permitir y vuelve a cargar esta página. | Ce navigateur bloque les notifications de ce site. Ouvrez les paramètres du site depuis l'icône à côté de la barre d'adresse, réglez Notifications sur Autoriser, puis rechargez cette page. | Αυτό το πρόγραμμα περιήγησης αποκλείει τις ειδοποιήσεις για αυτόν τον ιστότοπο. Ανοίξτε τις ρυθμίσεις ιστότοπου από το εικονίδιο δίπλα στη γραμμή διευθύνσεων, ορίστε τις Ειδοποιήσεις σε Να επιτρέπεται και, στη συνέχεια, φορτώστε ξανά αυτή τη σελίδα. |

The French title and the French question keep the space before `?`, as `first_subscribe_push_title`
does. The Greek question mark is `;`, as in the existing Greek title. Use the straight apostrophe
`'` in English and French, matching the surrounding entries.

## Mobile layer — `settings.notifications.*`

Mobile only: the system-settings guidance. In each mobile locale file, the anchor is
`"permission_required"` inside `settings.notifications` (line 157 in every locale). Insert one key
directly after it.

| Key | en-US | es | fr | el-GR |
| --- | --- | --- | --- | --- |
| `device_push_blocked_mobile_body` | Notifications for this app are turned off in your device settings. Tap "Open System Settings", turn on notifications, then return to this screen. | Las notificaciones de esta aplicación están desactivadas en los ajustes del dispositivo. Toca «Abrir los ajustes del sistema», activa las notificaciones y vuelve a esta pantalla. | Les notifications de cette application sont désactivées dans les paramètres de l'appareil. Touchez « Ouvrir les paramètres du système », activez les notifications, puis revenez à cet écran. | Οι ειδοποιήσεις αυτής της εφαρμογής είναι απενεργοποιημένες στις ρυθμίσεις της συσκευής. Πατήστε «Άνοιγμα ρυθμίσεων συστήματος», ενεργοποιήστε τις ειδοποιήσεις και επιστρέψτε σε αυτή την οθόνη. |

In en-US the quoted control name uses JSON-escaped double quotes: `\"Open System Settings\"`. The
other locales use their guillemets as written, which need no escaping. The quoted name in each
locale matches that locale's existing `open_system_settings` value.

The key path `settings.notifications.device_push_blocked_mobile_body` does not exist in the
consumer layer, so the layers do not collide.

## Existing keys to reuse (do not add copies)

| Use | Key | Layer |
| --- | --- | --- |
| Mobile blocked dialog, control that opens the app's system notification settings | `settings.notifications.open_system_settings` ("Open System Settings") | mobile |
| Mobile blocked dialog, cancel | `misc.cancel` | consumer |
| Web blocked guidance modal, the one acknowledge button | `misc.ok` | consumer |
| Web modal close button `aria-label` | `misc.close_modal` | consumer (already used by `SettingsNotifications`) |
| Mobile FOSS build, Unified Push not set up after the banner button | `settings.notifications.preference_push_requirement_unified_push` ("Enable Unified Push first.") | mobile |

## Where each key is used

| Key | Web (area B) | Mobile (area C) |
| --- | --- | --- |
| `sign_in_push_prompt_title` | Modal `header` and `ariaLabel` | `ConfirmDialog` title |
| `sign_in_push_prompt_body` | Modal body | `ConfirmDialog` body |
| `sign_in_push_prompt_enable` | Primary button | Confirm action |
| `sign_in_push_prompt_not_now` | Secondary button | Cancel action |
| `device_push_banner_message` | Banner text | Banner text |
| `device_push_banner_action` | Banner button | Banner button |
| `device_push_blocked_title` | Guidance modal header and `ariaLabel` | Guidance `ConfirmDialog` title |
| `device_push_blocked_web_body` | Guidance modal body | not used |
| `device_push_blocked_mobile_body` | not used | Guidance `ConfirmDialog` body |

Web reads them with `useTranslations('settings')` as `tSettings('notifications.<key>')`, the same
as `SettingsNotifications.tsx`. Mobile reads them as `t('settings.notifications.<key>')`.

A web page cannot open the browser's site settings, so web has guidance text and no open-settings
control. Mobile's guidance dialog confirms to `openSystemNotificationSettings`
(`apps/mobile/src/push/fcmTransport.ts`), which opens Podverse's own page in system settings.

## Tests

None in this plan. The catalog validator checks that every locale has the same keys; the set's
last prompt carries that command.

## Release scratchpad

none
