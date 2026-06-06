import { useLocale, useTranslations } from 'use-intl';

import type { DTOAccount, DTOChannel } from '@podverse/helpers';
import { DEDUPE_WINDOW_RSS_ON_DEMAND_MS } from '@podverse/helpers';
import { getStatusCodeFromError } from '@podverse/helpers-requests';
import { Divider, SwitchButton } from '@podverse/ui';

import { getContactEmail } from '../../constants/contact';
import { useAccount } from '../../contexts/Account';
import { useModals } from '../../contexts/Modals';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useLoadingMap } from '../../hooks/useLoadingMap';
import { buildLocalizedFeedParseStatusLines } from '../../lib/feed/buildLocalizedFeedParseStatusLines';
import { getMembership403ModalProps } from '../../utils/membership/modalForMembership403';
import { handleRateLimitAlert } from '../../utils/rateLimit/rateLimitAlert';
import { RSSFeedSettingsSection } from '../Settings/RSSFeedSettingsSection';
import { SettingsSection } from '../Settings/SettingsSection';
import { SettingsWrapper } from '../Settings/SettingsWrapper';

type ListChannelSettingsProps = {
  channel: DTOChannel;
};

export const ListChannelSettings = ({ channel }: ListChannelSettingsProps) => {
  const apiRequestService = getApiRequestService();
  const tInfo = useTranslations('info');
  const tSettings = useTranslations('settings');
  const tInstructions = useTranslations('instructions');
  const tMisc = useTranslations('misc');
  const tMembership = useTranslations('membership');
  const { loggedInAccount, setLoggedInAccount } = useAccount();
  const { setModalLoginRequired } = useModals();
  const { loadingMap, withLoading, setLoadingFor } = useLoadingMap();
  const locale = useLocale();
  const feedLog = channel.feed?.feed_log;
  const { lines: rssStatusLines } = buildLocalizedFeedParseStatusLines(
    {
      lastFinishedParseTime: feedLog?.last_finished_parse_time ?? null,
      lastFailedParseTime: feedLog?.last_failed_parse_time ?? null,
    },
    locale,
    tSettings
  );

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
          const membershipModal = getMembership403ModalProps({
            error,
            contactEmail: getContactEmail(),
            featureContext: 'manual_refresh',
            tMembership,
          });
          if (membershipModal !== null) {
            setModalLoginRequired(membershipModal);
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
        statusLines={rssStatusLines}
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
                stateOffLabel={tMisc('off')}
                stateOnLabel={tMisc('on')}
              />
            ))}
          </SettingsSection>
        </>
      )}
    </SettingsWrapper>
  );
};
