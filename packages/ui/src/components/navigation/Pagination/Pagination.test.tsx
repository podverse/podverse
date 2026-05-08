import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Pagination } from './Pagination';

describe('Pagination', () => {
  it('renders localized labels and navigates pages', () => {
    const onPageChange = vi.fn();

    render(
      <Pagination
        currentPage={2}
        nextLabel="Next »"
        onPageChange={onPageChange}
        pageIndicatorLabel="Page 2 of 5"
        prevLabel="« Prev"
        totalPages={5}
      />
    );

    expect(screen.getByRole('button', { name: '« Prev' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Next »' })).toBeTruthy();
    expect(screen.getByText('Page 2 of 5')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Next »' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});
