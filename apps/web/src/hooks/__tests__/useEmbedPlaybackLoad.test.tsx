import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { EmbedSingleResourcePayload } from '../../lib/embed/fetchEmbedSingleResource';
import { useEmbedPlaybackLoad } from '../useEmbedPlaybackLoad';

const hoisted = vi.hoisted(() => ({
  mediaPlayerResourceUpdate: vi.fn(),
  setMPItemLabeledItemEnclosures: vi.fn(),
}));

vi.mock('../useMediaPlayerResourceUpdate', () => ({
  useMediaPlayerResourceUpdate: () => {
    return (...args: unknown[]) => hoisted.mediaPlayerResourceUpdate(...args);
  },
}));

vi.mock('../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => ({
    setMPItemLabeledItemEnclosures: hoisted.setMPItemLabeledItemEnclosures,
  }),
}));

const embedResource = (): EmbedSingleResourcePayload => ({
  channel: {
    id: 1,
    id_text: 'ch',
    title: 'Channel',
  } as unknown as EmbedSingleResourcePayload['channel'],
  item: {
    id: 1,
    id_text: 'item',
    title: 'Episode Title',
    item_enclosures: [],
  } as unknown as EmbedSingleResourcePayload['item'],
  clip: null,
  itemChapter: null,
  itemSoundbite: null,
});

type ProbeProps = {
  bump: number;
  enabled: boolean;
  resource: EmbedSingleResourcePayload | null;
  shouldPlay: boolean;
  startSeconds: number;
};

function Probe({ bump, enabled, resource, shouldPlay, startSeconds }: ProbeProps) {
  useEmbedPlaybackLoad({
    resource,
    shouldPlay,
    startSeconds,
    enabled,
  });

  return <div data-bump={bump} />;
}

beforeEach(() => {
  hoisted.mediaPlayerResourceUpdate.mockClear();
  hoisted.setMPItemLabeledItemEnclosures.mockClear();
});

afterEach(() => {
  cleanup();
});

describe('useEmbedPlaybackLoad', () => {
  it('does not reload playback when parent re-renders with unchanged embed target inputs', () => {
    const resource = embedResource();
    const { rerender } = render(
      <Probe bump={0} enabled={true} resource={resource} shouldPlay={false} startSeconds={0} />
    );

    expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalledTimes(1);

    rerender(
      <Probe bump={1} enabled={true} resource={resource} shouldPlay={false} startSeconds={0} />
    );
    rerender(
      <Probe bump={2} enabled={true} resource={resource} shouldPlay={false} startSeconds={0} />
    );

    expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalledTimes(1);
  });

  it('reloads playback when shouldPlay changes', () => {
    const resource = embedResource();
    const { rerender } = render(
      <Probe bump={0} enabled={true} resource={resource} shouldPlay={false} startSeconds={0} />
    );

    rerender(
      <Probe bump={1} enabled={true} resource={resource} shouldPlay={true} startSeconds={0} />
    );

    expect(hoisted.mediaPlayerResourceUpdate).toHaveBeenCalledTimes(2);
  });

  it('does not load playback when disabled or resource is null', () => {
    render(
      <Probe
        bump={0}
        enabled={false}
        resource={embedResource()}
        shouldPlay={false}
        startSeconds={0}
      />
    );

    render(<Probe bump={0} enabled={true} resource={null} shouldPlay={false} startSeconds={0} />);

    expect(hoisted.mediaPlayerResourceUpdate).not.toHaveBeenCalled();
  });
});
