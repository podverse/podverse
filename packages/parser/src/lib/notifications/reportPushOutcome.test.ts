import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PushOutcome } from '@podverse/notifications';

const { deleteByTokens, errorLog, infoLog, warnLog } = vi.hoisted(() => ({
  deleteByTokens: vi.fn(),
  errorLog: vi.fn(),
  infoLog: vi.fn(),
  warnLog: vi.fn(),
}));

vi.mock('@parser/factories/loggerService.js', () => ({
  loggerService: {
    error: errorLog,
    info: infoLog,
    logError: vi.fn(),
    warn: warnLog,
  },
}));

vi.mock('@podverse/extension-metrics-sdk', () => ({
  recordPushSend: vi.fn(),
}));

vi.mock('@podverse/orm', () => ({
  AccountFCMDeviceService: class {
    deleteByTokens = deleteByTokens;
  },
  AccountUPDeviceService: class {
    deleteByEndpoints = vi.fn();
  },
  AccountWebPushDeviceService: class {
    deleteByEndpoints = vi.fn();
  },
}));

import { describePushImage, pushSendLogLevel, reportPushOutcome } from './reportPushOutcome.js';

function outcome(
  partial: Partial<PushOutcome> & Pick<PushOutcome, 'byCode' | 'failed'>
): PushOutcome {
  return {
    service: 'firebase',
    platform: 'android',
    accepted: 0,
    sampleMessageByCode: {},
    deadTargets: [],
    ...partial,
  };
}

describe('describePushImage', () => {
  it('names a shrunk webp, an original jpg, and a missing url', () => {
    expect(
      describePushImage(
        'https://assets.example/images/item/715720/a8af09056dda4e73-w400-c8a90d37e231.webp'
      )
    ).toBe('shrunk-webp');
    expect(describePushImage('https://cdn.example/art.JPG?width=3000')).toBe('original-jpg');
    expect(describePushImage(null)).toBe('none');
    expect(describePushImage('')).toBe('none');
  });
});

describe('pushSendLogLevel', () => {
  it('uses info, warn, and error from the failure class', () => {
    expect(pushSendLogLevel(outcome({ failed: 0, accepted: 2, byCode: {} }))).toBe('info');
    expect(
      pushSendLogLevel(
        outcome({
          failed: 1,
          byCode: { 'messaging/registration-token-not-registered': 1 },
        })
      )
    ).toBe('warn');
    expect(
      pushSendLogLevel(
        outcome({
          failed: 2,
          byCode: { 'messaging/unavailable': 1, 'messaging/invalid-argument': 1 },
        })
      )
    ).toBe('error');
  });
});

describe('reportPushOutcome', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteByTokens.mockResolvedValue(1);
  });

  it('warns and deletes a dead token without logging the token', async () => {
    await reportPushOutcome({
      outcome: outcome({
        failed: 1,
        byCode: { 'messaging/registration-token-not-registered': 1 },
        deadTargets: ['secret-token'],
      }),
      locale: 'en-US',
      itemIdText: 'item-1',
      channelIdText: 'channel-1',
      messageType: 'new-episode',
      imageUrl: 'https://assets.example/images/item/1/hash-w400-cabc.webp',
    });

    expect(warnLog).toHaveBeenCalledWith(
      'Push send result',
      expect.objectContaining({
        image: 'shrunk-webp',
        failed: 1,
      })
    );
    expect(errorLog).not.toHaveBeenCalled();
    expect(deleteByTokens).toHaveBeenCalledWith(['secret-token']);
    expect(JSON.stringify(warnLog.mock.calls)).not.toContain('secret-token');
  });

  it('logs an invalid argument at error and keeps the device row', async () => {
    await reportPushOutcome({
      outcome: outcome({
        failed: 1,
        byCode: { 'messaging/invalid-argument': 1 },
        sampleMessageByCode: { 'messaging/invalid-argument': 'invalid image' },
      }),
      locale: 'en-US',
      itemIdText: 'item-1',
      channelIdText: 'channel-1',
      messageType: 'new-episode',
      imageUrl: null,
    });

    expect(errorLog).toHaveBeenCalledWith(
      'Push send result',
      expect.objectContaining({
        image: 'none',
        sampleMessageByCode: { 'messaging/invalid-argument': 'invalid image' },
      })
    );
    expect(deleteByTokens).not.toHaveBeenCalled();
  });
});
