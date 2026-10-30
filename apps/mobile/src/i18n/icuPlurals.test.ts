import type { i18n } from 'i18next';
import i18next from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';

import consumerElGR from '../../../../packages/i18n-catalog/consumer/originals/el-GR.json';
import consumerEnUS from '../../../../packages/i18n-catalog/consumer/originals/en-US.json';
import consumerEs from '../../../../packages/i18n-catalog/consumer/originals/es.json';
import consumerFr from '../../../../packages/i18n-catalog/consumer/originals/fr.json';
import mobileElGR from '../../../../packages/i18n-catalog/mobile/originals/el-GR.json';
import mobileEnUS from '../../../../packages/i18n-catalog/mobile/originals/en-US.json';
import mobileEs from '../../../../packages/i18n-catalog/mobile/originals/es.json';
import mobileFr from '../../../../packages/i18n-catalog/mobile/originals/fr.json';
import sharedElGR from '../../../../packages/i18n-catalog/shared/originals/el-GR.json';
import sharedEnUS from '../../../../packages/i18n-catalog/shared/originals/en-US.json';
import sharedEs from '../../../../packages/i18n-catalog/shared/originals/es.json';
import sharedFr from '../../../../packages/i18n-catalog/shared/originals/fr.json';
import { buildOpmlRateLimitMessage } from '../lib/rateLimit/handleRateLimitMessage';
import { MOBILE_I18N_INTERPOLATION } from './i18nInitOptions';
import type { CatalogTree } from './icuPlurals';
import { expandIcuPlurals, parseIcuPlural } from './icuPlurals';

const CLIPS =
  '{count, plural, one {# of your clips now shows Content Removed.} other {# of your clips now show Content Removed.}}';

const CLIPS_ONE = '{count, number} of your clips now shows Content Removed.';
const CLIPS_OTHER = '{count, number} of your clips now show Content Removed.';

const UNSUPPORTED_PLURALS: ReadonlyArray<readonly [string, string]> = [
  ['select', '{count, select, one {a} other {b}}'],
  ['selectordinal', '{count, selectordinal, one {#st} other {#th}}'],
  ['exact selector', '{count, plural, =0 {none} one {#} other {#}}'],
  ['offset', '{count, plural, offset:1 one {#} other {#}}'],
  ['two plural blocks', '{count, plural, one {#} other {#}} {count, plural, one {#} other {#}}'],
  ['nested plural', '{count, plural, one {# {total, plural, one {#} other {#}}} other {#}}'],
  ['no other', '{count, plural, one {#}}'],
  ['unbalanced braces', '{count, plural, one {#} other {#}'],
  ['ICU quoting', "'{count, plural, one {#} other {#}}"],
];

const CATALOG_ORIGINALS: ReadonlyArray<readonly [string, CatalogTree]> = [
  ['shared en-US', sharedEnUS],
  ['shared es', sharedEs],
  ['shared fr', sharedFr],
  ['shared el-GR', sharedElGR],
  ['consumer en-US', consumerEnUS],
  ['consumer es', consumerEs],
  ['consumer fr', consumerFr],
  ['consumer el-GR', consumerElGR],
  ['mobile en-US', mobileEnUS],
  ['mobile es', mobileEs],
  ['mobile fr', mobileFr],
  ['mobile el-GR', mobileElGR],
];

const RENDER_LOCALES = ['en-US', 'es', 'fr', 'el-GR'] as const;
const RENDER_COUNTS = [1, 2, 5, 21, 1000] as const;
const RENDER_KEYS = [
  'settings.advanced.clips',
  'settings.advanced.playlist_entries',
  'settings.opml.import_rate_limited_time',
] as const;

type TranslateFn = (key: string, values?: Record<string, string | number>) => string;

function isCatalogTree(value: unknown): value is CatalogTree {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function child(tree: CatalogTree, key: string): CatalogTree {
  const value = tree[key];
  if (!isCatalogTree(value)) {
    throw new Error(`Expected an object at ${key}`);
  }
  return value;
}

function translate(instance: i18n, locale: string): TranslateFn {
  const t = instance.getFixedT(locale);
  return (key, values) => {
    const options: {
      count?: number;
      minutes?: number;
      limit?: number;
      time?: string;
    } = {};
    if (values !== undefined) {
      if (typeof values.count === 'number') {
        options.count = values.count;
      }
      if (typeof values.minutes === 'number') {
        options.minutes = values.minutes;
      }
      if (typeof values.limit === 'number') {
        options.limit = values.limit;
      }
      if (typeof values.time === 'string') {
        options.time = values.time;
      }
    }
    const result = t(key, options);
    if (typeof result !== 'string') {
      throw new Error(`Expected a string for ${key}`);
    }
    return result;
  };
}

describe('parseIcuPlural', () => {
  it('expands plural branches and keeps text around the block', () => {
    expect(parseIcuPlural(CLIPS)).toEqual({
      kind: 'plural',
      base: CLIPS_OTHER,
      forms: {
        one: CLIPS_ONE,
        other: CLIPS_OTHER,
      },
    });

    const hours = parseIcuPlural('in {count, plural, one {# hour} other {# hours}}');
    expect(hours).toMatchObject({
      kind: 'plural',
      forms: {
        one: 'in {count, number} hour',
      },
    });

    const minutes = parseIcuPlural('{minutes, plural, one {# minute} other {# minutes}}');
    expect(minutes).toMatchObject({
      kind: 'plural',
      forms: {
        one: '{minutes, number} minute',
      },
    });
  });

  it('leaves plain strings, placeholders, and apostrophes untouched', () => {
    expect(parseIcuPlural('Hello')).toEqual({ kind: 'none' });
    expect(parseIcuPlural('Welcome to {brand_name}')).toEqual({ kind: 'none' });
    expect(parseIcuPlural("Can't")).toEqual({ kind: 'none' });
  });

  it.each(UNSUPPORTED_PLURALS)('rejects %s', (_label, value) => {
    expect(parseIcuPlural(value).kind).toBe('unsupported');
  });
});

describe('expandIcuPlurals', () => {
  it('writes suffix siblings and does not change the input', () => {
    const input: CatalogTree = {
      settings: {
        advanced: {
          clips: CLIPS,
        },
      },
    };
    const snapshot = structuredClone(input);
    const { tree, unsupportedKeys } = expandIcuPlurals(input);

    expect(input).toEqual(snapshot);
    expect(unsupportedKeys).toEqual([]);
    expect(child(child(tree, 'settings'), 'advanced')).toEqual({
      clips: CLIPS_OTHER,
      clips_one: CLIPS_ONE,
      clips_other: CLIPS_OTHER,
    });
  });

  it('leaves a key untouched when a plural suffix sibling already exists', () => {
    const input: CatalogTree = {
      clips: CLIPS,
      clips_one: 'already here',
    };
    const snapshot = structuredClone(input);
    const { tree, unsupportedKeys } = expandIcuPlurals(input);

    expect(input).toEqual(snapshot);
    expect(unsupportedKeys).toEqual(['clips']);
    expect(tree).toEqual({
      clips: CLIPS,
      clips_one: 'already here',
    });
  });

  it('reports a nested unsupported string by its dotted path', () => {
    const bad = '{count, select, one {a} other {b}}';
    const input: CatalogTree = {
      settings: {
        opml: {
          bad,
        },
      },
    };
    const { tree, unsupportedKeys } = expandIcuPlurals(input);

    expect(unsupportedKeys).toEqual(['settings.opml.bad']);
    expect(child(child(tree, 'settings'), 'opml')).toEqual({ bad });
  });
});

describe('catalog originals', () => {
  it.each(CATALOG_ORIGINALS)('%s has no ICU plural mobile cannot render', (_label, catalog) => {
    expect(expandIcuPlurals(catalog).unsupportedKeys).toEqual([]);
  });
});

describe('rendered plural strings', () => {
  let translator: i18n | undefined;

  beforeAll(async () => {
    const instance = i18next.createInstance();
    await instance.init({
      interpolation: MOBILE_I18N_INTERPOLATION,
      keySeparator: '.',
      nsSeparator: false,
      returnNull: false,
      lng: 'en-US',
      fallbackLng: 'en-US',
      resources: {
        'el-GR': { translation: expandIcuPlurals(consumerElGR).tree },
        'en-US': { translation: expandIcuPlurals(consumerEnUS).tree },
        es: { translation: expandIcuPlurals(consumerEs).tree },
        fr: { translation: expandIcuPlurals(consumerFr).tree },
      },
    });
    translator = instance;
  });

  function tFor(locale: string): TranslateFn {
    if (translator === undefined) {
      throw new Error('i18next instance was not initialized');
    }
    return translate(translator, locale);
  }

  it('renders English clip and playlist counts', () => {
    const t = tFor('en-US');
    expect(t('settings.advanced.clips', { count: 1 })).toBe(
      '1 of your clips now shows Content Removed.'
    );
    expect(t('settings.advanced.clips', { count: 2 })).toBe(
      '2 of your clips now show Content Removed.'
    );
    expect(t('settings.advanced.playlist_entries', { count: 1 })).toBe(
      '1 of your playlist entries now shows Content Removed.'
    );
  });

  it('renders the OPML rate-limit message in English', () => {
    const t = tFor('en-US');
    expect(buildOpmlRateLimitMessage(100, 60, t)).toBe(
      'You can add up to 100 feeds per hour. To finish importing the rest, try again after 1 minute.'
    );
    expect(buildOpmlRateLimitMessage(100, 300, t).endsWith('after 5 minutes.')).toBe(true);
  });

  it('fills every plural placeholder for each locale and count', () => {
    for (const locale of RENDER_LOCALES) {
      const t = tFor(locale);
      for (const key of RENDER_KEYS) {
        for (const count of RENDER_COUNTS) {
          const rendered = t(key, { count, minutes: count });
          expect(rendered.includes('#')).toBe(false);
          expect(rendered.includes('{')).toBe(false);
          expect(rendered.includes('}')).toBe(false);
        }
      }
    }
  });

  it('renders the Greek OPML wait for three minutes', () => {
    const t = tFor('el-GR');
    expect(t('settings.opml.import_rate_limited_time', { count: 3, minutes: 3 })).toBe('3 λεπτά');
  });
});
