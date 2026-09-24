import { describe, expect, it } from 'vitest';

import { readDescriptionDocument } from './descriptionDocument.js';
import { htmlToPlainText } from './html.js';

describe('readDescriptionDocument', () => {
  it('returns empty plain and null rich for blank input', () => {
    expect(readDescriptionDocument()).toEqual({ plain: '', rich: null });
    expect(readDescriptionDocument('')).toEqual({ plain: '', rich: null });
    expect(readDescriptionDocument('   ')).toEqual({ plain: '', rich: null });
  });

  it('keeps a link and bold in the rich tree', () => {
    const input = '<p>Visit <a href="https://example.com">our <strong>site</strong></a> today</p>';
    const doc = readDescriptionDocument(input);

    expect(doc.plain).toBe(htmlToPlainText(input));
    expect(doc.rich).toEqual([
      {
        kind: 'p',
        children: [
          { kind: 'text', text: 'Visit ' },
          {
            kind: 'a',
            href: 'https://example.com',
            children: [
              { kind: 'text', text: 'our ' },
              { kind: 'strong', children: [{ kind: 'text', text: 'site' }] },
            ],
          },
          { kind: 'text', text: ' today' },
        ],
      },
    ]);
  });

  it('keeps a paragraph break as a br node', () => {
    const doc = readDescriptionDocument('Line one<br/>Line two');

    expect(doc.plain).toBe('Line one Line two');
    expect(doc.rich).toEqual([
      { kind: 'text', text: 'Line one' },
      { kind: 'br' },
      { kind: 'text', text: 'Line two' },
    ]);
  });

  it('yields plain text only for an unclosed tag', () => {
    const input = '<p>Hello <strong>world';
    const doc = readDescriptionDocument(input);

    expect(doc.plain).toBe(htmlToPlainText(input));
    expect(doc.rich).toBeNull();
  });

  it('yields plain text only for a truncated tag', () => {
    const input = 'Hello <a href="https://example.com';
    const doc = readDescriptionDocument(input);

    expect(doc.plain).toBe(htmlToPlainText(input));
    expect(doc.rich).toBeNull();
  });

  it('drops a javascript href but keeps the rest of the tree', () => {
    const doc = readDescriptionDocument(
      '<p><a href="javascript:alert(1)">bad</a> and <em>good</em></p>'
    );

    expect(doc.rich).not.toBeNull();
    expect(doc.rich).toEqual([
      {
        kind: 'p',
        children: [
          { kind: 'text', text: 'bad and ' },
          { kind: 'em', children: [{ kind: 'text', text: 'good' }] },
        ],
      },
    ]);
  });

  it('unwraps div and span while keeping allowed formatting inside', () => {
    const doc = readDescriptionDocument('<div><span>Hello <b>world</b></span></div>');

    expect(doc.rich).toEqual([
      { kind: 'text', text: 'Hello ' },
      { kind: 'strong', children: [{ kind: 'text', text: 'world' }] },
    ]);
  });

  it('drops script and style contents', () => {
    const doc = readDescriptionDocument(
      '<p>Safe</p><script>bad()</script><style>.x{}</style><p>Also</p>'
    );

    expect(doc.plain).toBe('Safe Also');
    expect(doc.rich).toEqual([
      { kind: 'p', children: [{ kind: 'text', text: 'Safe' }] },
      { kind: 'p', children: [{ kind: 'text', text: 'Also' }] },
    ]);
  });

  it('aliases i and b to em and strong', () => {
    const doc = readDescriptionDocument('<p><i>italic</i> <b>bold</b></p>');

    expect(doc.rich).toEqual([
      {
        kind: 'p',
        children: [
          { kind: 'em', children: [{ kind: 'text', text: 'italic' }] },
          { kind: 'text', text: ' ' },
          { kind: 'strong', children: [{ kind: 'text', text: 'bold' }] },
        ],
      },
    ]);
  });
});
