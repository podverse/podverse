import { describe, expect, it } from 'vitest';

import type { LocalPersonCreditInput, LocalPersonItemCredits } from './localCredits.js';
import { localChannelPeopleSections } from './localCredits.js';

const credit = (
  name: string,
  extras: Partial<LocalPersonCreditInput> = {}
): LocalPersonCreditInput => ({
  href: null,
  img: null,
  name,
  role: null,
  ...extras,
});

const item = (
  people: readonly LocalPersonCreditInput[],
  publishedAt: string | null
): LocalPersonItemCredits => ({
  people,
  publishedAt,
});

describe('localChannelPeopleSections', () => {
  it('lists a channel host in Cast and a guest who is only on an episode in Appearances', () => {
    const sections = localChannelPeopleSections({
      cast: [credit('Ada Host', { href: 'https://example.com/ada', role: 'host' })],
      items: [item([credit('Grace Guest', { role: 'guest' })], '2026-03-01T00:00:00.000Z')],
    });

    expect(sections.cast).toEqual([
      {
        href: 'https://example.com/ada',
        img: null,
        name: 'Ada Host',
        role: 'host',
      },
    ]);
    expect(sections.appearances).toEqual([{ img: null, itemCount: 1, name: 'Grace Guest' }]);
    expect(sections.hasPeople).toBe(true);
  });

  it('counts the same person on two episodes once per episode', () => {
    const sections = localChannelPeopleSections({
      cast: [],
      items: [
        item([credit('Grace Guest')], '2026-03-01T00:00:00.000Z'),
        item(
          [credit('Grace Guest'), credit('Grace Guest', { role: 'guest' })],
          '2026-03-02T00:00:00.000Z'
        ),
      ],
    });

    expect(sections.appearances).toEqual([{ img: null, itemCount: 2, name: 'Grace Guest' }]);
  });

  it('keeps a person who is in Cast in Appearances and uses the Cast name', () => {
    const sections = localChannelPeopleSections({
      cast: [credit('Dave Jones', { role: 'host' })],
      items: [item([credit('dave jones')], '2026-03-01T00:00:00.000Z')],
    });

    expect(sections.cast.map((person) => person.name)).toEqual(['Dave Jones']);
    expect(sections.appearances).toEqual([{ img: null, itemCount: 1, name: 'Dave Jones' }]);
  });

  it('drops an empty name and leaves a name that does not key out of Appearances', () => {
    const sections = localChannelPeopleSections({
      cast: [credit('   '), credit('Ada Host')],
      items: [item([credit('---'), credit('')], '2026-03-01T00:00:00.000Z')],
    });

    expect(sections.cast.map((person) => person.name)).toEqual(['Ada Host']);
    expect(sections.appearances).toEqual([]);
    expect(sections.hasPeople).toBe(true);
  });

  it('uses the image from the later episode and ignores a newer credit that has none', () => {
    const sections = localChannelPeopleSections({
      cast: [],
      items: [
        item(
          [credit('Grace Guest', { img: 'https://example.com/early.png' })],
          '2026-03-01T00:00:00.000Z'
        ),
        item(
          [credit('Grace Guest', { img: 'https://example.com/late.png' })],
          '2026-03-02T00:00:00.000Z'
        ),
        item([credit('Grace Guest')], '2026-04-01T00:00:00.000Z'),
      ],
    });

    expect(sections.appearances).toEqual([
      { img: 'https://example.com/late.png', itemCount: 3, name: 'Grace Guest' },
    ]);
  });

  it('orders appearances by count, then name', () => {
    const sections = localChannelPeopleSections({
      cast: [],
      items: [
        item([credit('Zoe'), credit('Amy')], '2026-03-01T00:00:00.000Z'),
        item([credit('Amy')], '2026-03-02T00:00:00.000Z'),
      ],
    });

    expect(sections.appearances.map((person) => person.name)).toEqual(['Amy', 'Zoe']);
  });

  it('treats a missing date as older than any date', () => {
    const sections = localChannelPeopleSections({
      cast: [],
      items: [
        item([credit('Grace Guest', { img: 'https://example.com/dated.png' })], null),
        item(
          [credit('Grace Guest', { img: 'https://example.com/later.png' })],
          '2026-03-01T00:00:00.000Z'
        ),
      ],
    });

    expect(sections.appearances[0]?.img).toBe('https://example.com/later.png');
  });
});
