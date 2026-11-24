import { describe, expect, it } from 'vitest';

import type { MobileBoostValueBlock, MobileBoostValueRecipient } from './mobileBoostRecipients';
import {
  lightningRecipientsForBoost,
  manualBoostRecipientsFromLightning,
  parseBoostSatsAmount,
} from './mobileBoostRecipients';

const recipient = (
  address: string,
  type: string,
  split: number,
  extras?: Partial<Pick<MobileBoostValueRecipient, 'customKey' | 'customValue' | 'name'>>
): MobileBoostValueRecipient => {
  return {
    address,
    customKey: extras?.customKey ?? null,
    customValue: extras?.customValue ?? null,
    name: extras?.name ?? null,
    split,
    type,
  };
};

const block = (
  type: string,
  recipients: readonly MobileBoostValueRecipient[]
): MobileBoostValueBlock => {
  return { recipients, type };
};

describe('lightningRecipientsForBoost', () => {
  const channelValues = [
    block('lightning', [recipient('first@example.com', 'lnaddress', 60)]),
    block('paypal', [recipient('skip@example.com', 'paypal', 1)]),
    block('lightning', [recipient('02channel', 'node', 40)]),
  ];

  it('concatenates channel lightning blocks in order', () => {
    const recipients = lightningRecipientsForBoost({ channelValues, itemValues: null });
    expect(recipients.map((row) => row.address)).toEqual(['first@example.com', '02channel']);
  });

  it('uses item lightning recipients instead of the channel', () => {
    const itemValues = [
      block('lightning', [recipient('item@example.com', 'node', 100)]),
      block('paypal', [recipient('item-pay@example.com', 'paypal', 5)]),
    ];
    const recipients = lightningRecipientsForBoost({ channelValues, itemValues });
    expect(recipients.map((row) => row.address)).toEqual(['item@example.com']);
  });

  it('uses the channel when the item list is null, empty, or has no lightning block', () => {
    const paypalOnly = [block('paypal', [recipient('pay@example.com', 'paypal', 100)])];
    const channelAddresses = ['first@example.com', '02channel'];
    expect(
      lightningRecipientsForBoost({ channelValues, itemValues: null }).map((row) => row.address)
    ).toEqual(channelAddresses);
    expect(
      lightningRecipientsForBoost({ channelValues, itemValues: [] }).map((row) => row.address)
    ).toEqual(channelAddresses);
    expect(
      lightningRecipientsForBoost({ channelValues, itemValues: paypalOnly }).map(
        (row) => row.address
      )
    ).toEqual(channelAddresses);
  });

  it('does not include a method field on the recipient type', () => {
    type RecipientKey = keyof MobileBoostValueRecipient;
    const methodAbsent: 'method' extends RecipientKey ? never : true = true;
    expect(methodAbsent).toBe(true);
  });
});

describe('parseBoostSatsAmount', () => {
  it('accepts a positive whole number of sats', () => {
    expect(parseBoostSatsAmount('1')).toBe(1);
    expect(parseBoostSatsAmount('01')).toBe(1);
    expect(parseBoostSatsAmount('  12  ')).toBe(12);
    expect(parseBoostSatsAmount(String(Number.MAX_SAFE_INTEGER))).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('rejects text that is not a positive whole number', () => {
    expect(parseBoostSatsAmount('0')).toBeNull();
    expect(parseBoostSatsAmount('1.5')).toBeNull();
    expect(parseBoostSatsAmount('1e2')).toBeNull();
    expect(parseBoostSatsAmount('-1')).toBeNull();
    expect(parseBoostSatsAmount('')).toBeNull();
    expect(parseBoostSatsAmount('9007199254740992')).toBeNull();
  });
});

describe('manualBoostRecipientsFromLightning', () => {
  it('splits 100 sats across 60 and 40 and builds lightning ids', () => {
    const rows = manualBoostRecipientsFromLightning(
      [
        recipient('a@example.com', 'lnaddress', 60, { name: 'Ada' }),
        recipient('02ab', 'node', 40, { customKey: '696969', customValue: 'podverse' }),
      ],
      100
    );
    expect(rows).toEqual([
      {
        id: 'lightning-lnaddress-a@example.com-0',
        valueType: 'lightning',
        recipientType: 'lnaddress',
        address: 'a@example.com',
        name: 'Ada',
        customKey: null,
        customValue: null,
        normalizedSplit: 60,
        split: 60,
        finalAmountSats: 60,
      },
      {
        id: 'lightning-node-02ab-1',
        valueType: 'lightning',
        recipientType: 'node',
        address: '02ab',
        name: null,
        customKey: '696969',
        customValue: 'podverse',
        normalizedSplit: 40,
        split: 40,
        finalAmountSats: 40,
      },
    ]);
  });

  it('keeps a non-lightning type and a null recipient type', () => {
    const rows = manualBoostRecipientsFromLightning(
      [recipient('payer@example.com', 'paypal', 100, { name: 'Pat' })],
      50
    );
    expect(rows[0]).toMatchObject({
      valueType: 'paypal',
      recipientType: null,
      customKey: null,
      customValue: null,
      name: 'Pat',
    });
    expect(rows[0]?.id.startsWith('paypal-paypal-')).toBe(true);
    expect(rows[0]?.id).toBe('paypal-paypal-payer@example.com-0');
  });
});
