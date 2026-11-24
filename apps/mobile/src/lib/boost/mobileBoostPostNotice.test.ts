import { describe, expect, it } from 'vitest';

import {
  MetaboostCapabilityPreflightError,
  MetaboostOwnerTermsNotAcceptedPostError,
  MetaboostSenderBlockedPostError,
} from '@podverse/v4v-metaboost';

import { mobileBoostPostNotice } from './mobileBoostPostNotice';

describe('mobileBoostPostNotice', () => {
  it('treats a capability preflight error as already shown', () => {
    expect(mobileBoostPostNotice(new MetaboostCapabilityPreflightError())).toEqual({
      kind: 'capability_already_shown',
    });
  });

  it('keeps a sender-blocked detail and drops a blank one', () => {
    expect(mobileBoostPostNotice(new MetaboostSenderBlockedPostError('  slow down  '))).toEqual({
      kind: 'sender_blocked',
      detail: 'slow down',
    });
    expect(mobileBoostPostNotice(new MetaboostSenderBlockedPostError('   '))).toEqual({
      kind: 'sender_blocked',
      detail: null,
    });
  });

  it('keeps an owner-terms detail and drops a blank one', () => {
    expect(
      mobileBoostPostNotice(new MetaboostOwnerTermsNotAcceptedPostError('  accept  '))
    ).toEqual({
      kind: 'owner_terms',
      detail: 'accept',
    });
    expect(mobileBoostPostNotice(new MetaboostOwnerTermsNotAcceptedPostError(''))).toEqual({
      kind: 'owner_terms',
      detail: null,
    });
  });

  it('uses a response message before an owner-terms code', () => {
    expect(mobileBoostPostNotice({ response: { data: { message: 'nope' } } })).toEqual({
      kind: 'post_failed',
      detail: 'nope',
    });
    expect(
      mobileBoostPostNotice({
        response: {
          data: { code: 'owner_terms_not_accepted_current', message: 'nope' },
        },
      })
    ).toEqual({ kind: 'post_failed', detail: 'nope' });
  });

  it('maps an owner-terms code with no message', () => {
    expect(
      mobileBoostPostNotice({
        response: { data: { code: 'owner_terms_not_accepted_current' } },
      })
    ).toEqual({ kind: 'owner_terms', detail: null });
  });

  it('uses a generic post failure otherwise', () => {
    expect(mobileBoostPostNotice(new Error('no response'))).toEqual({
      kind: 'post_failed',
      detail: null,
    });
  });
});
