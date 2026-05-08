export type TranslationValue = string | Record<string, unknown>;

export type MiscTranslations = Record<string, TranslationValue>;

export type LoadGlobalErrorTranslationsArgs = {
  loadMessages: (locale: string) => Promise<unknown>;
  loadFallback: () => Promise<unknown>;
  fallbackErrors: Record<string, string>;
  fallbackMisc: MiscTranslations;
};

/** Ultimate fallback when locale JSON imports fail (e.g. offline). Apps may reuse for `useState` initial value. */
export const DEFAULT_GLOBAL_ERROR_FALLBACK_ERRORS: Record<string, string> = {
  global_title: 'Application Error',
  global_message: 'A critical error occurred. Please refresh the page.',
  details_development_only: 'Error details (development only)',
};

export const DEFAULT_GLOBAL_ERROR_FALLBACK_MISC: MiscTranslations = {
  try_again: 'Try again',
  reload_page: 'Reload page',
};

function filterStrings(obj: Record<string, unknown> | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj || {})) {
    if (typeof value === 'string') {
      result[key] = value;
    }
  }
  return result;
}

function readLocaleCookie(): string {
  if (typeof document === 'undefined') {
    return 'en-US';
  }
  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1] ?? 'en-US'
  );
}

function getDefaultExport(mod: unknown): Record<string, unknown> | undefined {
  if (mod === null || mod === undefined) {
    return undefined;
  }
  if (typeof mod === 'object' && 'default' in mod) {
    const inner = (mod as { default: unknown }).default;
    if (inner !== null && inner !== undefined && typeof inner === 'object') {
      return inner as Record<string, unknown>;
    }
    return undefined;
  }
  if (typeof mod === 'object') {
    return mod as Record<string, unknown>;
  }
  return undefined;
}

function messagesFromModule(raw: unknown): {
  errors: Record<string, string>;
  misc: MiscTranslations;
} {
  const root = getDefaultExport(raw);
  const errorsVal = root?.errors;
  const miscVal = root?.misc;
  const errorsRecord =
    errorsVal !== null && errorsVal !== undefined && typeof errorsVal === 'object'
      ? (errorsVal as Record<string, unknown>)
      : undefined;
  const miscRecord =
    miscVal !== null && miscVal !== undefined && typeof miscVal === 'object'
      ? (miscVal as MiscTranslations)
      : {};
  return {
    errors: filterStrings(errorsRecord),
    misc: miscRecord,
  };
}

/**
 * Loads `errors` + `misc` string maps from the app's i18n JSON for global-error (outside
 * NextIntl). Reads `NEXT_LOCALE` from the cookie, then falls back to English, then to
 * `fallbackErrors` / `fallbackMisc`.
 */
export async function loadGlobalErrorTranslations(args: LoadGlobalErrorTranslationsArgs): Promise<{
  errors: Record<string, string>;
  misc: MiscTranslations;
}> {
  const localeCookie = readLocaleCookie();

  try {
    const raw = await args.loadMessages(localeCookie);
    return messagesFromModule(raw);
  } catch {
    try {
      const raw = await args.loadFallback();
      return messagesFromModule(raw);
    } catch {
      return {
        errors: { ...args.fallbackErrors },
        misc: { ...args.fallbackMisc },
      };
    }
  }
}
