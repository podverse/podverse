import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { MediaElementBridge } from '../../hooks/useMediaElementBridge';
import type { MediaPlayerControlsContextValue } from '../MediaPlayerControls';
import {
  MediaPlayerControlsProvider,
  noopMediaElementBridge,
  useMediaPlayerControls,
  useRegisterMediaPlayerControlsBridge,
} from '../MediaPlayerControls';

function makeBridge(seek: MediaElementBridge['seek']): MediaElementBridge {
  return { ...noopMediaElementBridge, seek };
}

function Registrar({ bridge }: { bridge: MediaElementBridge }): null {
  useRegisterMediaPlayerControlsBridge(bridge);
  return null;
}

describe('MediaPlayerControlsProvider', () => {
  it('reports a detached no-op bridge when nothing is registered', () => {
    let captured: MediaPlayerControlsContextValue | null = null;
    function Consumer(): null {
      captured = useMediaPlayerControls();
      return null;
    }

    render(
      <MediaPlayerControlsProvider>
        <Consumer />
      </MediaPlayerControlsProvider>
    );

    expect(captured).not.toBeNull();
    expect(captured?.isAttached).toBe(false);
    expect(captured?.seek).toBe(noopMediaElementBridge.seek);
  });

  it('falls back to the first registrant when the most recent one unmounts', () => {
    const seekA = vi.fn();
    const seekB = vi.fn();
    const bridgeA = makeBridge(seekA);
    const bridgeB = makeBridge(seekB);

    let captured: MediaPlayerControlsContextValue | null = null;
    function Consumer(): null {
      captured = useMediaPlayerControls();
      return null;
    }

    function Tree({ showB }: { showB: boolean }): ReactElement {
      return (
        <MediaPlayerControlsProvider>
          <Registrar bridge={bridgeA} />
          {showB ? <Registrar bridge={bridgeB} /> : null}
          <Consumer />
        </MediaPlayerControlsProvider>
      );
    }

    const { rerender } = render(<Tree showB={true} />);

    // Most recently registered bridge (the video orchestrator analogue) owns the controls.
    expect(captured?.isAttached).toBe(true);
    captured?.seek(5);
    expect(seekB).toHaveBeenCalledWith(5);
    expect(seekA).not.toHaveBeenCalled();

    // Unmounting the top registrant must not strand the controls on the no-op bridge; it should
    // fall back to the still-mounted first registrant (the audio orchestrator analogue).
    rerender(<Tree showB={false} />);

    expect(captured?.isAttached).toBe(true);
    expect(captured?.seek).not.toBe(noopMediaElementBridge.seek);
    captured?.seek(7);
    expect(seekA).toHaveBeenCalledWith(7);
  });

  it('detaches once every registrant unmounts', () => {
    const seekA = vi.fn();
    const bridgeA = makeBridge(seekA);

    let captured: MediaPlayerControlsContextValue | null = null;
    function Consumer(): null {
      captured = useMediaPlayerControls();
      return null;
    }

    function Tree({ showA }: { showA: boolean }): ReactElement {
      return (
        <MediaPlayerControlsProvider>
          {showA ? <Registrar bridge={bridgeA} /> : null}
          <Consumer />
        </MediaPlayerControlsProvider>
      );
    }

    const { rerender } = render(<Tree showA={true} />);
    expect(captured?.isAttached).toBe(true);

    rerender(<Tree showA={false} />);
    expect(captured?.isAttached).toBe(false);
    expect(captured?.seek).toBe(noopMediaElementBridge.seek);
  });
});
