import { describe, expect, it } from 'vitest';

import { getCopyMarkdownIntro, parseCopyMarkdown } from './copyMarkdown.js';

describe('parseCopyMarkdown', () => {
  it('parses heading, paragraphs, list, and a link', () => {
    const blocks = parseCopyMarkdown(
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
    expect(parseCopyMarkdown('   ')).toEqual([]);
  });
});

describe('getCopyMarkdownIntro', () => {
  it('returns the text before the first heading', () => {
    expect(
      getCopyMarkdownIntro(['Intro paragraph.', '', '# Details', '', 'More detail.'].join('\n'))
    ).toBe('Intro paragraph.');
  });

  it('returns the full document when there is no heading', () => {
    expect(getCopyMarkdownIntro('Only this.')).toBe('Only this.');
  });
});
