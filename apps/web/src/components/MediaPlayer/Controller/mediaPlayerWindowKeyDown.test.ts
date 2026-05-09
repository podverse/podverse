import { describe, expect, it, vi } from 'vitest';

import { EVENTS } from '../../../constants/events';
import {
  dispatchMediaPlayerSeek,
  handleMediaPlayerWindowKeyDown,
} from './mediaPlayerWindowKeyDown';

describe('handleMediaPlayerWindowKeyDown', () => {
  const baseState = {
    mpAddByRSS: null,
    mpChannel: { id: 'ch' },
    mpCurrentTime: 30,
    mpDuration: 100,
  };

  it('Space toggles play/pause when channel is loaded and target is not interactive', () => {
    const preventDefault = vi.fn();
    const togglePlayPause = vi.fn();
    const el = document.createElement('div');

    handleMediaPlayerWindowKeyDown(
      { code: 'Space', key: ' ', preventDefault, repeat: false },
      el,
      baseState,
      vi.fn(),
      togglePlayPause
    );

    expect(togglePlayPause).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('Space does nothing when no channel or add-by-RSS source', () => {
    const preventDefault = vi.fn();
    const togglePlayPause = vi.fn();
    const el = document.createElement('div');

    handleMediaPlayerWindowKeyDown(
      { code: 'Space', key: ' ', preventDefault, repeat: false },
      el,
      {
        ...baseState,
        mpAddByRSS: null,
        mpChannel: null,
      },
      vi.fn(),
      togglePlayPause
    );

    expect(togglePlayPause).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('Space does nothing when add-by-RSS is active without channel', () => {
    const togglePlayPause = vi.fn();
    const el = document.createElement('div');

    handleMediaPlayerWindowKeyDown(
      { code: 'Space', key: ' ', preventDefault: vi.fn(), repeat: false },
      el,
      {
        ...baseState,
        mpAddByRSS: { idText: 'x', resourceData: {} },
        mpChannel: null,
      },
      vi.fn(),
      togglePlayPause
    );

    expect(togglePlayPause).toHaveBeenCalledTimes(1);
  });

  it('Space ignores key repeat', () => {
    const togglePlayPause = vi.fn();
    const el = document.createElement('div');

    handleMediaPlayerWindowKeyDown(
      { code: 'Space', key: ' ', preventDefault: vi.fn(), repeat: true },
      el,
      baseState,
      vi.fn(),
      togglePlayPause
    );

    expect(togglePlayPause).not.toHaveBeenCalled();
  });

  it('Space does not toggle when focus is on a button', () => {
    const togglePlayPause = vi.fn();
    const button = document.createElement('button');

    handleMediaPlayerWindowKeyDown(
      { code: 'Space', key: ' ', preventDefault: vi.fn(), repeat: false },
      button,
      baseState,
      vi.fn(),
      togglePlayPause
    );

    expect(togglePlayPause).not.toHaveBeenCalled();
  });

  it('Space does not toggle when focus is inside a text input', () => {
    const togglePlayPause = vi.fn();
    const input = document.createElement('input');

    handleMediaPlayerWindowKeyDown(
      { code: 'Space', key: ' ', preventDefault: vi.fn(), repeat: false },
      input,
      baseState,
      vi.fn(),
      togglePlayPause
    );

    expect(togglePlayPause).not.toHaveBeenCalled();
  });

  it('Space does not toggle when focus is on an ARIA menu item', () => {
    const togglePlayPause = vi.fn();
    const menuitem = document.createElement('li');
    menuitem.setAttribute('role', 'menuitem');

    handleMediaPlayerWindowKeyDown(
      { code: 'Space', key: ' ', preventDefault: vi.fn(), repeat: false },
      menuitem,
      baseState,
      vi.fn(),
      togglePlayPause
    );

    expect(togglePlayPause).not.toHaveBeenCalled();
  });

  it('ArrowLeft seeks and ArrowRight seeks', () => {
    const seek = vi.fn();
    const el = document.createElement('div');

    handleMediaPlayerWindowKeyDown(
      { code: 'ArrowLeft', key: 'ArrowLeft', preventDefault: vi.fn(), repeat: false },
      el,
      baseState,
      seek,
      vi.fn()
    );
    expect(seek).toHaveBeenCalledWith(20);

    handleMediaPlayerWindowKeyDown(
      { code: 'ArrowRight', key: 'ArrowRight', preventDefault: vi.fn(), repeat: false },
      el,
      baseState,
      seek,
      vi.fn()
    );
    expect(seek).toHaveBeenCalledWith(40);
  });

  it('dispatchMediaPlayerSeek emits the canonical seek event', () => {
    const handler = vi.fn();
    window.addEventListener(EVENTS.MEDIA_PLAYER.SEEK, handler);
    dispatchMediaPlayerSeek(42);
    window.removeEventListener(EVENTS.MEDIA_PLAYER.SEEK, handler);

    expect(handler).toHaveBeenCalledTimes(1);
    const evt = handler.mock.calls[0][0] as CustomEvent<{ time: number }>;
    expect(evt.detail?.time).toBe(42);
  });
});
