import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DescriptionRenderer } from './DescriptionRenderer';

afterEach(() => {
  cleanup();
});

describe('DescriptionRenderer', () => {
  it('renders plain text in a paragraph when markup does not parse', () => {
    render(<DescriptionRenderer description="Plain copy." />);
    const text = screen.getByText('Plain copy.');
    expect(text.closest('p')).not.toBeNull();
  });

  it('renders a rich link when the markup is balanced', () => {
    render(<DescriptionRenderer description='<p>See <a href="https://example.com">here</a></p>' />);
    const link = screen.getByRole('link', { name: 'here' });
    expect(link.getAttribute('href')).toBe('https://example.com');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('falls back to plain text when a tag is unclosed', () => {
    render(<DescriptionRenderer description="<p>Hello <strong>world" />);
    expect(screen.getByText('Hello world').tagName).toBe('P');
    expect(screen.queryByRole('strong')).toBeNull();
  });

  it('does not turn a javascript href into a link', () => {
    render(<DescriptionRenderer description='<p><a href="javascript:alert(1)">bad</a></p>' />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('bad')).toBeTruthy();
  });
});
