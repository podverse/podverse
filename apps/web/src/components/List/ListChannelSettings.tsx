import { useLocale, useTranslations } from 'use-intl';
import { DEDUPE_WINDOW_RSS_ON_DEMAND_MS, formatDateTimeAbbrev } from '@podverse/helpers';
import type { DTOAccount, DTOChannel } from '@podverse/helpers';
import { getStatusCodeFromError } from '@podverse/helpers-requests';
import { useAccount } from '../../contexts/Account';
import { useModals } from '../../contexts/Modals';
import { apiRequestService } from '../../factories/apiRequestService';
import { handleRateLimitAlert } from '../../utils/rateLimit/rateLimitAlert';
import { SwitchButton } from '../Form/SwitchButton';
import { Divider } from '../Divider/Divider';
import { useLoadingMap } from '../../hooks/useLoadingMap';
import { SettingsSection } from '../Settings/SettingsSection';
import { RSSFeedSettingsSection } from '../Settings/RSSFeedSettingsSection';
import { SettingsWrapper } from '../Settings/SettingsWrapper';

type ListChannelSettingsProps = {
  channel: DTOChannel;
};

export const ListChannelSettings = ({ channel }: ListChannelSettingsProps) => {
  const tInfo = useTranslations('info');
  const tSettings = useTranslations('settings');
  const tInstructions = useTranslations('instructions');
  const tMisc = useTranslations('misc');
  const tMembership = useTranslations('membership');
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const { setModalLoginRequired } = useModals();
  const { loadingMap, withLoading, setLoadingFor } = useLoadingMap();
  const locale = useLocale();
  const lastParsedAt = channel.feed?.feed_log?.last_finished_parse_time ?? null;
  const lastParsedLabel = lastParsedAt ? formatDateTimeAbbrev(lastParsedAt, locale) : null;
  const rssStatusLine = lastParsedLabel
    ? tSettings('feed.last_parsed', { date: lastParsedLabel })
    : null;

  const checkFeedForUpdates = async () => {
    if (!loggedInAccount) {
      setModalLoginRequired({
        title: null,
        message: tInstructions('login_to_refresh_feeds'),
      });
      return;
    }

    if (channel?.feed) {
      try {
        await apiRequestService.reqMQRSSRefreshOnDemand({
          url: channel.feed.url,
          podcast_index_id: channel.feed.podcast_index_id,
        });
        alert(tSettings('feed.check_feed_added_to_queue'));
      } catch (error: unknown) {
        const statusCode = getStatusCodeFromError(error);
        if (statusCode === 429) {
          const responseData = (error as { response?: { data?: { retry_after_seconds?: number } } })
            .response?.data;
          const retryAfterSeconds = responseData?.retry_after_seconds;
          const fallbackMinutes = Math.ceil(DEDUPE_WINDOW_RSS_ON_DEMAND_MS / 60000);
          const minutes = Math.max(1, Math.ceil((retryAfterSeconds ?? fallbackMinutes * 60) / 60));
          const waitKey =
            minutes === 1 ? 'feed.wait_to_retry_minute' : 'feed.wait_to_retry_minutes';
          alert(tSettings(waitKey, { minutes }));
          return;
        }
        const rateLimitErrorHandled = await handleRateLimitAlert(error, locale, tMisc);
        if (!rateLimitErrorHandled) {
          type ErrorWithResponse = { response?: { status?: number; data?: { i18nKey?: string } } };
          const errorWithResponse = error as ErrorWithResponse;
          const errorStatus = errorWithResponse?.response?.status;
          const errorData = errorWithResponse?.response?.data;
          const i18nKey = errorData?.i18nKey;

          if (errorStatus === 403 && i18nKey) {
            // Extract namespace and key from i18nKey (e.g., "membership.free_trial_not_allowed")
            const [namespace, key] = i18nKey.split('.');
            if (namespace === 'membership' && key) {
              setModalLoginRequired({
                title: null,
                message: tMembership(key),
              });
            } else {
              console.error(error);
              alert('Error performing action.');
            }
          } else {
            console.error(error);
            alert('Error performing action.');
          }
        }
      }
    }
  };

  const notificationTypes = [
    { key: 'new-item', label: tSettings('notifications.new_item') },
    { key: 'livestream-scheduled', label: tSettings('notifications.livestream_scheduled') },
    { key: 'livestream-started', label: tSettings('notifications.livestream_started') },
  ];

  const getAccountNotificationChannel = () => {
    return loggedInAccount?.account_notification_channels?.find(
      (anc) => anc.channel_id === channel.id
    );
  };

  const isTypeEnabled = (type: string) => {
    const accountNotificationChannel = getAccountNotificationChannel();
    return !!accountNotificationChannel?.account_notification_channel_types?.find(
      (t) => t.type === type
    );
  };

  const toggleNotificationType = async (type: string, next: boolean) => {
    const loadingKey = `channel-notification.${type}`;
    setLoadingFor(loadingKey, true);

    if (!loggedInAccount) {
      setModalLoginRequired({
        title: null,
        message: tInstructions(
          next ? 'login_to_enable_notifications' : 'login_to_disable_notifications'
        ),
      });
      setLoadingFor(loadingKey, false);
      return;
    }

    const accountNotificationChannel = getAccountNotificationChannel();
    if (!accountNotificationChannel) {
      setLoadingFor(loadingKey, false);
      return;
    }

    await withLoading(loadingKey, async () => {
      try {
        if (next) {
          const updated = await apiRequestService.reqAccountNotificationChannelTypeCreate({
            channel_id_text: channel.id_text,
            type,
          });
          setLoggedInAccount(updated as DTOAccount);
        } else {
          const updated = await apiRequestService.reqAccountNotificationChannelTypeDelete({
            channel_id_text: channel.id_text,
            type,
          });
          setLoggedInAccount(updated as DTOAccount);
        }
      } catch (e) {
        console.warn('Could not toggle channel notification type', type, e);
      }
    });

    setLoadingFor(loadingKey, false);
  };

  const hasNotificationChannel = !!getAccountNotificationChannel();

  return (
    <SettingsWrapper removeWrapperMargin>
      <RSSFeedSettingsSection
        title={tInfo('rss_feed')}
        buttonLabel={tSettings('feed.check_feed_for_updates')}
        onCheckUpdates={checkFeedForUpdates}
        statusLine={rssStatusLine}
      />
      {hasNotificationChannel && (
        <>
          <Divider withSpacing />
          <SettingsSection>
            <h3>{tSettings('notifications.notifications')}</h3>
            {notificationTypes.map((nt) => (
              <SwitchButton
                key={nt.key}
                id={`channel-notification-${nt.key}`}
                label={nt.label}
                checked={isTypeEnabled(nt.key)}
                onChange={async (next) => await toggleNotificationType(nt.key, next)}
                loading={!!loadingMap[`channel-notification.${nt.key}`]}
                aria-describedby={`channel-notification-help-${nt.key}`}
              />
            ))}
          </SettingsSection>
        </>
      )}
    </SettingsWrapper>
  );
};
