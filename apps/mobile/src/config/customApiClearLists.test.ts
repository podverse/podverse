import { describe, expect, it } from 'vitest';

import { CUSTOM_API_CLEAR_KEPT_ROWS, CUSTOM_API_CLEAR_REMOVED_ROWS } from './customApiClearLists';

describe('custom API clear screen rows', () => {
  it('lists what is erased in screen order', () => {
    expect(CUSTOM_API_CLEAR_REMOVED_ROWS.map((entry) => entry.id)).toEqual([
      'subscriptions',
      'saved_episodes',
      'downloads',
      'add_by_rss_feeds',
      'queue_history_playlists',
      'listening_position',
      'seen_marks',
      'per_show_auto_download',
      'sort_choices',
      'previous_app_carryover',
      'saved_login',
      'push_registration',
      'error_log',
      'notification_prompts',
      'membership_reminder',
    ]);
    expect(CUSTOM_API_CLEAR_REMOVED_ROWS.map((entry) => entry.titleKey)).toEqual([
      'custom_api.clear.removed.subscriptions.title',
      'custom_api.clear.removed.saved_episodes.title',
      'custom_api.clear.removed.downloads.title',
      'custom_api.clear.removed.add_by_rss_feeds.title',
      'custom_api.clear.removed.queue_history_playlists.title',
      'custom_api.clear.removed.listening_position.title',
      'custom_api.clear.removed.seen_marks.title',
      'custom_api.clear.removed.per_show_auto_download.title',
      'custom_api.clear.removed.sort_choices.title',
      'custom_api.clear.removed.previous_app_carryover.title',
      'custom_api.clear.removed.saved_login.title',
      'custom_api.clear.removed.push_registration.title',
      'custom_api.clear.removed.error_log.title',
      'custom_api.clear.removed.notification_prompts.title',
      'custom_api.clear.removed.membership_reminder.title',
    ]);
    expect(CUSTOM_API_CLEAR_REMOVED_ROWS.map((entry) => entry.bodyKey)).toEqual([
      'custom_api.clear.removed.subscriptions.body',
      'custom_api.clear.removed.saved_episodes.body',
      'custom_api.clear.removed.downloads.body',
      'custom_api.clear.removed.add_by_rss_feeds.body',
      'custom_api.clear.removed.queue_history_playlists.body',
      'custom_api.clear.removed.listening_position.body',
      'custom_api.clear.removed.seen_marks.body',
      'custom_api.clear.removed.per_show_auto_download.body',
      'custom_api.clear.removed.sort_choices.body',
      'custom_api.clear.removed.previous_app_carryover.body',
      'custom_api.clear.removed.saved_login.body',
      'custom_api.clear.removed.push_registration.body',
      'custom_api.clear.removed.error_log.body',
      'custom_api.clear.removed.notification_prompts.body',
      'custom_api.clear.removed.membership_reminder.body',
    ]);
  });

  it('lists what stays in screen order', () => {
    expect(CUSTOM_API_CLEAR_KEPT_ROWS.map((entry) => entry.id)).toEqual([
      'theme_language_tabs',
      'offline_mode',
      'download_limits',
      'shuffle_repeat_media',
      'notification_banners',
      'add_by_rss_passwords',
      'unified_push',
      'api_address',
    ]);
    expect(CUSTOM_API_CLEAR_KEPT_ROWS.map((entry) => entry.titleKey)).toEqual([
      'custom_api.clear.kept.theme_language_tabs.title',
      'custom_api.clear.kept.offline_mode.title',
      'custom_api.clear.kept.download_limits.title',
      'custom_api.clear.kept.shuffle_repeat_media.title',
      'custom_api.clear.kept.notification_banners.title',
      'custom_api.clear.kept.add_by_rss_passwords.title',
      'custom_api.clear.kept.unified_push.title',
      'custom_api.clear.kept.api_address.title',
    ]);
    expect(CUSTOM_API_CLEAR_KEPT_ROWS.map((entry) => entry.bodyKey)).toEqual([
      'custom_api.clear.kept.theme_language_tabs.body',
      'custom_api.clear.kept.offline_mode.body',
      'custom_api.clear.kept.download_limits.body',
      'custom_api.clear.kept.shuffle_repeat_media.body',
      'custom_api.clear.kept.notification_banners.body',
      'custom_api.clear.kept.add_by_rss_passwords.body',
      'custom_api.clear.kept.unified_push.body',
      'custom_api.clear.kept.api_address.body',
    ]);
  });
});
