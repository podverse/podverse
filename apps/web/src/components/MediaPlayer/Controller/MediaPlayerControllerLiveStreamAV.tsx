import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  DTOItem,
  EnclosureSelectedParams,
  LabeledItemEnclosure,
  SelectedLabeledItemEnclosureAndSource,
} from '@podverse/helpers';
import { getSelectedLabeledItemEnclosureAndSource, isEqual, isHlsSource } from '@podverse/helpers';

import type { MediaElementSource } from '../../../hooks/useMediaElementBridge';
import { crossDevicePlaybackStore } from '../../../lib/crossDevicePlayback/crossDevicePlaybackStore';
import { liveMediaStore } from '../../../lib/livePlayback/liveMediaStore';
import { MediaElement } from '../MediaElement/MediaElement';
import { resolveLivestreamSourceType } from './livestreamSourceType';

export interface MediaPlayerControllerLiveStreamAVProps {
  mediaType: 'audio' | 'video';
  mpItem: DTOItem | null;
  mpItemLabeledEnclosures: LabeledItemEnclosure[];
  mpEnclosureSelectedParams: EnclosureSelectedParams;
  style?: React.CSSProperties;
  hidden: boolean;
  mpIsPlaying: boolean;
}

function LivestreamMediaElement({
  mediaType,
  source,
  playing,
  style,
  onReconnect,
}: {
  mediaType: 'audio' | 'video';
  source: MediaElementSource;
  playing: boolean;
  style?: React.CSSProperties;
  /** Mount a fresh element for the same source, which plays from live while `playing`. */
  onReconnect: () => void;
}) {
  const liveMediaRef = useRef<HTMLMediaElement | null>(null);
  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  useEffect(() => {
    const media = liveMediaRef.current;
    if (media === null) {
      return;
    }
    return liveMediaStore.register({
      media,
      delivery: source.delivery ?? 'file',
      reconnect: () => onReconnectRef.current(),
    });
  }, [source.delivery]);

  useEffect(() => {
    const media = liveMediaRef.current;
    if (media === null) {
      return;
    }
    if (!playing) {
      media.pause();
      return;
    }
    const start = () => {
      if (liveMediaStore.prepareResume(media) === 'reconnecting') {
        return;
      }
      void media.play().catch((error: unknown) => {
        crossDevicePlaybackStore.notifyLocalPlayRejected(error);
      });
    };
    if (media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      start();
      return;
    }
    media.addEventListener('canplay', start, { once: true });
    return () => {
      media.removeEventListener('canplay', start);
    };
  }, [playing]);

  return (
    <MediaElement
      source={source}
      isVideo={mediaType === 'video'}
      mediaRef={liveMediaRef}
      playsInline={mediaType === 'video'}
      style={{ width: '100%', ...style }}
    />
  );
}

export const MediaPlayerControllerLiveStreamAV: React.FC<
  MediaPlayerControllerLiveStreamAVProps
> = ({
  mediaType,
  mpItem,
  mpItemLabeledEnclosures,
  mpEnclosureSelectedParams,
  style,
  hidden,
  mpIsPlaying,
}) => {
  const prevSelectedRef = useRef<SelectedLabeledItemEnclosureAndSource | null>(null);
  const [connection, setConnection] = useState(0);
  const handleReconnect = useCallback(() => {
    setConnection((count) => count + 1);
  }, []);

  const selectedItemEnclosureAndSource = useMemo(() => {
    const next = getSelectedLabeledItemEnclosureAndSource({
      labeledItemEnclosures: mpItemLabeledEnclosures,
      type: mpEnclosureSelectedParams.type,
      enclosureRowIndex: mpEnclosureSelectedParams.enclosureRowSelected,
      sourceRowIndex: mpEnclosureSelectedParams.sourceRowSelected,
    });
    if (isEqual(prevSelectedRef.current, next)) {
      return prevSelectedRef.current;
    }
    prevSelectedRef.current = next;
    return next;
  }, [mpItemLabeledEnclosures, mpEnclosureSelectedParams]);

  const source = useMemo((): MediaElementSource | null => {
    const labeled = selectedItemEnclosureAndSource?.labeledItemEnclosure;
    const srcObj = selectedItemEnclosureAndSource?.source;
    const srcUrl = typeof srcObj?.uri === 'string' ? srcObj.uri.trim() : '';
    if (labeled === null || labeled === undefined || srcUrl === '') {
      return null;
    }
    if (labeled.mediaType !== mediaType) {
      return null;
    }
    const srcType = resolveLivestreamSourceType(
      srcUrl,
      labeled.enclosure.type,
      srcObj?.content_type
    );
    if (!mpItem?.live_item || srcType === null) {
      return null;
    }
    return {
      kind: 'file',
      src: srcUrl,
      mimeType: srcType,
      delivery: isHlsSource(srcUrl, srcType) ? 'hls' : 'file',
    };
  }, [mediaType, mpItem?.live_item, selectedItemEnclosureAndSource]);

  const hiddenCommon = hidden || mediaType === 'audio';

  return (
    <div {...{ [`data-livestream-player-${mediaType}`]: true }} hidden={hiddenCommon} style={style}>
      {source === null ? null : (
        <LivestreamMediaElement
          key={`${source.delivery}:${source.src}:${connection}`}
          mediaType={mediaType}
          source={source}
          playing={mpIsPlaying}
          style={style}
          onReconnect={handleReconnect}
        />
      )}
    </div>
  );
};

// Each source mounts its own media element. Leaving a livestream unmounts that element, so the
// next livestream always starts from a fresh element. A reconnect also mounts a fresh element,
// which opens a new connection for both progressive and HLS delivery.
