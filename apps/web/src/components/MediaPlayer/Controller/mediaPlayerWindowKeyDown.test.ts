import { describe, expect, it, vi } from 'vitest';

import { handleMediaPlayerWindowKeyDown } from './mediaPlayerWindowKeyDown';

describe('handleMediaPlayerWindowKeyDown', () => {
  const baseState = {
    mpAddByRSS: null,
    mpChannel: { id: 'ch' },
    mpCurrentTime: 30,
    mpDuration: 100,
    isLiveItem: false,
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

  it('Space does not toggle when focus is on a slider', () => {
    const togglePlayPause = vi.fn();
    const slider = document.createElement('div');
    slider.setAttribute('role', 'slider');

    handleMediaPlayerWindowKeyDown(
      { code: 'Space', key: ' ', preventDefault: vi.fn(), repeat: false },
      slider,
      baseState,
      vi.fn(),
      togglePlayPause
    );

    expect(togglePlayPause).not.toHaveBeenCalled();
  });

  it('Space does not toggle when focus is inside a dialog on non-button content', () => {
    const togglePlayPause = vi.fn();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const content = document.createElement('div');
    dialog.append(content);
    document.body.append(dialog);

    handleMediaPlayerWindowKeyDown(
      { code: 'Space', key: ' ', preventDefault: vi.fn(), repeat: false },
      content,
      baseState,
      vi.fn(),
      togglePlayPause
    );

    expect(togglePlayPause).not.toHaveBeenCalled();
    dialog.remove();
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

  it('ArrowLeft and ArrowRight do not seek when a live item is active', () => {
    const seek = vi.fn();
    const el = document.createElement('div');
    const liveState = { ...baseState, isLiveItem: true };

    handleMediaPlayerWindowKeyDown(
      { code: 'ArrowLeft', key: 'ArrowLeft', preventDefault: vi.fn(), repeat: false },
      el,
      liveState,
      seek,
      vi.fn()
    );
    handleMediaPlayerWindowKeyDown(
      { code: 'ArrowRight', key: 'ArrowRight', preventDefault: vi.fn(), repeat: false },
      el,
      liveState,
      seek,
      vi.fn()
    );

    expect(seek).not.toHaveBeenCalled();
  });
});
