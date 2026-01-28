export type NotificationMessageType =
  | 'new'
  | 'new-episode'
  | 'new-podcast'
  | 'new-video'
  | 'new-video-channel'
  | 'new-track'
  | 'new-album'
  | 'livestream-started'
  | 'livestream-scheduled';

export type NotificationLocaleMap = Record<NotificationMessageType, string>;

export const i18nNotifications: Record<string, NotificationLocaleMap> = {
  'en-US': {
    new: '',
    'new-episode': '',
    'new-podcast': '',
    'new-video': '',
    'new-video-channel': '',
    'new-track': '',
    'new-album': '',
    'livestream-started': 'Live: ',
    'livestream-scheduled': 'Live Scheduled: ',
  },
  es: {
    new: '',
    'new-episode': '',
    'new-podcast': '',
    'new-video': '',
    'new-video-channel': '',
    'new-track': '',
    'new-album': '',
    'livestream-started': 'En vivo: ',
    'livestream-scheduled': 'En vivo programado: ',
  },
  fr: {
    new: '',
    'new-episode': '',
    'new-podcast': '',
    'new-video': '',
    'new-video-channel': '',
    'new-track': '',
    'new-album': '',
    'livestream-started': 'En direct: ',
    'livestream-scheduled': 'En direct programmé: ',
  },
  'el-GR': {
    new: '',
    'new-episode': '',
    'new-podcast': '',
    'new-video': '',
    'new-video-channel': '',
    'new-track': '',
    'new-album': '',
    'livestream-started': 'Ζωντανά: ',
    'livestream-scheduled': 'Προγραμματισμένα ζωντανά: ',
  },
};
