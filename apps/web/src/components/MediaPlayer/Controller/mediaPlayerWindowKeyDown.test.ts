import { describe, expect, it, vi } from 'vitest';

import type { MediaPlayerKeyDownState } from './mediaPlayerWindowKeyDown';
import { handleMediaPlayerWindowKeyDown } from './mediaPlayerWindowKeyDown';

describe('handleMediaPlayerWindowKeyDown', () => {
  const loaded: MediaPlayerKeyDownState = { hasResource: true, canJump: true };
  const blocked: MediaPlayerKeyDownState = { hasResource: true, canJump: false };
  const empty: MediaPlayerKeyDownState = { hasResource: false, canJump: true };

  it('Space toggles play/pause when a resource is loaded and the target is not interactive', () => {
    const preventDefault = vi.fn();
    const togglePlayPause = vi.fn();
    const el = document.createElement('div');

    handleMediaPlayerWindowKeyDown(
      { code: 'Space', key: ' ', preventDefault, repeat: false },
      el,
      loaded,
      vi.fn(),
      togglePlayPause
    );

    expect(togglePlayPause).toHaveBeenCalledTimes(1);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('Space does nothing without a resource', () => {
    const preventDefault = vi.fn();
    const togglePlayPause = vi.fn();
    const el = document.createElement('div');

    handleMediaPlayerWindowKeyDown(
      { code: 'Space', key: ' ', preventDefault, repeat: false },
      el,
      empty,
      vi.fn(),
      togglePlayPause
    );

    expect(togglePlayPause).not.toHaveBeenCalled();
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('Space ignores key repeat', () => {
    const togglePlayPause = vi.fn();
    const el = document.createElement('div');

    handleMediaPlayerWindowKeyDown(
      { code: 'Space', key: ' ', preventDefault: vi.fn(), repeat: true },
      el,
      loaded,
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
      loaded,
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
      loaded,
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
      loaded,
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
      loaded,
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
      loaded,
      vi.fn(),
      togglePlayPause
    );

    expect(togglePlayPause).not.toHaveBeenCalled();
    dialog.remove();
  });

  it('ArrowLeft and ArrowRight jump by 10 seconds when canJump is true', () => {
    const jumpBy = vi.fn();
    const el = document.createElement('div');

    handleMediaPlayerWindowKeyDown(
      { code: 'ArrowLeft', key: 'ArrowLeft', preventDefault: vi.fn(), repeat: false },
      el,
      loaded,
      jumpBy,
      vi.fn()
    );
    expect(jumpBy).toHaveBeenCalledWith(-10);

    handleMediaPlayerWindowKeyDown(
      { code: 'ArrowRight', key: 'ArrowRight', preventDefault: vi.fn(), repeat: false },
      el,
      loaded,
      jumpBy,
      vi.fn()
    );
    expect(jumpBy).toHaveBeenCalledWith(10);
  });

  it('ArrowLeft and ArrowRight do nothing when canJump is false', () => {
    const jumpBy = vi.fn();
    const el = document.createElement('div');

    handleMediaPlayerWindowKeyDown(
      { code: 'ArrowLeft', key: 'ArrowLeft', preventDefault: vi.fn(), repeat: false },
      el,
      blocked,
      jumpBy,
      vi.fn()
    );
    handleMediaPlayerWindowKeyDown(
      { code: 'ArrowRight', key: 'ArrowRight', preventDefault: vi.fn(), repeat: false },
      el,
      blocked,
      jumpBy,
      vi.fn()
    );

    expect(jumpBy).not.toHaveBeenCalled();
  });
});
