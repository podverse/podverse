import { describe, expect, it } from 'vitest';

import { emptyIfNotFound, getApiErrorStatus, isApiNotFoundError } from './apiErrorStatus';

describe('getApiErrorStatus', () => {
  it('reads axios-style response.status', () => {
    expect(getApiErrorStatus({ response: { status: 404 } })).toBe(404);
  });

  it('returns null when the failure has no HTTP response', () => {
    expect(getApiErrorStatus(new Error('network'))).toBeNull();
    expect(getApiErrorStatus({ response: { data: 'nope' } })).toBeNull();
  });
});

describe('isApiNotFoundError', () => {
  it('is true only for 404', () => {
    expect(isApiNotFoundError({ response: { status: 404 } })).toBe(true);
    expect(isApiNotFoundError({ response: { status: 500 } })).toBe(false);
  });
});

describe('emptyIfNotFound', () => {
  it('returns the successful value', async () => {
    await expect(emptyIfNotFound(async () => ['a'], [])).resolves.toEqual(['a']);
  });

  it('returns the empty stand-in on 404', async () => {
    await expect(
      emptyIfNotFound(async () => {
        throw { response: { status: 404 } };
      }, [])
    ).resolves.toEqual([]);
  });

  it('rethrows other failures', async () => {
    await expect(
      emptyIfNotFound(async () => {
        throw { response: { status: 500 } };
      }, [])
    ).rejects.toEqual({ response: { status: 500 } });
  });
});
