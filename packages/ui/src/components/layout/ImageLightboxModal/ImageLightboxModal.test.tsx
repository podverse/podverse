import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
import { ImageLightboxModal } from './ImageLightboxModal';

const defaultRuntime = {
  imageProxyEnabled: true,
  nextImageOptimizationEnabled: false,
  listGridSlotSize: 600,
  placeholderSrc: '/placeholder.png',
  proxyPathPrefix: '/api/proxy?url=',
} as const;

function renderLightbox(ui: ReactElement) {
  return render(<ImageRuntimeProvider {...defaultRuntime}>{ui}</ImageRuntimeProvider>);
}

afterEach(() => {
  cleanup();
});

describe('ImageLightboxModal', () => {
  it('renders nothing when isOpen is false', () => {
    renderLightbox(
      <ImageLightboxModal
        alt="Artwork"
        ariaLabel="Preview"
        candidates={['https://example.com/a.jpg']}
        closeButtonAriaLabel="Close"
        isOpen={false}
        onClose={() => {}}
      />
    );

    expect(screen.queryByRole('dialog', { name: 'Preview' })).toBeNull();
  });

  it('renders dialog with close control when open', () => {
    const onClose = vi.fn();

    renderLightbox(
      <ImageLightboxModal
        alt="Episode artwork"
        ariaLabel="Image preview"
        candidates={['https://example.com/a.jpg']}
        closeButtonAriaLabel="Close preview"
        isOpen
        onClose={onClose}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Image preview' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close preview' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
