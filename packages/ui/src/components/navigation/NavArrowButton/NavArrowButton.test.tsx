import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NavArrowButton } from './NavArrowButton';

afterEach(() => {
  cleanup();
});

describe('NavArrowButton', () => {
  it('renders with aria-label', () => {
    const onClick = vi.fn();
    render(<NavArrowButton ariaLabel="Previous page" direction="left" onClick={onClick} />);

    expect(screen.getByRole('button', { name: 'Previous page' })).toBeTruthy();
  });
});
