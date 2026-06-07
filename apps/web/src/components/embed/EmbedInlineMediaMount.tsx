'use client';

import { useNonLivePlaybackAvProps } from '../../hooks/useNonLivePlaybackAvProps';
import { NonLiveMediaOrchestrator } from '../MediaPlayer/Controller/NonLiveMediaOrchestrator';

export function EmbedInlineMediaMount() {
  const avProps = useNonLivePlaybackAvProps();

  return <NonLiveMediaOrchestrator {...avProps} mediaType="audio" preload="auto" hidden={true} />;
}
