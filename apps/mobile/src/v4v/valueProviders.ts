import type { AlbyAccountSnapshot } from './alby';
import { getAlbyAccountSnapshot } from './alby';

export const VALUE_PROVIDER_KEYS = ['alby'] as const;
export type ValueProviderKey = (typeof VALUE_PROVIDER_KEYS)[number];

export type ValueProviderDefinition = {
  key: ValueProviderKey;
  titleKey: 'v4v.provider.alby';
};

const ALBY_PROVIDER: ValueProviderDefinition = {
  key: 'alby',
  titleKey: 'v4v.provider.alby',
};

export function listValueProviders(): readonly ValueProviderDefinition[] {
  return [ALBY_PROVIDER];
}

export type ValueProviderConnection =
  | { key: 'alby'; status: 'disconnected' }
  | { key: 'alby'; status: 'connected'; account: AlbyAccountSnapshot };

export function getValueProviderConnection(key: ValueProviderKey): ValueProviderConnection {
  switch (key) {
    case 'alby': {
      const account = getAlbyAccountSnapshot();
      if (account === null) {
        return { key: 'alby', status: 'disconnected' };
      }
      return { key: 'alby', status: 'connected', account };
    }
  }
}
