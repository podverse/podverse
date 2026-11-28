import { describe, expect, it } from 'vitest';

import type { DescriptionNode } from './descriptionDocument.js';
import { readDescriptionDocument } from './descriptionDocument.js';
import {
  pickChannelDescriptionSource,
  pickItemDescriptionSource,
  prepareDescriptionForStorage,
} from './descriptionIngest.js';
import { DescriptionLengthTierEnum, suggestDescriptionLengthTier } from './descriptionLimits.js';
import { getDescriptionPreviewText, isDescriptionTruncated } from './descriptionPreview.js';

const buildLongShowNotes = (): string => {
  const items = Array.from({ length: 60 }, (_value, index) => {
    const itemNumber = index + 1;
    const repeated = `detail ${itemNumber} `.repeat(18);
    return `<li><a href="https://example.com/topic-${itemNumber}">Topic ${itemNumber}</a> ${repeated}</li>`;
  });

  return `<h2>Show Notes</h2><ul>${items.join('')}</ul>`;
};

const keptParagraphs = (texts: string[]): DescriptionNode[] =>
  texts.map((text) => ({ kind: 'p', children: [{ kind: 'text', text }] }));

const isAllowedStoredHref = (href: string): boolean => {
  const lower = href.trim().toLowerCase();
  return lower.startsWith('http://') || lower.startsWith('https://') || lower.startsWith('mailto:');
};

const assertStoredAllowlist = (value: string, nodes: DescriptionNode[]): void => {
  expect(value).not.toMatch(/<(?!\/?u>)[A-Za-z!/]/);
  expect(value).not.toMatch(/(^|[\s"'<])on[a-z0-9_-]*\s*=/i);
  expect(/(^|[^:])\/\//.test(value)).toBe(false);
  const lower = value.toLowerCase();
  expect(lower.includes('javascript:')).toBe(false);
  expect(lower.includes('data:')).toBe(false);

  for (const match of value.matchAll(/\]\(([^)]*)\)/g)) {
    expect(isAllowedStoredHref(match[1] ?? '')).toBe(true);
  }

  const walk = (list: DescriptionNode[]): void => {
    for (const node of list) {
      if (node.kind === 'text') {
        expect(node.text).not.toMatch(/<(?!\/?u>)[A-Za-z!/]/);
        expect(node.text).not.toMatch(/(^|[\s"'<])on[a-z0-9_-]*\s*=/i);
        expect(node.text.toLowerCase().includes('javascript:')).toBe(false);
        continue;
      }
      if (node.kind === 'br') {
        continue;
      }
      if (node.kind === 'a') {
        expect(isAllowedStoredHref(node.href)).toBe(true);
        expect(node.href.trim().startsWith('//')).toBe(false);
        walk(node.children);
        continue;
      }
      walk(node.children);
    }
  };

  walk(nodes);
};

const expectAllowlistedDescription = (
  source: string,
  value: string,
  rich: DescriptionNode[]
): void => {
  const prepared = prepareDescriptionForStorage(source, DescriptionLengthTierEnum.Standard);
  expect(prepared?.value).toBe(value);
  const readBack = readDescriptionDocument(prepared?.value).rich;
  expect(readBack).toEqual(rich);
  if (prepared?.value === undefined || readBack === null) {
    return;
  }
  assertStoredAllowlist(prepared.value, readBack);
};

describe('prepareDescriptionForStorage', () => {
  it('keeps rich markup and truncates long list notes at list-item boundaries', () => {
    const prepared = prepareDescriptionForStorage(
      buildLongShowNotes(),
      DescriptionLengthTierEnum.Standard
    );

    expect(prepared).not.toBeNull();
    expect(prepared?.is_truncated).toBe(true);
    expect(prepared?.value.includes('- [Topic ')).toBe(true);
    expect(prepared?.value.includes('<ul>')).toBe(false);
    expect(prepared?.value.includes('topic-60')).toBe(false);
    expect(readDescriptionDocument(prepared?.value).rich).not.toBeNull();
  });

  it('keeps a readable document when a cut lands inside an href', () => {
    const source = `<p>Start</p><a href="https://example.com/${'x'.repeat(2900)}">Read</a>`;
    const cutInsideHref = source.slice(0, 2500);
    const prepared = prepareDescriptionForStorage(
      cutInsideHref,
      DescriptionLengthTierEnum.Standard
    );

    expect(prepared).not.toBeNull();
    expect(readDescriptionDocument(prepared?.value).rich).not.toBeNull();
    expect(prepared?.value.includes('https://example.com/')).toBe(false);
  });

  it('handles implicit closes and stray close tags', () => {
    const prepared = prepareDescriptionForStorage(
      '<p>a<p>b</p><ul><li>x<li>y</ul></p></div>',
      DescriptionLengthTierEnum.Standard
    );

    expect(prepared?.value).toBe('a\n\nb\n\n- x\n- y');
  });

  it('drops script/style payloads, including unclosed script tags', () => {
    const prepared = prepareDescriptionForStorage(
      '<p>Safe</p><script>bad()</script><style>.x{}</style><p>Also</p><script>tail',
      DescriptionLengthTierEnum.Standard
    );

    expect(prepared?.value).toBe('Safe\n\nAlso');
  });

  it('unwraps unsafe href protocols and keeps allowed links', () => {
    const prepared = prepareDescriptionForStorage(
      '<p><a href="javascript:alert(1)">bad</a> <a href="data:text/plain,abc">worse</a> ' +
        '<a href="mailto:test@example.com">mail</a> <a href="https://example.com">ok</a></p>',
      DescriptionLengthTierEnum.Standard
    );

    expect(prepared?.value.includes('javascript:')).toBe(false);
    expect(prepared?.value.includes('data:text/plain')).toBe(false);
    expect(prepared?.value.includes('[mail](mailto:test@example.com)')).toBe(true);
    expect(prepared?.value.includes('[ok](https://example.com)')).toBe(true);
  });

  it('drops an image tag with an onerror handler', () => {
    expectAllowlistedDescription(
      '<p>Safe</p><img src="https://evil.example/x.png" onerror="alert(1)" alt="pic"><p>Also</p>',
      'Safe\n\nAlso',
      keptParagraphs(['Safe', 'Also'])
    );
  });

  it('drops an svg tag', () => {
    expectAllowlistedDescription(
      '<p>Safe</p><svg onload="alert(1)"><script>bad()</script></svg><p>Also</p>',
      'Safe\n\nAlso',
      keptParagraphs(['Safe', 'Also'])
    );
  });

  it('drops an iframe tag', () => {
    expectAllowlistedDescription(
      '<p>Safe</p><iframe src="https://evil.example/embed" onload="alert(1)"></iframe><p>Also</p>',
      'Safe\n\nAlso',
      keptParagraphs(['Safe', 'Also'])
    );
  });

  it('unwraps javascript links with mixed case and whitespace after the colon', () => {
    expectAllowlistedDescription(
      '<p><a href="JaVaScRiPt:\talert(1)">bad</a> <a href="JavaScript:\nalert(1)">worse</a> ' +
        '<a href="https://example.com">ok</a></p>',
      'bad worse [ok](https://example.com)',
      [
        {
          kind: 'p',
          children: [
            { kind: 'text', text: 'bad worse ' },
            {
              kind: 'a',
              href: 'https://example.com',
              children: [{ kind: 'text', text: 'ok' }],
            },
          ],
        },
      ]
    );
  });

  it('unwraps a protocol-relative link', () => {
    expectAllowlistedDescription(
      '<p><a href="//evil.example/phish">click</a> <a href="https://example.com">ok</a></p>',
      'click [ok](https://example.com)',
      [
        {
          kind: 'p',
          children: [
            { kind: 'text', text: 'click ' },
            {
              kind: 'a',
              href: 'https://example.com',
              children: [{ kind: 'text', text: 'ok' }],
            },
          ],
        },
      ]
    );
  });

  it('drops a disallowed tag wrapped in an html comment', () => {
    expectAllowlistedDescription(
      '<p>Safe</p><!-- <script>bad()</script><img src="x" onerror="alert(1)"> --><p>Also</p>',
      'Safe\n\nAlso',
      keptParagraphs(['Safe', 'Also'])
    );
  });

  it('drops a truncated tag in the lenient path', () => {
    expectAllowlistedDescription(
      '<p>Safe</p><img src="https://evil.example/x.png" onerror="alert(1)"',
      'Safe',
      keptParagraphs(['Safe'])
    );
  });

  it('maps plain text line breaks to paragraphs and br tags', () => {
    const prepared = prepareDescriptionForStorage(
      'Line one\nLine two\n\nLine three',
      DescriptionLengthTierEnum.Standard
    );

    expect(prepared?.value).toBe('Line one  \nLine two\n\nLine three');
  });

  it('decodes entities in preview, escapes once in value, and is idempotent', () => {
    const prepared = prepareDescriptionForStorage(
      '<p>A &amp; B&nbsp;&#8217; C</p>',
      DescriptionLengthTierEnum.Standard
    );

    expect(prepared).not.toBeNull();
    expect(prepared?.preview).toBe('A & B ’ C');
    expect(prepared?.value).toBe('A & B\u00A0’ C');
    expect(prepared?.value.includes('&amp;')).toBe(false);
    expect(prepared?.value.includes('&nbsp;')).toBe(false);

    const reparsed = prepareDescriptionForStorage(
      prepared?.value ?? '',
      DescriptionLengthTierEnum.Standard
    );
    expect(reparsed?.value).toBe(prepared?.value);
    expect(reparsed?.preview).toBe(prepared?.preview);
    expect(reparsed?.is_truncated).toBe(false);
  });

  it('cuts a too-long first block at a word boundary with an ellipsis', () => {
    const giantParagraph = `<p>${'word '.repeat(2_400)}</p>`;
    const prepared = prepareDescriptionForStorage(
      giantParagraph,
      DescriptionLengthTierEnum.Standard
    );

    expect(prepared).not.toBeNull();
    expect(prepared?.is_truncated).toBe(true);
    expect(prepared?.value.endsWith('…')).toBe(true);
  });

  it('removes empty formatting nodes and keeps stored length inside cap', () => {
    const prepared = prepareDescriptionForStorage(
      `<p>Intro</p>${'<b></b>'.repeat(100_000)}`,
      DescriptionLengthTierEnum.Standard
    );

    expect(prepared).not.toBeNull();
    expect(prepared?.value).toBe('Intro');
    expect(prepared?.value.length).toBeLessThanOrEqual(30_000);
  });

  it('truncates by tier and exposes tier suggestions at boundaries', () => {
    const input = `<p>${'word '.repeat(2_400)}</p>`;
    const standard = prepareDescriptionForStorage(input, DescriptionLengthTierEnum.Standard);
    const extended = prepareDescriptionForStorage(input, DescriptionLengthTierEnum.Extended);
    const maximum = prepareDescriptionForStorage(input, DescriptionLengthTierEnum.Maximum);

    expect(standard?.is_truncated).toBe(true);
    expect(extended?.is_truncated).toBe(false);
    expect(maximum?.is_truncated).toBe(false);

    expect(suggestDescriptionLengthTier(10_000)).toBe(DescriptionLengthTierEnum.Standard);
    expect(suggestDescriptionLengthTier(10_001)).toBe(DescriptionLengthTierEnum.Extended);
    expect(suggestDescriptionLengthTier(50_001)).toBeNull();
  });

  it('stores Podcasting 2.0 style HTML as markdown and reads the same links and lists', () => {
    const source = [
      '<p>Welcome to Podcasting 2.0.</p>',
      '<p>Visit <a href="https://podcastindex.org/">the <strong>index</strong></a> for the namespace.</p>',
      '<h2>Features</h2>',
      '<ul><li>Chapters</li><li>Transcripts</li></ul>',
    ].join('');
    const prepared = prepareDescriptionForStorage(source, DescriptionLengthTierEnum.Standard);
    const markdown = [
      'Welcome to Podcasting 2.0.',
      '',
      'Visit [the **index**](https://podcastindex.org/) for the namespace.',
      '',
      '## Features',
      '',
      '- Chapters',
      '- Transcripts',
    ].join('\n');

    expect(prepared?.value).toBe(markdown);
    const again = prepareDescriptionForStorage(markdown, DescriptionLengthTierEnum.Standard);
    expect(again?.value).toBe(markdown);

    const rich = readDescriptionDocument(markdown).rich;
    expect(rich).toEqual([
      { kind: 'p', children: [{ kind: 'text', text: 'Welcome to Podcasting 2.0.' }] },
      {
        kind: 'p',
        children: [
          { kind: 'text', text: 'Visit ' },
          {
            kind: 'a',
            href: 'https://podcastindex.org/',
            children: [
              { kind: 'text', text: 'the ' },
              { kind: 'strong', children: [{ kind: 'text', text: 'index' }] },
            ],
          },
          { kind: 'text', text: ' for the namespace.' },
        ],
      },
      { kind: 'h2', children: [{ kind: 'text', text: 'Features' }] },
      {
        kind: 'ul',
        children: [
          { kind: 'li', children: [{ kind: 'text', text: 'Chapters' }] },
          { kind: 'li', children: [{ kind: 'text', text: 'Transcripts' }] },
        ],
      },
    ]);
  });

  it('keeps literal asterisks and stores underline as a tag', () => {
    const bullet = prepareDescriptionForStorage('* bullet', DescriptionLengthTierEnum.Standard);
    expect(bullet?.value).toBe('\\* bullet');

    const bold = prepareDescriptionForStorage('**bold**', DescriptionLengthTierEnum.Standard);
    expect(bold?.value).toBe('**bold**');

    const underlined = prepareDescriptionForStorage(
      '<p>See <u>this</u></p><p>Next</p>',
      DescriptionLengthTierEnum.Standard
    );
    expect(underlined?.value).toBe('See <u>this</u>\n\nNext');
    const reread = prepareDescriptionForStorage(
      underlined?.value ?? '',
      DescriptionLengthTierEnum.Standard
    );
    expect(reread?.value).toBe(underlined?.value);
  });
});

describe('description source pickers and preview reader', () => {
  it('picks item description source in content -> descriptionRaw -> description -> summary order', () => {
    expect(
      pickItemDescriptionSource({
        content: '  ',
        descriptionRaw: '<p>raw</p>',
        description: '<p>description</p>',
        summary: '<p>summary</p>',
      })
    ).toBe('<p>raw</p>');

    expect(
      pickItemDescriptionSource({
        content: '<p>content</p>',
        descriptionRaw: '<p>raw</p>',
      })
    ).toBe('<p>content</p>');

    expect(
      pickItemDescriptionSource({
        content: '   ',
        descriptionRaw: ' ',
        description: '',
        summary: '<p>summary</p>',
      })
    ).toBe('<p>summary</p>');
  });

  it('picks channel description source in descriptionRaw -> description order', () => {
    expect(
      pickChannelDescriptionSource({
        descriptionRaw: ' ',
        description: '<p>description</p>',
      })
    ).toBe('<p>description</p>');

    expect(
      pickChannelDescriptionSource({
        descriptionRaw: '<p>raw</p>',
        description: '<p>description</p>',
      })
    ).toBe('<p>raw</p>');
  });

  it('prefers preview text and falls back to value text when preview is missing', () => {
    expect(getDescriptionPreviewText({ preview: 'Saved Preview', value: '<p>Ignored</p>' })).toBe(
      'Saved Preview'
    );

    const fallback = getDescriptionPreviewText({
      preview: '',
      value: '<p>Fallback from value text for older payloads</p>',
    });
    expect(fallback.startsWith('Fallback from value text')).toBe(true);
    expect(
      getDescriptionPreviewText({
        preview: '',
        value: 'Visit [the index](https://podcastindex.org) for **more**.',
      })
    ).toBe('Visit the index for more.');
    expect(isDescriptionTruncated({ is_truncated: true })).toBe(true);
    expect(isDescriptionTruncated({ is_truncated: false })).toBe(false);
  });
});
