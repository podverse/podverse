import { loggerService } from '@api/factories/loggerService.js';

import type { SecondFactorLoginStep } from '@podverse/helpers';
import { continueAfterPassword } from '@podverse/helpers-backend';

import { mainSecondFactorDeps } from './secondFactorRuntime.js';

export class SecondFactorUnavailableError extends Error {
  constructor() {
    super('Second factor is unavailable');
    this.name = 'SecondFactorUnavailableError';
  }
}

/** Null means the password may start a session. Otherwise the client still has a step to finish. */
export async function gatePasswordLogin(input: {
  ownerId: number;
  client: 'web' | 'mobile';
  deviceLabel: string | null;
}): Promise<SecondFactorLoginStep | null> {
  try {
    const result = await continueAfterPassword(mainSecondFactorDeps(), input);
    if (result.kind === 'session') {
      return null;
    }
    if (result.kind === 'setup') {
      return { step: 'setup', setupToken: result.setupToken };
    }
    return { step: 'code', challengeToken: result.challengeToken };
  } catch (error) {
    if (error instanceof SecondFactorUnavailableError) {
      throw error;
    }
    loggerService.logError('Second factor challenge could not be stored', error);
    throw new SecondFactorUnavailableError();
  }
}
