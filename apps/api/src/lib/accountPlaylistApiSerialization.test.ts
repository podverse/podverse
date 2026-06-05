import { describe, expect, it } from 'vitest';

import { accountToJson } from './accountApiSerialization.js';
import { playlistToJson } from './playlistApiSerialization.js';
import { resolveSharableStatusId } from './resolveSharableStatusId.js';

describe('resolveSharableStatusId', () => {
  it('prefers scalar sharable_status_id', () => {
    expect(
      resolveSharableStatusId({
        sharable_status_id: 2,
        sharable_status: { id: 3 },
      })
    ).toBe(2);
  });

  it('reads id from relation object when scalar is absent', () => {
    expect(resolveSharableStatusId({ sharable_status: { id: 1 } })).toBe(1);
  });
});

describe('accountToJson', () => {
  it('returns sharable_status_id and omits sharable_status relation', () => {
    expect(
      accountToJson({
        id: 1,
        id_text: 'abc',
        sharable_status: { id: 2 },
      })
    ).toEqual({
      id: 1,
      id_text: 'abc',
      sharable_status_id: 2,
    });
  });

  it('cleans nested account relation objects', () => {
    expect(
      accountToJson({
        id: 1,
        sharable_status_id: 1,
        account: {
          id: 2,
          sharable_status: { id: 3 },
        },
      })
    ).toEqual({
      id: 1,
      sharable_status_id: 1,
      account: {
        id: 2,
        sharable_status_id: 3,
      },
    });
  });
});

describe('playlistToJson', () => {
  it('returns sharable_status_id and omits sharable_status relation', () => {
    expect(
      playlistToJson({
        id: 1,
        id_text: 'pl1',
        sharable_status: { id: 1 },
      })
    ).toEqual({
      id: 1,
      id_text: 'pl1',
      sharable_status_id: 1,
    });
  });
});
