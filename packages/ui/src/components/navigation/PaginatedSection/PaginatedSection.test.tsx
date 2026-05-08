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
        nextAriaLabel="Next page"
        onPageChange={() => {}}
        prevAriaLabel="Previous page"
        totalPages={1}
      >
        <span>List body</span>
      </PaginatedSection>
    );

    expect(screen.getByText('List body')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Previous page' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next page' })).toBeNull();
  });

  it('renders PaginationStrip when totalPages is greater than 1 and forwards aria labels', () => {
    const onPageChange = vi.fn();

    render(
      <PaginatedSection
        currentPage={2}
        nextAriaLabel="Next page"
        onPageChange={onPageChange}
        prevAriaLabel="Previous page"
        totalPages={5}
      >
        <span>Items</span>
      </PaginatedSection>
    );

    expect(screen.getByText('Items')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next page' })).toBeTruthy();
  });
});
