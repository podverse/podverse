import { getErrorCode } from '@podverse/helpers/error';

import { AlbyProviderError } from '../../v4v/alby';

export type MobileBoostFailureCopy =
  | { kind: 'failed' }
  | { kind: 'invoice_timeout' }
  | { kind: 'not_configured' }
  | { kind: 'provider_message'; message: string }
  | { kind: 'session_ended' };

const trimmedMessage = (error: Error): string => {
  return error.message.trim();
};

export function mobileBoostFailureCopy(error: unknown): MobileBoostFailureCopy {
  if (error instanceof AlbyProviderError) {
    switch (error.kind) {
      case 'session_ended':
      case 'not_connected':
        return { kind: 'session_ended' };
      case 'not_configured':
        return { kind: 'not_configured' };
      case 'rejected': {
        const message = trimmedMessage(error);
        if (message === '') {
          return { kind: 'failed' };
        }
        return { kind: 'provider_message', message };
      }
      case 'transport':
        return { kind: 'failed' };
    }
  }

  if (error instanceof Error && error.message === 'Alby keysend returned no result.') {
    return { kind: 'failed' };
  }

  if (
    getErrorCode(error) === 'ERR_CANCELED' ||
    (error instanceof Error &&
      (error.message === 'canceled' || error.message === 'Request aborted'))
  ) {
    return { kind: 'invoice_timeout' };
  }

  if (error instanceof Error) {
    const message = trimmedMessage(error);
    if (message !== '') {
      return { kind: 'provider_message', message };
    }
  }

  return { kind: 'failed' };
}
