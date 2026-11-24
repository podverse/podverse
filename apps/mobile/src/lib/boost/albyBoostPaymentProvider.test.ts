import { beforeEach, describe, expect, it, vi } from 'vitest';

const { payAlbyInvoice, sendAlbyKeysends } = vi.hoisted(() => {
  return {
    payAlbyInvoice: vi.fn(),
    sendAlbyKeysends: vi.fn(),
  };
});

vi.mock('../../v4v/alby', () => {
  return {
    payAlbyInvoice,
    sendAlbyKeysends,
  };
});

import { createAlbyBoostPaymentProvider } from './albyBoostPaymentProvider';

const payment = { amountSats: 21, destination: '02abcdef' };

const expectErrorMessage = async (run: () => Promise<void>, message: string): Promise<void> => {
  try {
    await run();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(Error);
    if (!(error instanceof Error)) {
      throw new Error('expected Error', { cause: error });
    }
    expect(error.message).toBe(message);
    return;
  }
  throw new Error('expected rejection');
};

describe('createAlbyBoostPaymentProvider', () => {
  beforeEach(() => {
    payAlbyInvoice.mockReset();
    sendAlbyKeysends.mockReset();
  });

  it('pays an invoice without sending a keysend', async () => {
    const provider = createAlbyBoostPaymentProvider();
    await provider.payInvoice('lnbc1test');
    expect(payAlbyInvoice).toHaveBeenCalledTimes(1);
    expect(payAlbyInvoice).toHaveBeenCalledWith('lnbc1test');
    expect(sendAlbyKeysends).not.toHaveBeenCalled();
  });

  it('sends one keysend and fills an empty custom-record map', async () => {
    sendAlbyKeysends.mockResolvedValue([{ errorMessage: null }]);
    const provider = createAlbyBoostPaymentProvider();
    await provider.keysend(payment);
    expect(sendAlbyKeysends).toHaveBeenCalledTimes(1);
    expect(sendAlbyKeysends).toHaveBeenCalledWith([
      {
        amountSats: 21,
        destination: '02abcdef',
        customRecords: {},
      },
    ]);
    expect(payAlbyInvoice).not.toHaveBeenCalled();
  });

  it('forwards custom records when the payment includes them', async () => {
    sendAlbyKeysends.mockResolvedValue([{ errorMessage: null }]);
    const provider = createAlbyBoostPaymentProvider();
    await provider.keysend({
      ...payment,
      customRecords: { '7629169': 'boost' },
    });
    expect(sendAlbyKeysends).toHaveBeenCalledWith([
      {
        amountSats: 21,
        destination: '02abcdef',
        customRecords: { '7629169': 'boost' },
      },
    ]);
  });

  it('resolves when the keysend result has no error message', async () => {
    sendAlbyKeysends.mockResolvedValue([{ errorMessage: null }]);
    const provider = createAlbyBoostPaymentProvider();
    await expect(provider.keysend(payment)).resolves.toBeUndefined();
  });

  it('rejects with the recipient error message', async () => {
    sendAlbyKeysends.mockResolvedValue([{ errorMessage: 'invoice expired' }]);
    const provider = createAlbyBoostPaymentProvider();
    await expectErrorMessage(() => provider.keysend(payment), 'invoice expired');
  });

  it('rejects an empty keysend result as no result', async () => {
    sendAlbyKeysends.mockResolvedValue([]);
    const provider = createAlbyBoostPaymentProvider();
    await expectErrorMessage(() => provider.keysend(payment), 'Alby keysend returned no result.');
  });

  it('rejects an unreadable keysend element as no result', async () => {
    sendAlbyKeysends.mockResolvedValue([{ errorMessage: 'unexpected_result' }]);
    const provider = createAlbyBoostPaymentProvider();
    await expectErrorMessage(() => provider.keysend(payment), 'Alby keysend returned no result.');
  });

  it('propagates an error thrown by the keysend call', async () => {
    const failure = new Error('socket hang up');
    sendAlbyKeysends.mockRejectedValue(failure);
    const provider = createAlbyBoostPaymentProvider();
    await expect(provider.keysend(payment)).rejects.toBe(failure);
  });
});
