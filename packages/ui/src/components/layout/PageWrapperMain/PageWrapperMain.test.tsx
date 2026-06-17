import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { PageWrapperMain } from './PageWrapperMain';

afterEach(() => {
  cleanup();
});

describe('PageWrapperMain', () => {
  it('renders children', () => {
    render(
      <PageWrapperMain>
        <span>route content</span>
      </PageWrapperMain>
    );
    expect(screen.getByText('route content')).toBeTruthy();
  });

  it('merges optional className', () => {
    const { container } = render(
      <PageWrapperMain className="extra">
        <span>x</span>
      </PageWrapperMain>
    );
    const root = container.firstElementChild;
    expect(root?.classList.contains('extra')).toBe(true);
  });
});
