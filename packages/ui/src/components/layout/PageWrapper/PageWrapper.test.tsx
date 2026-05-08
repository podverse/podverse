import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PageWrapper } from './PageWrapper';

afterEach(() => {
  cleanup();
});

describe('PageWrapper', () => {
  it('renders children inside #page-wrapper', () => {
    render(
      <PageWrapper>
        <span>main content</span>
      </PageWrapper>
    );
    const root = document.getElementById('page-wrapper');
    expect(root).not.toBeNull();
    expect(screen.getByText('main content')).toBeTruthy();
  });

  it('merges optional className', () => {
    render(
      <PageWrapper className="extra">
        <span>x</span>
      </PageWrapper>
    );
    const root = document.getElementById('page-wrapper');
    expect(root?.classList.contains('extra')).toBe(true);
  });
});
