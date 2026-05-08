import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ImageRuntimeProvider, useImageRuntime } from './ImageRuntime';

afterEach(() => {
  cleanup();
});

function Probe() {
  useImageRuntime();
  return null;
}

describe('ImageRuntimeProvider', () => {
  it('throws when useImageRuntime is used outside the provider', () => {
    expect(() => render(<Probe />)).toThrow(/ImageRuntimeProvider/);
  });

  it('provides runtime values to descendants', () => {
    let captured: ReturnType<typeof useImageRuntime> | null = null;

    function Capture() {
      captured = useImageRuntime();
      return null;
    }

    render(
      <ImageRuntimeProvider
        imageProxyEnabled
        listGridSlotSize={600}
        nextImageOptimizationEnabled={false}
        placeholderSrc="/p.png"
        proxyPathPrefix="/proxy"
      >
        <Capture />
      </ImageRuntimeProvider>
    );

    expect(captured).toEqual({
      imageProxyEnabled: true,
      listGridSlotSize: 600,
      nextImageOptimizationEnabled: false,
      placeholderSrc: '/p.png',
      proxyPathPrefix: '/proxy',
    });
  });

  it('exposes nextImageOptimizationEnabled when true', () => {
    let captured: ReturnType<typeof useImageRuntime> | null = null;

    function Capture() {
      captured = useImageRuntime();
      return null;
    }

    render(
      <ImageRuntimeProvider
        imageProxyEnabled={false}
        listGridSlotSize={600}
        nextImageOptimizationEnabled
        placeholderSrc="/p.png"
        proxyPathPrefix="/proxy"
      >
        <Capture />
      </ImageRuntimeProvider>
    );

    expect(captured).toEqual({
      imageProxyEnabled: false,
      listGridSlotSize: 600,
      nextImageOptimizationEnabled: true,
      placeholderSrc: '/p.png',
      proxyPathPrefix: '/proxy',
    });
  });
});
