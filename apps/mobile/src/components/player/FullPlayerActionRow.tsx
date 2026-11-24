import { useTranslation } from 'react-i18next';

import { BoostHeaderAction } from '../boost/BoostHeaderAction';
import { HeaderBarAction } from '../screen/HeaderBarAction';
import { HeaderBarActions } from '../screen/HeaderBarActions';
import { HeaderBarChrome } from '../screen/HeaderBarChrome';

type FullPlayerActionRowProps = {
  disableAddToPlaylist: boolean;
  disableShare: boolean;
  onAddToPlaylist: () => void;
  onClose: () => void;
  onCreateClip: () => void;
  onOpenBoost: () => void;
  onOpenQueue: () => void;
  onOpenV4v: () => void;
  onShare: () => void;
  showBoost: boolean;
  /** Music cannot be clipped. */
  showCreateClip: boolean;
  showV4v: boolean;
};

export function FullPlayerActionRow({
  disableAddToPlaylist,
  disableShare,
  onAddToPlaylist,
  onClose,
  onCreateClip,
  onOpenBoost,
  onOpenQueue,
  onOpenV4v,
  onShare,
  showBoost,
  showCreateClip,
  showV4v,
}: FullPlayerActionRowProps) {
  const { t } = useTranslation();

  return (
    <HeaderBarChrome
      backAccessibilityLabel={t('misc.close')}
      backIcon="chevron-down"
      backTestID="full-player-close"
      onBack={onClose}
      right={
        <HeaderBarActions>
          {showBoost ? (
            <BoostHeaderAction onPress={onOpenBoost} testID="full-player-boost" />
          ) : null}
          {showCreateClip ? (
            <HeaderBarAction
              accessibilityLabel={t('features.clip.create_clip')}
              icon="cut-outline"
              onPress={onCreateClip}
              testID="full-player-create-clip"
            />
          ) : null}
          <HeaderBarAction
            accessibilityLabel={t('features.playlist.add_to_playlist')}
            disabled={disableAddToPlaylist}
            icon="add-circle-outline"
            onPress={onAddToPlaylist}
            testID="full-player-add-to-playlist"
          />
          <HeaderBarAction
            accessibilityLabel={t('media_player.share')}
            disabled={disableShare}
            icon="share-social-outline"
            onPress={onShare}
            testID="full-player-share"
          />
          <HeaderBarAction
            accessibilityLabel={t('features.queue.queue')}
            icon="list-outline"
            onPress={onOpenQueue}
            testID="full-player-queue"
          />
          {showV4v ? (
            <HeaderBarAction
              accessibilityLabel={t('media_player.value_for_value')}
              icon="flash-outline"
              onPress={onOpenV4v}
              testID="full-player-v4v"
            />
          ) : null}
        </HeaderBarActions>
      }
      testID="full-player-action-row"
    />
  );
}
