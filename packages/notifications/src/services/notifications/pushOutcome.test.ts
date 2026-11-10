import { describe, expect, it } from 'vitest';

import {
  classifyPushErrorCode,
  pushAttemptFromProviderRow,
  pushAttemptsFromFirebaseBatches,
  summarizePushAttempts,
} from './pushOutcome.js';

describe('classifyPushErrorCode', () => {
  it('splits dead tokens, transient provider errors, and payload or auth errors', () => {
    expect(classifyPushErrorCode('messaging/registration-token-not-registered')).toBe('dead_token');
    expect(classifyPushErrorCode('messaging/invalid-registration-token')).toBe('dead_token');
    expect(classifyPushErrorCode('http_404')).toBe('dead_token');
    expect(classifyPushErrorCode('http_410')).toBe('dead_token');
    expect(classifyPushErrorCode('messaging/unavailable')).toBe('transient');
    expect(classifyPushErrorCode('messaging/quota-exceeded')).toBe('transient');
    expect(classifyPushErrorCode('timeout')).toBe('transient');
    expect(classifyPushErrorCode('http_503')).toBe('transient');
    expect(classifyPushErrorCode('messaging/invalid-argument')).toBe('payload_or_auth');
    expect(classifyPushErrorCode('messaging/third-party-auth-error')).toBe('payload_or_auth');
    expect(classifyPushErrorCode('http_401')).toBe('payload_or_auth');
  });
});

describe('summarizePushAttempts', () => {
  it('maps each Firebase response to the token at the same index', () => {
    const attempts = pushAttemptsFromFirebaseBatches(
      ['token-a', 'token-b'],
      [
        {
          responses: [
            { success: true },
            {
              success: false,
              error: {
                code: 'messaging/registration-token-not-registered',
                message: 'token-b is not registered',
              },
            },
          ],
        },
      ]
    );
    const outcome = summarizePushAttempts('firebase', 'android', attempts);

    expect(outcome.accepted).toBe(1);
    expect(outcome.failed).toBe(1);
    expect(outcome.byCode).toEqual({ 'messaging/registration-token-not-registered': 1 });
    expect(outcome.deadTargets).toEqual(['token-b']);
    expect(outcome.sampleMessageByCode['messaging/registration-token-not-registered']).toBe(
      'redacted is not registered'
    );
  });

  it('counts a missing Firebase response as a failure', () => {
    const attempts = pushAttemptsFromFirebaseBatches(
      ['token-a', 'token-b'],
      [{ responses: [{ success: true }] }]
    );
    const outcome = summarizePushAttempts('firebase', 'ios', attempts);

    expect(outcome.accepted).toBe(1);
    expect(outcome.failed).toBe(1);
    expect(outcome.byCode).toEqual({ no_provider_response: 1 });
    expect(outcome.deadTargets).toEqual([]);
  });

  it('reads a web push status as an http code and keeps a dead endpoint', () => {
    const attempt = pushAttemptFromProviderRow({
      success: false,
      endpoint: 'https://push.example/gone',
      errorCode: 'http_410',
      errorMessage: 'Gone',
    });
    const outcome = summarizePushAttempts('webpush', null, [attempt]);

    expect(outcome.deadTargets).toEqual(['https://push.example/gone']);
    expect(classifyPushErrorCode('http_410')).toBe('dead_token');
  });
});
