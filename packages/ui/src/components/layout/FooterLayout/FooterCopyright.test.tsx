import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { FooterBrandLinkProps } from './FooterBrand';
import { FooterCopyright } from './FooterCopyright';

afterEach(() => {
  cleanup();
});

describe('FooterCopyright', () => {
  it('renders label and default anchor', () => {
    render(<FooterCopyright href="/license" label="Open Source" />);

    const link = screen.getByRole('link', { name: /Open Source/i });
    expect(link.getAttribute('href')).toBe('/license');
  });

  it('uses LinkComponent when provided', () => {
    const LinkStub = ({ href, children, className }: FooterBrandLinkProps) => (
      <a data-testid="stub-link" href={href} className={className}>
        {children}
      </a>
    );

    render(<FooterCopyright href="/x" label="Notice" LinkComponent={LinkStub} />);

    const link = screen.getByTestId('stub-link');
    expect(link.getAttribute('href')).toBe('/x');
    expect(link.textContent).toContain('Notice');
  });
});
