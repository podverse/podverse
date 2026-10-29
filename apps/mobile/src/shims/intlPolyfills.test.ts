import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { formatRelativeTimeLabel } from '@podverse/helpers';
import { SUPPORTED_LOCALES } from '@podverse/helpers/locales';

const INTL_CONSTRUCTORS = ['Locale', 'PluralRules', 'RelativeTimeFormat'] as const;

type IntlConstructorName = (typeof INTL_CONSTRUCTORS)[number];

const savedDescriptors = new Map<IntlConstructorName, PropertyDescriptor | undefined>();

const RELATIVE_TIME_LABELS: Record<string, { sameInstant: string; twoHoursAgo: string }> = {
  'el-GR': { sameInstant: 'τώρα', twoHoursAgo: 'πριν από 2 ώρες' },
  'en-US': { sameInstant: 'now', twoHoursAgo: '2 hours ago' },
  es: { sameInstant: 'ahora', twoHoursAgo: 'hace 2 horas' },
  fr: { sameInstant: 'maintenant', twoHoursAgo: 'il y a 2 heures' },
};

describe('intl polyfills', () => {
  beforeAll(async () => {
    for (const name of INTL_CONSTRUCTORS) {
      savedDescriptors.set(name, Object.getOwnPropertyDescriptor(Intl, name));
      const removed = Reflect.deleteProperty(Intl, name);
      if (!removed) {
        throw new Error(`Intl.${name} could not be removed`);
      }
    }

    await import('./intlPolyfills');
  });

  afterAll(() => {
    for (const name of INTL_CONSTRUCTORS) {
      const descriptor = savedDescriptors.get(name);
      if (descriptor !== undefined) {
        Object.defineProperty(Intl, name, descriptor);
      }
    }
  });

  it('installs plural rules and relative time and leaves Intl.Locale out', () => {
    expect(typeof Intl.Locale).toBe('undefined');
    expect(Intl.RelativeTimeFormat).toBeDefined();
    expect(Intl.PluralRules).toBeDefined();
  });

  it.each(SUPPORTED_LOCALES)('formats two hours ago and the same instant in %s', (locale) => {
    const nowMs = Date.UTC(2026, 0, 15, 12, 0, 0);
    const labels = RELATIVE_TIME_LABELS[locale];
    const twoHoursAgo = new Date(nowMs - 2 * 60 * 60_000).toISOString();
    const sameInstant = new Date(nowMs).toISOString();

    expect(formatRelativeTimeLabel(twoHoursAgo, locale, nowMs)).toBe(labels?.twoHoursAgo);
    expect(formatRelativeTimeLabel(sameInstant, locale, nowMs)).toBe(labels?.sameInstant);
  });

  it('follows each language plural category', () => {
    expect(new Intl.PluralRules('fr').select(0)).toBe('one');
    expect(new Intl.PluralRules('en').select(2)).toBe('other');
  });
});
