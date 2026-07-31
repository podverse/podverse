import { getErrorResponseBody, getErrorResponseBodyCode } from '../error/errorParsing.js';
import { getFiniteNumberProperty } from '../guards.js';

export const OPML_IMPORT_ERROR_CODES = {
  BODY_REQUIRED: 'OPML_BODY_REQUIRED',
  NO_VALID_FEEDS: 'OPML_NO_VALID_FEEDS',
  BODY_TOO_LARGE: 'OPML_BODY_TOO_LARGE',
  TOO_MANY_FEEDS: 'OPML_TOO_MANY_FEEDS',
  REQUEST_NOT_FOUND: 'OPML_REQUEST_NOT_FOUND',
} as const;

export type OpmlImportErrorCode =
  (typeof OPML_IMPORT_ERROR_CODES)[keyof typeof OPML_IMPORT_ERROR_CODES];

export type OpmlImportErrorResolution = {
  /** Key relative to the `settings` namespace (e.g. `opml.import_error_too_large`). */
  i18nKey: string;
  values?: Record<string, number>;
};

/**
 * Map a recognized OPML import API error `code` to an i18n key + interpolation values.
 * Returns null when the error has no recognized OPML import code.
 */
export const resolveOpmlImportError = (error: unknown): OpmlImportErrorResolution | null => {
  const code = getErrorResponseBodyCode(error);
  if (code === undefined) {
    return null;
  }

  if (code === OPML_IMPORT_ERROR_CODES.BODY_REQUIRED) {
    return { i18nKey: 'opml.import_error_body_required' };
  }

  if (code === OPML_IMPORT_ERROR_CODES.NO_VALID_FEEDS) {
    return { i18nKey: 'opml.import_error_no_valid_feeds' };
  }

  if (code === OPML_IMPORT_ERROR_CODES.REQUEST_NOT_FOUND) {
    return { i18nKey: 'opml.import_error_request_not_found' };
  }

  const body = getErrorResponseBody(error);

  if (code === OPML_IMPORT_ERROR_CODES.BODY_TOO_LARGE) {
    const maxChars =
      body === undefined ? null : getFiniteNumberProperty(body, 'opml_max_body_chars');
    if (maxChars === null) {
      return { i18nKey: 'opml.import_error_too_large', values: { maxChars: 0 } };
    }
    return { i18nKey: 'opml.import_error_too_large', values: { maxChars } };
  }

  if (code === OPML_IMPORT_ERROR_CODES.TOO_MANY_FEEDS) {
    const maxFeeds = body === undefined ? null : getFiniteNumberProperty(body, 'opml_max_feeds');
    if (maxFeeds === null) {
      return { i18nKey: 'opml.import_error_too_many_feeds', values: { maxFeeds: 0 } };
    }
    return { i18nKey: 'opml.import_error_too_many_feeds', values: { maxFeeds } };
  }

  return null;
};
