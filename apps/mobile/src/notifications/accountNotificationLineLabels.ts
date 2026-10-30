import type { AccountNotificationLineLabels } from '@podverse/helpers';

export function accountNotificationLineLabels(
  t: (key: string) => string
): AccountNotificationLineLabels {
  return {
    livestream: t('notifications_page.line_livestream'),
    'livestream-scheduled': t('notifications_page.line_livestream_scheduled'),
    'livestream-started': t('notifications_page.line_livestream_started'),
    new: t('notifications_page.line_new_content'),
    'new-album': t('notifications_page.line_new_album'),
    'new-episode': t('notifications_page.line_new_episode'),
    'new-podcast': t('notifications_page.line_new_podcast'),
    'new-track': t('notifications_page.line_new_track'),
    'new-video': t('notifications_page.line_new_video'),
    'new-video-channel': t('notifications_page.line_new_video_channel'),
    'podcast-index-feed': t('notifications_page.line_podcast_index_feed'),
    systemUpdate: t('notifications_page.line_system_update'),
  };
}
