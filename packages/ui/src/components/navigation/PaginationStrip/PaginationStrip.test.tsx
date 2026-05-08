import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PaginationStrip } from './PaginationStrip';

afterEach(() => {
  cleanup();
});

describe('PaginationStrip', () => {
  it('renders page numbers and nav labels', () => {
    render(
      <PaginationStrip
        currentPage={2}
        maxButtons={5}
        nextAriaLabel="Next"
        onPageChange={() => {}}
        prevAriaLabel="Prev"
        totalPages={10}
      />
    );

    expect(screen.getByRole('button', { name: 'Prev' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next' })).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });
});
