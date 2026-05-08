import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FilterTablePageLayout } from './FilterTablePageLayout';

describe('FilterTablePageLayout', () => {
  it('renders error with role alert when error is set', () => {
    render(
      <FilterTablePageLayout error="Something failed" title="Users">
        <p>Content</p>
      </FilterTablePageLayout>
    );

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Something failed');
  });
});
