import { describe, expect, it } from 'vitest';

import { MetaboostOwnerTermsNotAcceptedPostError } from './metaboostOwnerTermsNotAcceptedPostError.js';
import {
  METABOOST_OWNER_TERMS_NOT_ACCEPTED_CURRENT_CODE,
  throwKnownMetaboostPostError,
} from './metaboostPostErrorHandling.js';
import { MetaboostSenderBlockedPostError } from './metaboostSenderBlockedPostError.js';

describe('throwKnownMetaboostPostError', () => {
  it('rethrows sender_blocked as typed error', () => {
    const error = {
      response: {
        status: 403,
        data: {
          code: 'sender_blocked',
          message: '  Blocked by recipient  ',
        },
      },
    };

    expect(() => throwKnownMetaboostPostError(error)).toThrowError(MetaboostSenderBlockedPostError);
    try {
      throwKnownMetaboostPostError(error);
    } catch (caught) {
      expect(caught).toBeInstanceOf(MetaboostSenderBlockedPostError);
      if (caught instanceof MetaboostSenderBlockedPostError) {
        expect(caught.detailMessage).toBe('Blocked by recipient');
      } else {
        throw new Error('Expected MetaboostSenderBlockedPostError', { cause: caught });
      }
    }
  });

  it('rethrows owner_terms_not_accepted_current as typed error', () => {
    const error = {
      response: {
        status: 403,
        data: {
          code: METABOOST_OWNER_TERMS_NOT_ACCEPTED_CURRENT_CODE,
          message: 'Owner must accept latest terms',
        },
      },
    };

    expect(() => throwKnownMetaboostPostError(error)).toThrowError(
      MetaboostOwnerTermsNotAcceptedPostError
    );
  });

  it('does nothing for non-403 errors', () => {
    const error = {
      response: {
        status: 500,
        data: {
          code: 'sender_blocked',
        },
      },
    };

    expect(() => throwKnownMetaboostPostError(error)).not.toThrow();
  });

  it('does nothing for unknown response code', () => {
    const error = {
      response: {
        status: 403,
        data: {
          code: 'some_other_code',
        },
      },
    };

    expect(() => throwKnownMetaboostPostError(error)).not.toThrow();
  });
});
