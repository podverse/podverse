import { describe, expect, it } from 'vitest';

import {
  isSecondFactorLoginStep,
  isSecondFactorMode,
  secondFactorLoginGate,
} from './secondFactor.js';

describe('secondFactorLoginGate', () => {
  it('keeps an optional account that has not enrolled on a password session', () => {
    expect(secondFactorLoginGate('optional', false)).toBe('session');
  });

  it('asks for a code when the authenticator is confirmed', () => {
    expect(secondFactorLoginGate('optional', true)).toBe('code');
    expect(secondFactorLoginGate('required', true)).toBe('code');
  });

  it('sends an unenrolled account through setup when the mode is required', () => {
    expect(secondFactorLoginGate('required', false)).toBe('setup');
  });
});

describe('isSecondFactorLoginStep', () => {
  it('accepts a setup token and a login challenge', () => {
    expect(isSecondFactorLoginStep({ step: 'setup', setupToken: 'abc' })).toBe(true);
    expect(isSecondFactorLoginStep({ step: 'code', challengeToken: 'abc' })).toBe(true);
  });

  it('rejects an empty token and a session payload', () => {
    expect(isSecondFactorLoginStep({ step: 'setup', setupToken: '' })).toBe(false);
    expect(isSecondFactorLoginStep({ message: 'Authenticated successfully' })).toBe(false);
    expect(isSecondFactorMode('optional')).toBe(true);
    expect(isSecondFactorMode('sometimes')).toBe(false);
  });
});
