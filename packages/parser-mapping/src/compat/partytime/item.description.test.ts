import { describe, expect, it } from 'vitest';

import { DescriptionLengthTierEnum } from '@podverse/helpers';

import type { Episode } from '../../types/partytime.js';
import { compatItemDescriptionDto } from './item.js';

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    guid: 'ep-1',
    enclosure: {
      url: 'https://example.com/a.mp3',
      type: 'audio/mpeg',
      length: 1,
    },
    duration: 1,
    explicit: false,
    ...overrides,
  };
}

const longParagraphs = (count: number): string =>
  Array.from({ length: count }, (_, index) => `<p>${String(index).padEnd(1000, 'x')}</p>`).join('');

describe('compatItemDescriptionDto', () => {
  it('prefers content:encoded over the description', () => {
    const dto = compatItemDescriptionDto(
      episode({
        content: '<p>From <strong>content</strong></p>',
        descriptionRaw: 'From raw description',
        description: 'From description',
      }),
      DescriptionLengthTierEnum.Standard
    );

    expect(dto?.value).toContain('**content**');
    expect(dto?.is_truncated).toBe(false);
  });

  it('falls back to the raw description and keeps its line breaks', () => {
    const dto = compatItemDescriptionDto(
      episode({
        content: '   ',
        descriptionRaw: 'First paragraph.\n\nSecond paragraph.',
        description: 'First paragraph. Second paragraph.',
      }),
      DescriptionLengthTierEnum.Standard
    );

    expect(dto?.value).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('cuts at a block boundary within the feed tier', () => {
    const source = episode({ content: longParagraphs(15) });

    const standard = compatItemDescriptionDto(source, DescriptionLengthTierEnum.Standard);
    const extended = compatItemDescriptionDto(source, DescriptionLengthTierEnum.Extended);

    expect(standard?.is_truncated).toBe(true);
    expect(standard?.value.endsWith('x')).toBe(true);
    expect(standard?.value.includes('<p>')).toBe(false);
    expect(standard?.source_length).toBeGreaterThan(10_000);
    expect(extended?.is_truncated).toBe(false);
    expect(extended?.value.length).toBeGreaterThan(standard?.value.length ?? 0);
  });

  it('returns null when every source is blank', () => {
    expect(
      compatItemDescriptionDto(
        episode({ content: '', descriptionRaw: '  ', description: null, summary: undefined }),
        DescriptionLengthTierEnum.Standard
      )
    ).toBeNull();
  });
});
