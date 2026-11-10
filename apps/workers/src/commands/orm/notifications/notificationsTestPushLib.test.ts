import { describe, expect, it } from 'vitest';

import {
  formatDeviceLine,
  formatOutcomeLine,
  isNotificationsTestPushEnabled,
  isNotificationsTestPushHelpArgv,
  notificationsTestPushEnabledResult,
  outcomeFromPushOutcome,
  outcomeFromSendResult,
  parseNotificationsTestPushArgs,
  secretSuffix,
} from './notificationsTestPushLib.js';

describe('notificationsTestPushLib', () => {
  it('enables the command only for the string true', () => {
    expect(isNotificationsTestPushEnabled('true')).toBe(true);
    expect(isNotificationsTestPushEnabled('false')).toBe(false);
    expect(isNotificationsTestPushEnabled(undefined)).toBe(false);
    expect(notificationsTestPushEnabledResult(undefined).isValid).toBe(false);
    expect(notificationsTestPushEnabledResult('true').isValid).toBe(true);
  });

  it('treats --help and -h as help', () => {
    expect(isNotificationsTestPushHelpArgv(['node', 'index.js', '--help'])).toBe(true);
    expect(isNotificationsTestPushHelpArgv(['-h'])).toBe(true);
    expect(isNotificationsTestPushHelpArgv(['--username', 'ada'])).toBe(false);
  });

  it('parses list, send, and missing username', () => {
    expect(parseNotificationsTestPushArgs({ _: [], help: '' }).kind).toBe('help');
    expect(parseNotificationsTestPushArgs({ _: [], username: 'ada', list: '' })).toEqual({
      kind: 'list',
      account: { by: 'username', username: 'ada' },
      installationId: null,
    });
    expect(
      parseNotificationsTestPushArgs({
        _: [],
        email: 'ada@example.com',
        'installation-id': 'install-1',
      })
    ).toEqual({
      kind: 'send',
      account: { by: 'email', email: 'ada@example.com' },
      installationId: 'install-1',
    });
    expect(parseNotificationsTestPushArgs({ _: [] }).kind).toBe('invalid');
    expect(
      parseNotificationsTestPushArgs({ _: [], username: 'ada', email: 'ada@example.com' }).kind
    ).toBe('invalid');
    expect(parseNotificationsTestPushArgs({ _: [], email: 'not-an-email' }).kind).toBe('invalid');
  });

  it('keeps only a short suffix of a token', () => {
    expect(secretSuffix('abcdefghij')).toBe('efghij');
    expect(secretSuffix('short')).toBe('redacted');
  });

  it('reads a Firebase batch failure without the token', () => {
    const outcome = outcomeFromSendResult('firebase', [
      {
        responses: [
          {
            success: false,
            error: {
              code: 'messaging/registration-token-not-registered',
              message: 'token is not registered',
            },
          },
        ],
      },
    ]);
    expect(outcome).toEqual({
      success: false,
      errorCode: 'messaging/registration-token-not-registered',
      errorMessage: 'token is not registered',
    });
    expect(formatOutcomeLine(outcome)).toBe(
      'failed code=messaging/registration-token-not-registered message=token is not registered'
    );
  });

  it('reads a summarized push outcome without the token', () => {
    const outcome = outcomeFromPushOutcome({
      service: 'firebase',
      platform: 'android',
      accepted: 0,
      failed: 1,
      byCode: { 'messaging/registration-token-not-registered': 1 },
      sampleMessageByCode: {
        'messaging/registration-token-not-registered': 'not registered',
      },
      deadTargets: ['secret-token'],
    });
    expect(outcome).toEqual({
      success: false,
      errorCode: 'messaging/registration-token-not-registered',
      errorMessage: 'not registered',
    });
    expect(formatOutcomeLine(outcome)).not.toContain('secret-token');
  });

  it('reads a web push success', () => {
    const outcome = outcomeFromSendResult('webpush', [
      { success: true, endpoint: 'https://push.example' },
    ]);
    expect(outcome).toEqual({
      success: true,
      errorCode: null,
      errorMessage: null,
    });
  });

  it('formats a device line with a suffix', () => {
    expect(
      formatDeviceLine({
        service: 'firebase',
        platform: 'ios',
        installationId: 'install-1',
        secretSuffix: 'efghij',
        locale: 'en-US',
      })
    ).toBe('firebase platform=ios installation_id=install-1 suffix=efghij locale=en-US');
  });
});
