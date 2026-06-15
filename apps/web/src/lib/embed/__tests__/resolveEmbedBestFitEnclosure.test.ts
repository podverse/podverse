import { describe, expect, it } from 'vitest';

import type { LabeledItemEnclosure } from '@podverse/helpers';

import {
  type EmbedConnectionQualityTarget,
  resolveEmbedBestFitEnclosureSelectedParams,
} from '../resolveEmbedBestFitEnclosure';

type LabeledOverrides = {
  type?: string;
  mediaType?: 'audio' | 'video';
  id?: number;
  bitrate?: number | null;
  height?: number | null;
  fileExtension?: string;
};

function labeled({
  type = 'audio/mpeg',
  mediaType = 'audio',
  id = 1,
  bitrate = null,
  height = null,
  fileExtension,
}: LabeledOverrides = {}): LabeledItemEnclosure {
  const entry: LabeledItemEnclosure = {
    enclosure: {
      id,
      item_id: 1,
      type,
      bitrate,
      height,
      item_enclosure_default: false,
      item_enclosure_integrity: null,
      item_enclosure_sources: [
        { id: 1, item_enclosure_id: id, uri: `https://example.test/${id}`, content_type: type },
      ],
    },
    mediaType,
    label: mediaType,
  };
  if (fileExtension !== undefined) {
    entry.fileExtension = fileExtension;
  }
  return entry;
}

const audio = labeled({ type: 'audio/mpeg', mediaType: 'audio', id: 1 });
const video = labeled({ type: 'video/mp4', mediaType: 'video', id: 2 });

const FAST_TARGET: EmbedConnectionQualityTarget = { audioMaxKbps: 128, videoMaxHeight: 720 };
const SLOW_TARGET: EmbedConnectionQualityTarget = { audioMaxKbps: 64, videoMaxHeight: 360 };

describe('resolveEmbedBestFitEnclosureSelectedParams', () => {
  it('prefers a video enclosure for a video embed when one exists', () => {
    expect(resolveEmbedBestFitEnclosureSelectedParams([audio, video], 'video')).toEqual({
      type: 'video',
      enclosureRowSelected: 0,
      sourceRowSelected: 0,
    });
  });

  it('falls back to audio for a video embed when no video enclosure exists', () => {
    expect(resolveEmbedBestFitEnclosureSelectedParams([audio], 'video')).toEqual({
      type: 'audio',
      enclosureRowSelected: 0,
      sourceRowSelected: 0,
    });
  });

  it('prefers an audio enclosure for an audio embed when one exists', () => {
    expect(resolveEmbedBestFitEnclosureSelectedParams([video, audio], 'audio')).toEqual({
      type: 'audio',
      enclosureRowSelected: 0,
      sourceRowSelected: 0,
    });
  });

  it('falls back to video for an audio embed when no audio enclosure exists', () => {
    expect(resolveEmbedBestFitEnclosureSelectedParams([video], 'audio')).toEqual({
      type: 'video',
      enclosureRowSelected: 0,
      sourceRowSelected: 0,
    });
  });

  it('returns the default selection when there are no enclosures', () => {
    expect(resolveEmbedBestFitEnclosureSelectedParams([], 'video')).toEqual({
      type: 'default',
      enclosureRowSelected: null,
      sourceRowSelected: null,
    });
  });

  it('treats an unknown embed media type as audio-first', () => {
    expect(resolveEmbedBestFitEnclosureSelectedParams([video, audio], 'unknown')).toEqual({
      type: 'audio',
      enclosureRowSelected: 0,
      sourceRowSelected: 0,
    });
  });

  it('keeps the first enclosure when no connection target is provided', () => {
    const low = labeled({ id: 1, bitrate: 64_000 });
    const high = labeled({ id: 2, bitrate: 320_000 });

    expect(resolveEmbedBestFitEnclosureSelectedParams([low, high], 'audio')).toEqual({
      type: 'audio',
      enclosureRowSelected: 0,
      sourceRowSelected: 0,
    });
  });

  it('picks the highest audio bitrate at or below the ceiling on a fast connection', () => {
    const low = labeled({ id: 1, bitrate: 64_000 });
    const balanced = labeled({ id: 2, bitrate: 128_000 });
    const high = labeled({ id: 3, bitrate: 320_000 });

    expect(
      resolveEmbedBestFitEnclosureSelectedParams([low, balanced, high], 'audio', {
        connectionTarget: FAST_TARGET,
      })
    ).toEqual({
      type: 'audio',
      enclosureRowSelected: 1,
      sourceRowSelected: 0,
    });
  });

  it('picks the smallest audio file when every option exceeds the ceiling', () => {
    const balanced = labeled({ id: 1, bitrate: 128_000 });
    const high = labeled({ id: 2, bitrate: 320_000 });

    expect(
      resolveEmbedBestFitEnclosureSelectedParams([balanced, high], 'audio', {
        connectionTarget: SLOW_TARGET,
      })
    ).toEqual({
      type: 'audio',
      enclosureRowSelected: 0,
      sourceRowSelected: 0,
    });
  });

  it('prefers an mp3 when two audio encodings share the same bitrate', () => {
    const aac = labeled({ id: 1, type: 'audio/aac', fileExtension: 'aac', bitrate: 128_000 });
    const mp3 = labeled({ id: 2, type: 'audio/mpeg', fileExtension: 'mp3', bitrate: 128_000 });

    expect(
      resolveEmbedBestFitEnclosureSelectedParams([aac, mp3], 'audio', {
        connectionTarget: FAST_TARGET,
      })
    ).toEqual({
      type: 'audio',
      enclosureRowSelected: 1,
      sourceRowSelected: 0,
    });
  });

  it('caps video resolution to the connection ceiling', () => {
    const sd = labeled({ id: 1, type: 'video/mp4', mediaType: 'video', height: 360 });
    const hd = labeled({ id: 2, type: 'video/mp4', mediaType: 'video', height: 720 });
    const uhd = labeled({ id: 3, type: 'video/mp4', mediaType: 'video', height: 2160 });

    expect(
      resolveEmbedBestFitEnclosureSelectedParams([sd, hd, uhd], 'video', {
        connectionTarget: SLOW_TARGET,
      })
    ).toEqual({
      type: 'video',
      enclosureRowSelected: 0,
      sourceRowSelected: 0,
    });

    expect(
      resolveEmbedBestFitEnclosureSelectedParams([sd, hd, uhd], 'video', {
        connectionTarget: FAST_TARGET,
      })
    ).toEqual({
      type: 'video',
      enclosureRowSelected: 1,
      sourceRowSelected: 0,
    });
  });
});
