import { useMediaPlayer } from '../../../../contexts/MediaPlayer';
import { MediaPlayerControllerLiveStreamAV } from '../MediaPlayerControllerLiveStreamAV';

export function MediaPlayerControllerLiveStreamAudio() {
  const { mpItem, mpItemLabeledItemEnclosures, mpEnclosureSelectedParams, mpIsPlaying } =
    useMediaPlayer();

  return (
    <MediaPlayerControllerLiveStreamAV
      mediaType="audio"
      mpItem={mpItem}
      mpItemLabeledEnclosures={mpItemLabeledItemEnclosures}
      mpEnclosureSelectedParams={mpEnclosureSelectedParams}
      mpIsPlaying={mpIsPlaying}
      hidden={true}
      style={{ display: 'none' }}
    />
  );
}
