import { cleanup, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/image', () => ({
  default: function MockNextImage(props: { alt: string; src: string; unoptimized?: boolean }) {
    return (
      <img
        alt={props.alt}
        data-testid="next-image"
        data-unoptimized={props.unoptimized === true ? 'true' : 'false'}
        src={props.src}
      />
    );
  },
}));

import { ImageRuntimeProvider } from '../../image/ImageRuntime/ImageRuntime';
import type { FooterBrandLinkProps } from './FooterBrand';
import { FooterBrand } from './FooterBrand';

const defaultRuntime = {
  imageProxyEnabled: true,
  nextImageOptimizationEnabled: false,
  listGridSlotSize: 600,
  placeholderSrc: '/placeholder.png',
  proxyPathPrefix: '/api/proxy?url=',
} as const;

function renderWithRuntime(ui: ReactElement) {
  return render(<ImageRuntimeProvider {...defaultRuntime}>{ui}</ImageRuntimeProvider>);
}

afterEach(() => {
  cleanup();
});

describe('FooterBrand', () => {
  it('renders logo inside default anchor with href', () => {
    renderWithRuntime(
      <FooterBrand alt="Brand" href="/home" logoSrc="https://cdn.example.com/logo.png" />
    );

    const link = screen.getByRole('link', { name: 'Brand' });
    expect(link.getAttribute('href')).toBe('/home');
    expect(screen.getByTestId('next-image').getAttribute('src')).toBe(
      '/api/proxy?url=' + encodeURIComponent('https://cdn.example.com/logo.png')
    );
    expect(screen.getByTestId('next-image').getAttribute('data-unoptimized')).toBe('true');
  });

  it('uses LinkComponent when provided', () => {
    const LinkStub = ({ href, children, className }: FooterBrandLinkProps) => (
      <a data-testid="stub-link" href={href} className={className}>
        {children}
      </a>
    );

    renderWithRuntime(
      <FooterBrand
        alt="Co"
        LinkComponent={LinkStub}
        logoSrc="https://cdn.example.com/x.png"
        skipProxy
      />
    );

    const link = screen.getByTestId('stub-link');
    expect(link.getAttribute('href')).toBe('/');
    expect(screen.getByTestId('next-image').getAttribute('src')).toBe(
      'https://cdn.example.com/x.png'
    );
  });
});
