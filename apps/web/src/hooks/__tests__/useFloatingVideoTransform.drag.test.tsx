import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MediaPlayerVideoProvider } from '../../contexts/MediaPlayerVideo';
import { useFloatingVideoTransform } from '../useFloatingVideoTransform';

const consumeClickResults: boolean[] = [];

type ProbeProps = {
  width?: number;
  height?: number;
};

function FloatingVideoDragProbe({ width = 400, height = 225 }: ProbeProps) {
  const portalRef = useRef<HTMLDivElement>(null);
  const { containerStyle, dragHandleProps, isDragging, dragEnabled, consumeClickAfterDrag } =
    useFloatingVideoTransform(portalRef);

  return (
    <div
      ref={portalRef}
      data-testid="portal"
      data-dragging={isDragging ? 'true' : 'false'}
      data-drag-enabled={dragEnabled ? 'true' : 'false'}
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
      <button type="button" data-floating-video-ignore-drag data-testid="ignore-drag">
        Close
      </button>
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

function pointerEvent(type: string, target: HTMLElement, init: PointerEventInit): PointerEvent {
  const event = new PointerEvent(type, { bubbles: true, cancelable: true, ...init });
  // Wrap dispatch in act() so React commits state-driven style updates before assertions read the DOM.
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

function renderDragProbe(props?: ProbeProps) {
  render(
    <MediaPlayerVideoProvider>
      <FloatingVideoDragProbe {...props} />
    </MediaPlayerVideoProvider>
  );
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

describe('useFloatingVideoTransform drag', () => {
  it('updates position and containerStyle while dragging on fine pointer', async () => {
    renderDragProbe();
    const portal = screen.getByTestId('portal');
    await waitFor(() => {
      expect(portal.dataset.dragEnabled).toBe('true');
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

    pointerEvent('pointerdown', portal, {
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 900,
      clientY: 650,
    });
    pointerEvent('pointermove', portal, {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: 700,
      clientY: 550,
    });
    pointerEvent('pointerup', portal, {
      pointerId: 1,
      pointerType: 'mouse',
    });

    expect(portal.style.left).toBe('600px');
    expect(portal.style.top).toBe('500px');
    expect(portal.style.right).toBe('auto');
    expect(portal.style.bottom).toBe('auto');
    expect(portal.dataset.dragging).toBe('false');
  });

  it('clamps drag position to the viewport edges', async () => {
    renderDragProbe();
    const portal = screen.getByTestId('portal');
    await waitFor(() => {
      expect(portal.dataset.dragEnabled).toBe('true');
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

    pointerEvent('pointerdown', portal, {
      pointerId: 2,
      pointerType: 'mouse',
      button: 0,
      clientX: 900,
      clientY: 650,
    });
    pointerEvent('pointermove', portal, {
      pointerId: 2,
      pointerType: 'mouse',
      clientX: -50,
      clientY: -50,
    });
    pointerEvent('pointerup', portal, {
      pointerId: 2,
      pointerType: 'mouse',
    });

    expect(portal.style.left).toBe('0px');
    expect(portal.style.top).toBe('0px');
  });

  it('does not start drag when pointerdown originates on ignore-drag chrome', async () => {
    renderDragProbe();
    const portal = screen.getByTestId('portal');
    const closeButton = screen.getByTestId('ignore-drag');
    await waitFor(() => {
      expect(portal.dataset.dragEnabled).toBe('true');
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

    pointerEvent('pointerdown', closeButton, {
      pointerId: 3,
      pointerType: 'mouse',
      button: 0,
      clientX: 810,
      clientY: 610,
    });

    expect(portal.style.left).toBe('');
    expect(portal.style.top).toBe('');
    expect(portal.dataset.dragging).toBe('false');
  });

  it('ignores touch pointerdown and leaves position at the default anchor', () => {
    renderDragProbe();
    const portal = screen.getByTestId('portal');

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
      pointerId: 4,
      pointerType: 'touch',
      button: 0,
      clientX: 900,
      clientY: 650,
    });
    pointerEvent('pointermove', portal, {
      pointerId: 4,
      pointerType: 'touch',
      clientX: 700,
      clientY: 550,
    });

    expect(portal.style.left).toBe('');
    expect(portal.style.top).toBe('');
    expect(portal.style.right).toBe('0px');
    expect(portal.style.bottom).toBe('0px');
  });

  it('does not reposition or suppress click for pointerdown without movement past threshold', async () => {
    renderDragProbe();
    const portal = screen.getByTestId('portal');
    const consumeButton = screen.getByTestId('consume-click');
    await waitFor(() => {
      expect(portal.dataset.dragEnabled).toBe('true');
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

    pointerEvent('pointerdown', portal, {
      pointerId: 5,
      pointerType: 'mouse',
      button: 0,
      clientX: 900,
      clientY: 650,
    });
    pointerEvent('pointerup', portal, {
      pointerId: 5,
      pointerType: 'mouse',
    });

    expect(portal.style.left).toBe('');
    expect(portal.style.top).toBe('');
    consumeButton.click();
    expect(consumeClickResults).toEqual([false]);
  });

  it('suppresses the next click after a completed drag gesture', async () => {
    renderDragProbe();
    const portal = screen.getByTestId('portal');
    const consumeButton = screen.getByTestId('consume-click');
    await waitFor(() => {
      expect(portal.dataset.dragEnabled).toBe('true');
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

    pointerEvent('pointerdown', portal, {
      pointerId: 6,
      pointerType: 'mouse',
      button: 0,
      clientX: 900,
      clientY: 650,
    });
    pointerEvent('pointermove', portal, {
      pointerId: 6,
      pointerType: 'mouse',
      clientX: 700,
      clientY: 550,
    });
    pointerEvent('pointerup', portal, {
      pointerId: 6,
      pointerType: 'mouse',
    });

    consumeButton.click();
    expect(consumeClickResults).toEqual([true]);
    consumeButton.click();
    expect(consumeClickResults).toEqual([true, false]);
  });
});
