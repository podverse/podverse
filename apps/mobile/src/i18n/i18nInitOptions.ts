/**
 * The catalog is authored in single-brace `{name}` form because web reads the same shared and
 * consumer layers through next-intl. i18next defaults to `{{name}}`, which would leave every
 * placeholder in the compiled bundle sitting on screen verbatim.
 * ICU plural strings are expanded into i18next plural keys in `resources.ts`.
 */
export const MOBILE_I18N_INTERPOLATION = {
  escapeValue: false,
  prefix: '{',
  suffix: '}',
} as const;
