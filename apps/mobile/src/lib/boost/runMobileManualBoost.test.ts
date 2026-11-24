import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendManualBoost } = vi.hoisted(() => {
  return { sendManualBoost: vi.fn() };
});

vi.mock('@podverse/v4v-btc-ln', () => {
  return { sendManualBoost };
});

import type { BoostPaymentProvider } from '@podverse/v4v-btc-ln';
import type { MetaBoost } from '@podverse/v4v-metaboost';

import type { RunMobileManualBoostDeps, RunMobileManualBoostInput } from './runMobileManualBoost';
import { runMobileManualBoost } from './runMobileManualBoost';

const paid = {
  anyRecipientFailed: false,
  largestSplitRecipientId: 'a',
  largestSplitSucceeded: true,
  totalMsat: 1000,
};

const mbrss: MetaBoost = {
  node: 'https://metaboost.example/v1/standard/mbrss-v1/boost/x/',
  standard: 'mbrss-v1',
};

const mbV1: MetaBoost = {
  node: 'https://metaboost.example/v1/standard/mb-v1/boost/x/',
  standard: 'mb-v1',
};

const provider: BoostPaymentProvider = {
  payInvoice: () => Promise.resolve(),
  keysend: () => Promise.resolve(),
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const readSendParams = (): Record<string, unknown> => {
  expect(sendManualBoost).toHaveBeenCalledTimes(1);
  const params: unknown = sendManualBoost.mock.calls[0]?.[0];
  if (!isRecord(params)) {
    throw new Error('sendManualBoost was not called with an object');
  }
  return params;
};

const buildDeps = (): {
  deps: RunMobileManualBoostDeps;
  postBoost: ReturnType<typeof vi.fn>;
  rateLimitStatus: ReturnType<typeof vi.fn>;
} => {
  const rateLimitStatus = vi.fn(async () => {
    return { allowed: true, retryAfterMs: 0 };
  });
  const postBoost = vi.fn(async () => {
    return undefined;
  });
  return {
    deps: { postBoost, provider, rateLimitStatus },
    postBoost,
    rateLimitStatus,
  };
};

const buildInput = (
  overrides: Partial<RunMobileManualBoostInput> = {}
): RunMobileManualBoostInput => {
  return {
    appName: 'Podverse Next',
    appVersion: null,
    feedGuid: null,
    feedTitle: null,
    httpMessagingEnabled: false,
    itemGuid: null,
    itemTitle: null,
    message: 'hello',
    metaBoost: null,
    onMetaboostUnreachable: () => Promise.resolve(),
    onRecipientEvent: () => {
      return undefined;
    },
    recipients: [],
    senderGuid: null,
    senderName: 'Ada',
    ...overrides,
  };
};

describe('runMobileManualBoost', () => {
  beforeEach(() => {
    sendManualBoost.mockReset();
    sendManualBoost.mockResolvedValue(paid);
  });

  it('sends a plain keysend without a rate check or a post', async () => {
    const { deps, postBoost, rateLimitStatus } = buildDeps();
    const onRecipientEvent = vi.fn();
    const recipients = buildInput().recipients;
    const result = await runMobileManualBoost(
      deps,
      buildInput({
        appVersion: '  ',
        feedGuid: '  feed-guid  ',
        feedTitle: '   ',
        itemGuid: null,
        itemTitle: '  Episode  ',
        message: 'hello',
        onRecipientEvent,
        recipients,
        senderName: 'Ada',
      })
    );

    const params = readSendParams();
    expect(params.message).toBe('hello');
    expect(params.senderName).toBe('Ada');
    expect(params.paymentDescription).toBeNull();
    expect(params.allowBlipFallback).toBe(true);
    expect(params.appName).toBe('Podverse Next');
    expect(params.feedGuid).toBe('feed-guid');
    expect(params.feedTitle).toBeUndefined();
    expect(params.itemGuid).toBeUndefined();
    expect(params.itemTitle).toBe('Episode');
    expect(params.onRecipientEvent).toBe(onRecipientEvent);
    expect(params.recipients).toBe(recipients);
    expect(rateLimitStatus).not.toHaveBeenCalled();
    expect(postBoost).not.toHaveBeenCalled();
    expect(result).toEqual({ anyRecipientFailed: false, outcome: 'sent', postError: null });
  });

  it('forwards an empty message and name without substituting Anonymous', async () => {
    const { deps, postBoost, rateLimitStatus } = buildDeps();
    await runMobileManualBoost(deps, buildInput({ message: '', senderName: '' }));
    const params = readSendParams();
    expect(params.message).toBe('');
    expect(params.senderName).toBe('');
    expect(params.paymentDescription).toBeNull();
    expect(params.allowBlipFallback).toBe(true);
    expect(JSON.stringify(params)).not.toContain('Anonymous');
    expect(rateLimitStatus).not.toHaveBeenCalled();
    expect(postBoost).not.toHaveBeenCalled();
  });

  it('returns the rate-limit wait without paying', async () => {
    const { deps, postBoost, rateLimitStatus } = buildDeps();
    rateLimitStatus.mockResolvedValue({ allowed: false, retryAfterMs: 3000 });
    const result = await runMobileManualBoost(
      deps,
      buildInput({
        httpMessagingEnabled: true,
        message: 'hello',
        metaBoost: mbrss,
        senderGuid: 'abc',
      })
    );
    expect(result).toEqual({ outcome: 'rate_limited', retryAfterMs: 3000 });
    expect(sendManualBoost).not.toHaveBeenCalled();
    expect(postBoost).not.toHaveBeenCalled();
  });

  it('does not pay when the rate-limit check throws', async () => {
    const { deps, postBoost, rateLimitStatus } = buildDeps();
    rateLimitStatus.mockRejectedValue(new Error('offline'));
    const result = await runMobileManualBoost(
      deps,
      buildInput({
        httpMessagingEnabled: true,
        metaBoost: mbrss,
        senderGuid: 'abc',
      })
    );
    expect(result).toEqual({ outcome: 'rate_limit_check_failed' });
    expect(sendManualBoost).not.toHaveBeenCalled();
    expect(postBoost).not.toHaveBeenCalled();
  });

  it('posts after a successful mbrss-v1 send and keeps the message off the keysend fallback', async () => {
    const { deps, postBoost } = buildDeps();
    const result = await runMobileManualBoost(
      deps,
      buildInput({
        httpMessagingEnabled: true,
        message: '  hello  ',
        metaBoost: mbrss,
        senderGuid: 'abc',
      })
    );
    const params = readSendParams();
    expect(params.allowBlipFallback).toBe(false);
    expect(params.paymentDescription).toBe('hello');
    expect(params.message).toBe('  hello  ');
    expect(postBoost).toHaveBeenCalledTimes(1);
    expect(postBoost).toHaveBeenCalledWith({ totalMsat: 1000 });
    expect(result).toEqual({ anyRecipientFailed: false, outcome: 'sent', postError: null });
  });

  it('skips the post when the largest split did not succeed', async () => {
    sendManualBoost.mockResolvedValue({
      anyRecipientFailed: true,
      largestSplitRecipientId: 'a',
      largestSplitSucceeded: false,
      totalMsat: 1000,
    });
    const { deps, postBoost } = buildDeps();
    const result = await runMobileManualBoost(
      deps,
      buildInput({
        httpMessagingEnabled: true,
        metaBoost: mbrss,
        senderGuid: 'abc',
      })
    );
    expect(postBoost).not.toHaveBeenCalled();
    expect(result).toEqual({ anyRecipientFailed: true, outcome: 'sent', postError: null });
  });

  it('keeps a post rejection on the sent result', async () => {
    const failure = new Error('ingest');
    const { deps, postBoost } = buildDeps();
    postBoost.mockRejectedValue(failure);
    const result = await runMobileManualBoost(
      deps,
      buildInput({
        httpMessagingEnabled: true,
        metaBoost: mbrss,
        senderGuid: 'abc',
      })
    );
    expect(result.outcome).toBe('sent');
    if (result.outcome !== 'sent') {
      throw new Error('expected sent');
    }
    expect(result.postError).toBe(failure);
    expect(result.anyRecipientFailed).toBe(false);
  });

  it('does not post an mb-v1 channel and still describes the keysend', async () => {
    const { deps, postBoost, rateLimitStatus } = buildDeps();
    await runMobileManualBoost(
      deps,
      buildInput({
        httpMessagingEnabled: true,
        message: '  thanks  ',
        metaBoost: mbV1,
        senderGuid: 'abc',
      })
    );
    const params = readSendParams();
    expect(params.allowBlipFallback).toBe(false);
    expect(params.paymentDescription).toBe('thanks');
    expect(rateLimitStatus).not.toHaveBeenCalled();
    expect(postBoost).not.toHaveBeenCalled();
  });

  it('skips the rate limit and the post when http messaging is off', async () => {
    const { deps, postBoost, rateLimitStatus } = buildDeps();
    await runMobileManualBoost(
      deps,
      buildInput({
        httpMessagingEnabled: false,
        message: 'hello',
        metaBoost: mbrss,
        senderGuid: 'abc',
      })
    );
    const params = readSendParams();
    expect(params.allowBlipFallback).toBe(false);
    expect(params.paymentDescription).toBe('hello');
    expect(rateLimitStatus).not.toHaveBeenCalled();
    expect(postBoost).not.toHaveBeenCalled();
  });

  it('skips the rate limit and the post when the sender guid is blank', async () => {
    const { deps, postBoost, rateLimitStatus } = buildDeps();
    await runMobileManualBoost(
      deps,
      buildInput({
        httpMessagingEnabled: true,
        message: 'hello',
        metaBoost: mbrss,
        senderGuid: '   ',
      })
    );
    const params = readSendParams();
    expect(params.allowBlipFallback).toBe(false);
    expect(params.paymentDescription).toBe('hello');
    expect(rateLimitStatus).not.toHaveBeenCalled();
    expect(postBoost).not.toHaveBeenCalled();
  });

  it('describes a blank mbrss message with the app name', async () => {
    const { deps, postBoost } = buildDeps();
    await runMobileManualBoost(
      deps,
      buildInput({
        httpMessagingEnabled: true,
        message: '   ',
        metaBoost: mbrss,
        senderGuid: 'abc',
      })
    );
    const params = readSendParams();
    expect(params.message).toBe('   ');
    expect(params.paymentDescription).toBe('Podverse Next boost');
    expect(params.allowBlipFallback).toBe(false);
    expect(postBoost).toHaveBeenCalledWith({ totalMsat: 1000 });
  });
});
