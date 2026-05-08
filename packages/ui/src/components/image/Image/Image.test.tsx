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

import { ImageRuntimeProvider } from '../ImageRuntime/ImageRuntime';
import { Image } from './Image';

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

describe('Image', () => {
  it('renders placeholder artwork when src is empty', () => {
    renderWithRuntime(<Image alt="Episode" height={64} src={null} width={64} />);

    expect(screen.getByTestId('next-image').getAttribute('src')).toBe('/placeholder.png');
  });

  it('prefixes remote URL when image proxy is enabled', () => {
    renderWithRuntime(
      <Image alt="Episode" height={64} src="https://cdn.example.com/a.jpg" width={64} />
    );

    expect(screen.getByTestId('next-image').getAttribute('src')).toBe(
      `/api/proxy?url=${encodeURIComponent('https://cdn.example.com/a.jpg')}`
    );
  });

  it('uses raw URL when skipProxy is true', () => {
    renderWithRuntime(
      <Image alt="Episode" height={64} skipProxy src="https://cdn.example.com/a.jpg" width={64} />
    );

    expect(screen.getByTestId('next-image').getAttribute('src')).toBe(
      'https://cdn.example.com/a.jpg'
    );
  });

  it('uses raw URL when proxy is disabled', () => {
    render(
      <ImageRuntimeProvider {...defaultRuntime} imageProxyEnabled={false}>
        <Image alt="Episode" height={64} src="https://cdn.example.com/a.jpg" width={64} />
      </ImageRuntimeProvider>
    );

    expect(screen.getByTestId('next-image').getAttribute('src')).toBe(
      'https://cdn.example.com/a.jpg'
    );
  });

  it('sets unoptimized when Next image optimization is disabled in runtime', () => {
    renderWithRuntime(
      <Image alt="Episode" height={64} src="https://cdn.example.com/a.jpg" width={64} />
    );

    expect(screen.getByTestId('next-image').getAttribute('data-unoptimized')).toBe('true');
  });

  it('clears unoptimized when Next image optimization is enabled in runtime', () => {
    render(
      <ImageRuntimeProvider {...defaultRuntime} nextImageOptimizationEnabled>
        <Image alt="Episode" height={64} src="https://cdn.example.com/a.jpg" width={64} />
      </ImageRuntimeProvider>
    );

    expect(screen.getByTestId('next-image').getAttribute('data-unoptimized')).toBe('false');
  });

  it('applies unoptimized to placeholder Next image when optimization is disabled', () => {
    renderWithRuntime(<Image alt="Episode" height={64} src={null} width={64} />);

    expect(screen.getByTestId('next-image').getAttribute('data-unoptimized')).toBe('true');
  });
});
