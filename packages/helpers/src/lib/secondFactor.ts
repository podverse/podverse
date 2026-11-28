export const SECOND_FACTOR_MODES = ['optional', 'required'] as const;
export type SecondFactorMode = (typeof SECOND_FACTOR_MODES)[number];

export const SECOND_FACTOR_LOGIN_STEPS = ['setup', 'code'] as const;
export type SecondFactorLoginStepName = (typeof SECOND_FACTOR_LOGIN_STEPS)[number];

/** What a correct password may return instead of a session. */
export type SecondFactorLoginStep =
  | { step: 'setup'; setupToken: string }
  | { step: 'code'; challengeToken: string };

export function isSecondFactorMode(value: unknown): value is SecondFactorMode {
  return value === 'optional' || value === 'required';
}

/**
 * A confirmed authenticator always asks for a code. Required mode sends an account that has
 * not confirmed one through setup. Optional mode leaves that account on today's password login.
 */
export function secondFactorLoginGate(
  mode: SecondFactorMode,
  enrolled: boolean
): 'session' | 'setup' | 'code' {
  if (enrolled) {
    return 'code';
  }
  if (mode === 'required') {
    return 'setup';
  }
  return 'session';
}

export function isSecondFactorLoginStep(value: unknown): value is SecondFactorLoginStep {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  if (!('step' in value)) {
    return false;
  }
  if (value.step === 'setup' && 'setupToken' in value && typeof value.setupToken === 'string') {
    return value.setupToken.length > 0;
  }
  if (
    value.step === 'code' &&
    'challengeToken' in value &&
    typeof value.challengeToken === 'string'
  ) {
    return value.challengeToken.length > 0;
  }
  return false;
}
