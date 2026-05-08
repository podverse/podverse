import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DescriptionRenderer, isHtmlString, SafeHtmlDescription } from './DescriptionRenderer';

afterEach(() => {
  cleanup();
});

describe('isHtmlString', () => {
  it('detects HTML markup', () => {
    expect(isHtmlString('<p>a</p>')).toBe(true);
    expect(isHtmlString('<div>')).toBe(true);
  });

  it('returns false for plain text', () => {
    expect(isHtmlString('hello')).toBe(false);
    expect(isHtmlString('a < b')).toBe(false);
  });
});

describe('SafeHtmlDescription', () => {
  it('sanitizes and renders allowed markup', () => {
    render(<SafeHtmlDescription html="<p>x</p><script>bad()</script>" />);
    expect(screen.getByText('x')).toBeTruthy();
    expect(document.body.textContent).not.toContain('bad()');
  });
});

describe('DescriptionRenderer', () => {
  it('renders plain text in a paragraph when not HTML', () => {
    render(<DescriptionRenderer description="Plain copy." />);
    const p = screen.getByText('Plain copy.');
    expect(p.tagName).toBe('P');
  });

  it('renders sanitized HTML when the string looks like markup', () => {
    render(<DescriptionRenderer description="<p>Rich</p>" />);
    expect(screen.getByText('Rich')).toBeTruthy();
  });
});
