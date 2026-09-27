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

  it('keeps a web region when surface is omitted', () => {
    const blocks = parseCopyMarkdown(
      [
        'Intro.',
        '',
        '{{web}}',
        '{{image:app_store}}(https://apps.apple.com/us/app/podverse/id1390888454?mt=8)',
        '{{/web}}',
        '',
        'After.',
      ].join('\n')
    );

    expect(blocks).toEqual([
      { type: 'paragraph', spans: [{ type: 'text', text: 'Intro.' }] },
      {
        type: 'image',
        key: 'app_store',
        href: 'https://apps.apple.com/us/app/podverse/id1390888454?mt=8',
      },
      { type: 'paragraph', spans: [{ type: 'text', text: 'After.' }] },
    ]);
  });

  it('skips a web region when surface is mobile', () => {
    const blocks = parseCopyMarkdown(
      [
        'Intro.',
        '',
        '{{web}}',
        '{{image:app_store}}(https://apps.apple.com/us/app/podverse/id1390888454?mt=8)',
        '{{image:google_play}}(https://play.google.com/store/apps/details?id=com.podverse)',
        '{{/web}}',
        '',
        'After.',
      ].join('\n'),
      { surface: 'mobile' }
    );

    expect(blocks).toEqual([
      { type: 'paragraph', spans: [{ type: 'text', text: 'Intro.' }] },
      { type: 'paragraph', spans: [{ type: 'text', text: 'After.' }] },
    ]);
  });

  it('parses image directives and a feature comparison component', () => {
    const blocks = parseCopyMarkdown(
      [
        '{{image:app_store}}(https://apps.apple.com/us/app/podverse/id1390888454?mt=8)',
        '{{image:google_play}}(https://play.google.com/store/apps/details?id=com.podverse)',
        '{{image:f_droid}}(https://f-droid.org/en/packages/com.podverse.fdroid/)',
        '',
        '{{feature_comparison}}',
      ].join('\n'),
      { surface: 'web' }
    );

    expect(blocks).toEqual([
      {
        type: 'image',
        key: 'app_store',
        href: 'https://apps.apple.com/us/app/podverse/id1390888454?mt=8',
      },
      {
        type: 'image',
        key: 'google_play',
        href: 'https://play.google.com/store/apps/details?id=com.podverse',
      },
      {
        type: 'image',
        key: 'f_droid',
        href: 'https://f-droid.org/en/packages/com.podverse.fdroid/',
      },
      { type: 'component', key: 'feature_comparison' },
    ]);
  });

  it('drops unknown directive lines', () => {
    const blocks = parseCopyMarkdown(['Before.', '', '{{future_widget}}', '', 'After.'].join('\n'));

    expect(blocks).toEqual([
      { type: 'paragraph', spans: [{ type: 'text', text: 'Before.' }] },
      { type: 'paragraph', spans: [{ type: 'text', text: 'After.' }] },
    ]);
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
