import { describe, expect, it } from 'vitest';

import {
  getPopularityTrackingAbridgedMarkdown,
  parsePopularityTrackingMarkdown,
} from './popularityTrackingMarkdown.js';

describe('parsePopularityTrackingMarkdown', () => {
  it('parses heading, paragraphs, list, and a link', () => {
    const blocks = parsePopularityTrackingMarkdown(
      [
        '# Popularity Tracking',
        '',
        'Rankings use unique listeners so people can find shows they like.',
        '',
        '- Data stays on Podverse servers.',
        '- We never sell it.',
        '',
        'You can change this later in [settings](/settings).',
      ].join('\n')
    );

    expect(blocks).toEqual([
      { type: 'heading', text: 'Popularity Tracking' },
      {
        type: 'paragraph',
        spans: [
          {
            type: 'text',
            text: 'Rankings use unique listeners so people can find shows they like.',
          },
        ],
      },
      {
        type: 'list',
        items: [
          [{ type: 'text', text: 'Data stays on Podverse servers.' }],
          [{ type: 'text', text: 'We never sell it.' }],
        ],
      },
      {
        type: 'paragraph',
        spans: [
          { type: 'text', text: 'You can change this later in ' },
          { type: 'link', text: 'settings', href: '/settings' },
          { type: 'text', text: '.' },
        ],
      },
    ]);
  });

  it('returns an empty list for blank input', () => {
    expect(parsePopularityTrackingMarkdown('   ')).toEqual([]);
  });
});

describe('getPopularityTrackingAbridgedMarkdown', () => {
  it('returns the text before the first heading', () => {
    expect(
      getPopularityTrackingAbridgedMarkdown(
        ['Intro paragraph.', '', '# Details', '', 'More detail.'].join('\n')
      )
    ).toBe('Intro paragraph.');
  });

  it('returns the full document when there is no heading', () => {
    expect(getPopularityTrackingAbridgedMarkdown('Only this.')).toBe('Only this.');
  });
});
