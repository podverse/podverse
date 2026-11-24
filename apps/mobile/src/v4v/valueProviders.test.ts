import { beforeEach, describe, expect, it, vi } from 'vitest';

type Snapshot = {
  balanceSats: number | null;
  lightningAddress: string | null;
};

const snapshotBox = vi.hoisted(() => {
  const box: { current: Snapshot | null } = { current: null };
  return box;
});

vi.mock('./alby', () => ({
  getAlbyAccountSnapshot: () => snapshotBox.current,
}));

import { getValueProviderConnection, listValueProviders } from './valueProviders';

describe('value providers', () => {
  beforeEach(() => {
    snapshotBox.current = null;
  });

  it('lists Alby', () => {
    const providers = listValueProviders();
    expect(providers).toHaveLength(1);
    const provider = providers[0];
    if (provider === undefined) {
      throw new Error('missing value provider');
    }
    expect(provider.key).toBe('alby');
    expect(provider.titleKey).toBe('v4v.provider.alby');
  });

  it('follows the Alby snapshot', () => {
    expect(getValueProviderConnection('alby')).toEqual({ key: 'alby', status: 'disconnected' });

    const account: Snapshot = { balanceSats: 12, lightningAddress: 'me@getalby.com' };
    snapshotBox.current = account;
    expect(getValueProviderConnection('alby')).toEqual({
      key: 'alby',
      status: 'connected',
      account,
    });
  });
});
