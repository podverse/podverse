import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BoostKeysendPayment, BoostPaymentProvider } from './boostPaymentProvider.js';
import type {
  ManualBoostRecipientEvent,
  ManualBoostRecipientInput,
  SendManualBoostParams,
} from './sendManualBoost.js';
import { boostRecipientPaymentMethod, sendManualBoost } from './sendManualBoost.js';

const { request } = vi.hoisted(() => {
  const request = vi.fn(async (url: string) => {
    if (url.includes('/.well-known/lnurlp/')) {
      return {
        status: 200,
        data: {
          callback: 'https://ln.example/callback',
          maxSendable: 100000000000,
          minSendable: 1000,
          metadata: '[]',
          tag: 'payRequest',
          commentAllowed: 200,
        },
      };
    }
    return { status: 200, data: { pr: 'lnbc1test', routes: [] } };
  });
  return { request };
});

vi.mock('@podverse/helpers-requests', async () => ({
  ...(await vi.importActual('@podverse/helpers-requests')),
  request,
}));

const recipient = (
  overrides: Partial<ManualBoostRecipientInput> & { id: string }
): ManualBoostRecipientInput => ({
  valueType: 'lightning',
  recipientType: 'node',
  address: '03pubkey',
  name: null,
  customKey: null,
  customValue: null,
  normalizedSplit: 100,
  split: 100,
  finalAmountSats: 1,
  ...overrides,
});

const createProvider = () => {
  const payInvoice = vi.fn(async (_invoice: string) => undefined);
  const keysend = vi.fn(async (_payment: BoostKeysendPayment) => undefined);
  const provider: BoostPaymentProvider = { payInvoice, keysend };
  return { provider, payInvoice, keysend };
};

const send = async (
  recipients: ManualBoostRecipientInput[],
  overrides: Partial<
    Omit<SendManualBoostParams, 'provider' | 'recipients' | 'onRecipientEvent'>
  > = {},
  providerParts = createProvider()
) => {
  const events: ManualBoostRecipientEvent[] = [];
  const result = await sendManualBoost({
    provider: providerParts.provider,
    recipients,
    paymentDescription: null,
    message: '',
    senderName: '',
    allowBlipFallback: false,
    appName: 'Podverse',
    ...overrides,
    onRecipientEvent: (event) => {
      events.push(event);
    },
  });
  return { result, events, ...providerParts };
};

const blipRecord = (keysend: ReturnType<typeof createProvider>['keysend']): string => {
  const payload = keysend.mock.calls[0]?.[0].customRecords?.['7629169'];
  if (typeof payload !== 'string') {
    throw new Error('expected bLIP record');
  }
  return payload;
};

describe('boostRecipientPaymentMethod', () => {
  it('maps lightning lnaddress and node, and leaves every other pair unpaid', () => {
    expect(boostRecipientPaymentMethod('lightning', 'lnaddress')).toBe('lnaddress_invoice');
    expect(boostRecipientPaymentMethod('lightning', 'node')).toBe('node_keysend');
    expect(boostRecipientPaymentMethod('lightning', 'paypal')).toBeNull();
    expect(boostRecipientPaymentMethod('lightning', null)).toBeNull();
    expect(boostRecipientPaymentMethod('paypal', 'node')).toBeNull();
  });
});

describe('sendManualBoost', () => {
  beforeEach(() => {
    request.mockClear();
  });

  it('pays an lnaddress recipient with the invoice and does not keysend', async () => {
    const { payInvoice, keysend } = await send([
      recipient({
        id: 'ln',
        recipientType: 'lnaddress',
        address: 'ada@ln.example',
      }),
    ]);

    expect(payInvoice).toHaveBeenCalledWith('lnbc1test');
    expect(keysend).not.toHaveBeenCalled();
  });

  it('keysends a node recipient to that address and does not request an invoice', async () => {
    const { payInvoice, keysend } = await send([
      recipient({ id: 'node', recipientType: 'node', address: '03node' }),
    ]);

    expect(keysend).toHaveBeenCalledWith({
      destination: '03node',
      amountSats: 1,
      customRecords: undefined,
    });
    expect(payInvoice).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('sends the larger node split before the smaller lnaddress and records that node as largest', async () => {
    const providerParts = createProvider();
    const order: string[] = [];
    providerParts.payInvoice.mockImplementation(async () => {
      order.push('invoice');
    });
    providerParts.keysend.mockImplementation(async () => {
      order.push('keysend');
    });

    const { result } = await send(
      [
        recipient({
          id: 'ln',
          recipientType: 'lnaddress',
          address: 'ada@ln.example',
          normalizedSplit: 40,
          split: 40,
        }),
        recipient({
          id: 'node',
          recipientType: 'node',
          address: '03node',
          normalizedSplit: 60,
          split: 60,
        }),
      ],
      {},
      providerParts
    );

    expect(order).toEqual(['keysend', 'invoice']);
    expect(result.largestSplitRecipientId).toBe('node');
    expect(result.largestSplitSucceeded).toBe(true);
    expect(result.anyRecipientFailed).toBe(false);
  });

  it('keeps the earlier input row when two splits are equal', async () => {
    const { result } = await send([
      recipient({ id: 'earlier', normalizedSplit: 50, split: 50, address: '03a' }),
      recipient({ id: 'later', normalizedSplit: 50, split: 50, address: '03b' }),
    ]);

    expect(result.largestSplitRecipientId).toBe('earlier');
  });

  it('still pays the smaller lnaddress when the largest keysend rejects', async () => {
    const providerParts = createProvider();
    providerParts.keysend.mockRejectedValueOnce(new Error('no route'));

    const { result, events, payInvoice } = await send(
      [
        recipient({
          id: 'ln',
          recipientType: 'lnaddress',
          address: 'ada@ln.example',
          normalizedSplit: 40,
          split: 40,
        }),
        recipient({
          id: 'node',
          recipientType: 'node',
          address: '03node',
          normalizedSplit: 60,
          split: 60,
        }),
      ],
      {},
      providerParts
    );

    expect(payInvoice).toHaveBeenCalledWith('lnbc1test');
    expect(result.largestSplitSucceeded).toBe(false);
    expect(result.anyRecipientFailed).toBe(true);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'failed', id: 'node' }),
        expect.objectContaining({ type: 'success', id: 'ln' }),
      ])
    );
  });

  it('skips a zero amount with no event and does not treat it as the largest row', async () => {
    const { result, events, payInvoice, keysend } = await send([
      recipient({
        id: 'zero',
        recipientType: 'lnaddress',
        address: 'zero@ln.example',
        normalizedSplit: 90,
        split: 90,
        finalAmountSats: 0,
      }),
      recipient({
        id: 'paid',
        recipientType: 'node',
        address: '03paid',
        normalizedSplit: 10,
        split: 10,
        finalAmountSats: 1,
      }),
    ]);

    expect(events.some((event) => event.id === 'zero')).toBe(false);
    expect(result.largestSplitRecipientId).toBe('paid');
    expect(keysend).toHaveBeenCalledTimes(1);
    expect(payInvoice).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });

  it('marks an unsupported value type failed and does not call the provider', async () => {
    const { events, payInvoice, keysend, result } = await send([
      recipient({ id: 'pay', valueType: 'paypal', recipientType: 'node' }),
    ]);

    expect(events).toHaveLength(1);
    const failedEvent = events[0];
    if (failedEvent === undefined || failedEvent.type !== 'failed') {
      throw new Error('expected failed event');
    }
    expect(failedEvent.id).toBe('pay');
    expect(failedEvent.error).toBeInstanceOf(Error);
    if (!(failedEvent.error instanceof Error)) {
      throw new Error('expected Error');
    }
    expect(failedEvent.error.message).toBe('Unsupported recipient type.');
    expect(payInvoice).not.toHaveBeenCalled();
    expect(keysend).not.toHaveBeenCalled();
    expect(result.anyRecipientFailed).toBe(true);
  });

  it('puts the typed message and sender name on a node bLIP record when there is no payment description', async () => {
    const { keysend } = await send(
      [recipient({ id: 'node', recipientType: 'node', address: '03node' })],
      {
        allowBlipFallback: true,
        paymentDescription: null,
        message: 'hello',
        senderName: 'Ada',
      }
    );

    const payload = blipRecord(keysend);
    expect(payload).toContain('"action":"boost"');
    expect(payload).toContain('"message":"hello"');
    expect(payload).toContain('"sender_name":"Ada"');
  });

  it('omits an empty message and sender name from the node bLIP record', async () => {
    const { keysend } = await send(
      [recipient({ id: 'node', recipientType: 'node', address: '03node' })],
      {
        allowBlipFallback: true,
        paymentDescription: null,
        message: '',
        senderName: '',
      }
    );

    const payload = blipRecord(keysend);
    expect(payload).toContain('"action":"boost"');
    expect(payload).not.toContain('message');
    expect(payload).not.toContain('sender_name');
    expect(payload).not.toContain('Anonymous');
  });

  it('uses the payment description and sender name on the node bLIP record', async () => {
    const { keysend } = await send(
      [recipient({ id: 'node', recipientType: 'node', address: '03node' })],
      {
        allowBlipFallback: false,
        paymentDescription: 'from-meta',
        message: 'listener typed',
        senderName: 'Ada',
      }
    );

    const payload = blipRecord(keysend);
    expect(payload).toContain('"message":"from-meta"');
    expect(payload).toContain('"sender_name":"Ada"');
  });

  it('pays an lnaddress invoice with no comment and no keysend when the description is null', async () => {
    const { payInvoice, keysend } = await send(
      [
        recipient({
          id: 'ln',
          recipientType: 'lnaddress',
          address: 'ada@ln.example',
        }),
      ],
      {
        allowBlipFallback: true,
        paymentDescription: null,
        message: 'hello',
        senderName: 'Ada',
      }
    );

    expect(payInvoice).toHaveBeenCalledWith('lnbc1test');
    expect(keysend).not.toHaveBeenCalled();
    const urls = request.mock.calls.map((call) => String(call[0]));
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.every((url) => !url.includes('comment='))).toBe(true);
  });
});
