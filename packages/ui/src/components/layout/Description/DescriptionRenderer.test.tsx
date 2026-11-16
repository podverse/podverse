import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DescriptionRenderer } from './DescriptionRenderer';

afterEach(() => {
  cleanup();
});

describe('DescriptionRenderer', () => {
  it('renders a plain sentence in a paragraph', () => {
    render(<DescriptionRenderer description="Plain copy." />);
    const text = screen.getByText('Plain copy.');
    expect(text.closest('p')).not.toBeNull();
  });

  it('renders stored markdown as a heading, a link, and a list', () => {
    render(
      <DescriptionRenderer
        description={[
          '## Show Notes',
          '',
          'Visit [the index](https://podcastindex.org).',
          '',
          '- Chapters',
          '- Transcripts',
        ].join('\n')}
      />
    );

    expect(screen.getByRole('heading', { name: 'Show Notes' }).tagName).toBe('H2');
    expect(screen.getByRole('link', { name: 'the index' }).getAttribute('href')).toBe(
      'https://podcastindex.org'
    );
    expect(screen.getByRole('listitem', { name: 'Chapters' })).toBeTruthy();
    expect(screen.getByRole('listitem', { name: 'Transcripts' })).toBeTruthy();
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

  it('leaves a clock as plain text until a seek handler is provided', () => {
    render(<DescriptionRenderer description="<p>Start at 1:23.</p>" />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByRole('paragraph').textContent).toBe('Start at 1:23.');
  });

  it('links each clock in an item description and leaves a clock inside a link', () => {
    const onDescriptionClock = vi.fn();
    render(
      <DescriptionRenderer
        description='<p>Hear 12:34 - 18:02 or <a href="https://example.com">1:05</a>.</p>'
        descriptionClockLabel={(clockText) => `Play from ${clockText}`}
        onDescriptionClock={onDescriptionClock}
      />
    );

    const first = screen.getByRole('button', { name: 'Play from 12:34' });
    const second = screen.getByRole('button', { name: 'Play from 18:02' });
    expect(first.textContent).toBe('12:34');
    expect(second.textContent).toBe('18:02');
    first.click();
    expect(onDescriptionClock).toHaveBeenCalledWith(754);
    expect(screen.getByRole('link', { name: '1:05' }).getAttribute('href')).toBe(
      'https://example.com'
    );
    expect(screen.queryByRole('button', { name: 'Play from 1:05' })).toBeNull();
  });
});
