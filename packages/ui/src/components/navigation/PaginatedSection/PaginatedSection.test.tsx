import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PaginatedSection } from './PaginatedSection';

afterEach(() => {
  cleanup();
});

describe('PaginatedSection', () => {
  it('renders children and hides pagination when totalPages is 1', () => {
    render(
      <PaginatedSection
        currentPage={1}
        nextAriaLabel="Next Page"
        onPageChange={() => {}}
        prevAriaLabel="Previous Page"
        totalPages={1}
      >
        <span>List body</span>
      </PaginatedSection>
    );

    expect(screen.getByText('List body')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Previous Page' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next Page' })).toBeNull();
  });

  it('renders PaginationStrip when totalPages is greater than 1 and forwards aria labels', () => {
    const onPageChange = vi.fn();

    render(
      <PaginatedSection
        currentPage={2}
        nextAriaLabel="Next Page"
        onPageChange={onPageChange}
        prevAriaLabel="Previous Page"
        totalPages={5}
      >
        <span>Items</span>
      </PaginatedSection>
    );

    expect(screen.getByText('Items')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Previous Page' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next Page' })).toBeTruthy();
  });
});
