import { describe, expect, it } from 'vitest';

import { OPML_IMPORT_ERROR_CODES, resolveOpmlImportError } from './opmlImportErrors.js';

const axiosShapedError = (data: Record<string, unknown>) => ({
  response: { data, status: 400 },
});

describe('resolveOpmlImportError', () => {
  it('returns null when there is no response body code', () => {
    expect(resolveOpmlImportError(new Error('boom'))).toBeNull();
    expect(resolveOpmlImportError({ response: { data: { message: 'x' } } })).toBeNull();
  });

  it('returns null for an unrecognized code', () => {
    expect(
      resolveOpmlImportError(axiosShapedError({ code: 'SOME_OTHER_CODE', message: 'x' }))
    ).toBeNull();
  });

  it('maps BODY_REQUIRED', () => {
    expect(
      resolveOpmlImportError(
        axiosShapedError({
          code: OPML_IMPORT_ERROR_CODES.BODY_REQUIRED,
          message: 'OPML content is required.',
        })
      )
    ).toEqual({ i18nKey: 'opml.import_error_body_required' });
  });

  it('maps NO_VALID_FEEDS', () => {
    expect(
      resolveOpmlImportError(
        axiosShapedError({
          code: OPML_IMPORT_ERROR_CODES.NO_VALID_FEEDS,
          message: 'No valid feed URLs found in OPML.',
        })
      )
    ).toEqual({ i18nKey: 'opml.import_error_no_valid_feeds' });
  });

  it('maps REQUEST_NOT_FOUND', () => {
    expect(
      resolveOpmlImportError(
        axiosShapedError({
          code: OPML_IMPORT_ERROR_CODES.REQUEST_NOT_FOUND,
          message: 'Request not found.',
        })
      )
    ).toEqual({ i18nKey: 'opml.import_error_request_not_found' });
  });

  it('maps BODY_TOO_LARGE with maxChars interpolation', () => {
    expect(
      resolveOpmlImportError(
        axiosShapedError({
          code: OPML_IMPORT_ERROR_CODES.BODY_TOO_LARGE,
          message: 'too large',
          opml_max_body_chars: 1_000_000,
          opml_received_body_chars: 1_000_001,
        })
      )
    ).toEqual({
      i18nKey: 'opml.import_error_too_large',
      values: { maxChars: 1_000_000 },
    });
  });

  it('maps TOO_MANY_FEEDS with maxFeeds interpolation', () => {
    expect(
      resolveOpmlImportError(
        axiosShapedError({
          code: OPML_IMPORT_ERROR_CODES.TOO_MANY_FEEDS,
          message: 'too many',
          opml_max_feeds: 1000,
          opml_received_feeds: 1001,
        })
      )
    ).toEqual({
      i18nKey: 'opml.import_error_too_many_feeds',
      values: { maxFeeds: 1000 },
    });
  });
});
