/**
 * Hermes provides `Intl.NumberFormat`, `DateTimeFormat`, and `Collator`, but not
 * `Intl.PluralRules` or `Intl.RelativeTimeFormat`. The notification time line formats with
 * `Intl.RelativeTimeFormat`, which needs `Intl.PluralRules`. i18next also picks plural forms
 * through `Intl.PluralRules`. Each polyfill installs only when the runtime lacks the API.
 * Locale data covers the app's four languages; a language added to `SUPPORTED_LOCALES` needs its
 * two data imports here. `Intl.Locale` is not polyfilled, because `formatRelativeTimeLabel`
 * matches locales by lookup.
 */
import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/el.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
import '@formatjs/intl-pluralrules/locale-data/es.js';
import '@formatjs/intl-pluralrules/locale-data/fr.js';
import '@formatjs/intl-relativetimeformat/polyfill.js';
import '@formatjs/intl-relativetimeformat/locale-data/el.js';
import '@formatjs/intl-relativetimeformat/locale-data/en.js';
import '@formatjs/intl-relativetimeformat/locale-data/es.js';
import '@formatjs/intl-relativetimeformat/locale-data/fr.js';
