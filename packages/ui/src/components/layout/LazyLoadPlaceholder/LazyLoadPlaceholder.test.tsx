import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { LazyLoadPlaceholder } from './LazyLoadPlaceholder';

afterEach(() => {
  cleanup();
});

describe('LazyLoadPlaceholder', () => {
  it('renders a status region with the given aria label', () => {
    render(<LazyLoadPlaceholder ariaLabel="Loading content" />);
    const region = screen.getByRole('status', { name: 'Loading content' });
    expect(region.getAttribute('aria-live')).toBe('polite');
  });

  it('merges className onto the placeholder', () => {
    const { container } = render(<LazyLoadPlaceholder ariaLabel="Wait" className="extra" />);
    const root = container.firstElementChild;
    expect(root?.classList.contains('extra')).toBe(true);
  });
});
