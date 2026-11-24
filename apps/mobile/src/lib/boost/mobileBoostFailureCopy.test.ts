import { describe, expect, it, vi } from 'vitest';

vi.mock('../../v4v/alby', () => {
  class AlbyProviderError extends Error {
    readonly kind: string;

    constructor(kind: string, message?: string) {
      super(message ?? kind);
      this.name = 'AlbyProviderError';
      this.kind = kind;
    }
  }

  return { AlbyProviderError };
});

import { AlbyProviderError } from '../../v4v/alby';
import { mobileBoostFailureCopy } from './mobileBoostFailureCopy';

const albyError = (kind: AlbyProviderError['kind'], message?: string): AlbyProviderError => {
  const error = new AlbyProviderError(kind, null);
  if (message !== undefined) {
    error.message = message;
  }
  return error;
};

describe('mobileBoostFailureCopy', () => {
  it('maps an ended or missing Alby session', () => {
    expect(mobileBoostFailureCopy(albyError('session_ended'))).toEqual({ kind: 'session_ended' });
    expect(mobileBoostFailureCopy(albyError('not_connected'))).toEqual({ kind: 'session_ended' });
  });

  it('maps a missing Alby client id', () => {
    expect(mobileBoostFailureCopy(albyError('not_configured'))).toEqual({ kind: 'not_configured' });
  });

  it('shows a rejected Alby message and hides a blank one', () => {
    expect(mobileBoostFailureCopy(albyError('rejected', '  invoice expired  '))).toEqual({
      kind: 'provider_message',
      message: 'invoice expired',
    });
    expect(mobileBoostFailureCopy(albyError('rejected', '   '))).toEqual({ kind: 'failed' });
  });

  it('hides a transport failure and an unreadable keysend', () => {
    expect(mobileBoostFailureCopy(albyError('transport'))).toEqual({ kind: 'failed' });
    expect(mobileBoostFailureCopy(new Error('Alby keysend returned no result.'))).toEqual({
      kind: 'failed',
    });
  });

  it('maps a canceled invoice request', () => {
    const canceled = new Error('timeout');
    Object.defineProperty(canceled, 'code', { value: 'ERR_CANCELED' });
    expect(mobileBoostFailureCopy(canceled)).toEqual({ kind: 'invoice_timeout' });
    expect(mobileBoostFailureCopy(new Error('canceled'))).toEqual({ kind: 'invoice_timeout' });
    expect(mobileBoostFailureCopy(new Error('Request aborted'))).toEqual({
      kind: 'invoice_timeout',
    });
  });

  it('shows another error message', () => {
    expect(mobileBoostFailureCopy(new Error('invoice expired'))).toEqual({
      kind: 'provider_message',
      message: 'invoice expired',
    });
    expect(mobileBoostFailureCopy(new Error('  route not found  '))).toEqual({
      kind: 'provider_message',
      message: 'route not found',
    });
  });

  it('uses the generic failure when there is no message', () => {
    expect(mobileBoostFailureCopy(new Error('   '))).toEqual({ kind: 'failed' });
    expect(mobileBoostFailureCopy(null)).toEqual({ kind: 'failed' });
    expect(mobileBoostFailureCopy({ code: 'ERR_UNKNOWN' })).toEqual({ kind: 'failed' });
  });
});
