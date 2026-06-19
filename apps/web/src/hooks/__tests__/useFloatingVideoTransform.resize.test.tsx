import { useRef } from 'react';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useFloatingVideoTransform } from '../useFloatingVideoTransform';

const consumeClickResults: boolean[] = [];

type ProbeProps = {
  width?: number;
  height?: number;
};

function FloatingVideoResizeProbe({ width = 400, height = 225 }: ProbeProps) {
  const portalRef = useRef<HTMLDivElement>(null);
  const {
    containerStyle,
    dragHandleProps,
    resizeHandleProps,
    isResizing,
    resizeEnabled,
    consumeClickAfterDrag,
  } = useFloatingVideoTransform(portalRef);

  return (
    <div
      ref={portalRef}
      data-testid="portal"
      data-resizing={isResizing ? 'true' : 'false'}
      data-resize-enabled={resizeEnabled ? 'true' : 'false'}
      style={{
        position: 'fixed',
        right: 0,
        bottom: 0,
        width,
        height,
        ...containerStyle,
      }}
      {...dragHandleProps}
    >
      {resizeEnabled && (
        <div
          data-testid="resize-handle"
          data-floating-video-ignore-drag
          {...resizeHandleProps}
        />
      )}
      <button
        type="button"
        data-testid="consume-click"
        onClick={() => {
          consumeClickResults.push(consumeClickAfterDrag());
        }}
      >
        Consume
      </button>
    </div>
  );
}

function mockBoundingClientRect(element: HTMLElement, rect: DOMRect): void {
  element.getBoundingClientRect = () => rect;
}

function pointerEvent(
  type: string,
  target: HTMLElement,
  init: PointerEventInit
): PointerEvent {
  const event = new PointerEvent(type, { bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

beforeEach(() => {
  consumeClickResults.length = 0;
  vi.stubGlobal('innerWidth', 1200);
  vi.stubGlobal('innerHeight', 900);

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(pointer: fine)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = vi.fn();
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn().mockReturnValue(true);
  }
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useFloatingVideoTransform resize', () => {
  it('increases size and updates position when dragging the top-left handle up-left', async () => {
    render(<FloatingVideoResizeProbe />);
    const portal = screen.getByTestId('portal');
    const handle = screen.getByTestId('resize-handle');
    await waitFor(() => {
      expect(portal.dataset.resizeEnabled).toBe('true');
    });

    mockBoundingClientRect(portal, {
      left: 800,
      top: 600,
      width: 400,
      height: 225,
      right: 1200,
      bottom: 825,
      x: 800,
      y: 600,
      toJSON: () => ({}),
    } as DOMRect);

    pointerEvent('pointerdown', handle, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 800,
      clientY: 600,
    });
    pointerEvent('pointermove', handle, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 700,
      clientY: 600,
    });
    pointerEvent('pointerup', handle, {
      pointerId: 1,
      pointerType: 'mouse',
    });

    expect(Number.parseFloat(portal.style.width)).toBeGreaterThan(400);
    expect(Number.parseFloat(portal.style.height)).toBeGreaterThan(225);
    expect(portal.style.left).not.toBe('');
    expect(portal.style.top).not.toBe('');
    expect(portal.dataset.resizing).toBe('false');
  });

  it('preserves aspect ratio during resize', async () => {
    render(<FloatingVideoResizeProbe width={400} height={225} />);
    const portal = screen.getByTestId('portal');
    const handle = screen.getByTestId('resize-handle');
    await waitFor(() => {
      expect(portal.dataset.resizeEnabled).toBe('true');
    });

    mockBoundingClientRect(portal, {
      left: 800,
      top: 600,
      width: 400,
      height: 225,
      right: 1200,
      bottom: 825,
      x: 800,
      y: 600,
      toJSON: () => ({}),
    } as DOMRect);

    pointerEvent('pointerdown', handle, {
      pointerId: 2,
      pointerType: 'mouse',
      button: 0,
      clientX: 800,
      clientY: 600,
    });
    pointerEvent('pointermove', handle, {
      pointerId: 2,
      pointerType: 'mouse',
      clientX: 750,
      clientY: 600,
    });
    pointerEvent('pointerup', handle, {
      pointerId: 2,
      pointerType: 'mouse',
    });

    const width = Number.parseFloat(portal.style.width);
    const height = Number.parseFloat(portal.style.height);
    const aspectRatio = width / height;
    expect(aspectRatio).toBeCloseTo(400 / 225, 1);
  });

  it('ignores resize pointerdown when resizeEnabled is false', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(<FloatingVideoResizeProbe />);
    const portal = screen.getByTestId('portal');
    expect(screen.queryByTestId('resize-handle')).toBeNull();

    mockBoundingClientRect(portal, {
      left: 800,
      top: 600,
      width: 400,
      height: 225,
      right: 1200,
      bottom: 825,
      x: 800,
      y: 600,
      toJSON: () => ({}),
    } as DOMRect);

    pointerEvent('pointerdown', portal, {
      pointerId: 3,
      pointerType: 'mouse',
      button: 0,
      clientX: 800,
      clientY: 600,
    });

    expect(portal.style.width).toBe('400px');
    expect(portal.style.height).toBe('225px');
  });

  it('clamps resize width to minimum', async () => {
    render(<FloatingVideoResizeProbe />);
    const portal = screen.getByTestId('portal');
    const handle = screen.getByTestId('resize-handle');
    await waitFor(() => {
      expect(portal.dataset.resizeEnabled).toBe('true');
    });

    mockBoundingClientRect(portal, {
      left: 800,
      top: 600,
      width: 400,
      height: 225,
      right: 1200,
      bottom: 825,
      x: 800,
      y: 600,
      toJSON: () => ({}),
    } as DOMRect);

    pointerEvent('pointerdown', handle, {
      pointerId: 4,
      pointerType: 'mouse',
      button: 0,
      clientX: 800,
      clientY: 600,
    });
    pointerEvent('pointermove', handle, {
      pointerId: 4,
      pointerType: 'mouse',
      clientX: 1190,
      clientY: 600,
    });
    pointerEvent('pointerup', handle, {
      pointerId: 4,
      pointerType: 'mouse',
    });

    expect(Number.parseFloat(portal.style.width)).toBe(200);
  });

  it('suppresses the next click after a completed resize gesture', async () => {
    render(<FloatingVideoResizeProbe />);
    const portal = screen.getByTestId('portal');
    const handle = screen.getByTestId('resize-handle');
    const consumeButton = screen.getByTestId('consume-click');
    await waitFor(() => {
      expect(portal.dataset.resizeEnabled).toBe('true');
    });

    mockBoundingClientRect(portal, {
      left: 800,
      top: 600,
      width: 400,
      height: 225,
      right: 1200,
      bottom: 825,
      x: 800,
      y: 600,
      toJSON: () => ({}),
    } as DOMRect);

    pointerEvent('pointerdown', handle, {
      pointerId: 5,
      pointerType: 'mouse',
      button: 0,
      clientX: 800,
      clientY: 600,
    });
    pointerEvent('pointermove', handle, {
      pointerId: 5,
      pointerType: 'mouse',
      clientX: 750,
      clientY: 600,
    });
    pointerEvent('pointerup', handle, {
      pointerId: 5,
      pointerType: 'mouse',
    });

    consumeButton.click();
    expect(consumeClickResults).toEqual([true]);
    consumeButton.click();
    expect(consumeClickResults).toEqual([true, false]);
  });
});
