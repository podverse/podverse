import { describe, expect, it } from 'vitest';

import { boostFieldsForPayment, showBoostNameAndMessageFields } from './boostFormRules.js';

describe('boostFieldsForPayment', () => {
  it('drops the name and message when the visitor is signed out', () => {
    expect(boostFieldsForPayment(false, 'Ada', 'hi')).toEqual({ yourName: '', message: '' });
  });

  it('keeps the name and message when the visitor is signed in', () => {
    expect(boostFieldsForPayment(true, 'Ada', 'hi')).toEqual({ yourName: 'Ada', message: 'hi' });
  });

  it('keeps blank name and message when the visitor is signed in', () => {
    expect(boostFieldsForPayment(true, '', '')).toEqual({ yourName: '', message: '' });
  });

  it('does not trim or replace a blank with Anonymous or a display name', () => {
    expect(boostFieldsForPayment(true, '  Ada  ', '  ')).toEqual({
      yourName: '  Ada  ',
      message: '  ',
    });
  });
});

describe('showBoostNameAndMessageFields', () => {
  it.each([
    { hasMetaBoost: false, hasNodeRecipient: true, hasLnaddressRecipient: true },
    { hasMetaBoost: false, hasNodeRecipient: true, hasLnaddressRecipient: false },
    { hasMetaBoost: true, hasNodeRecipient: false, hasLnaddressRecipient: true },
    { hasMetaBoost: false, hasNodeRecipient: false, hasLnaddressRecipient: false },
  ])('shows the fields for %j', (input) => {
    expect(showBoostNameAndMessageFields(input)).toBe(true);
  });

  it('hides the fields only for an lnaddress recipient with no node and no MetaBoost', () => {
    expect(
      showBoostNameAndMessageFields({
        hasMetaBoost: false,
        hasNodeRecipient: false,
        hasLnaddressRecipient: true,
      })
    ).toBe(false);
  });
});
