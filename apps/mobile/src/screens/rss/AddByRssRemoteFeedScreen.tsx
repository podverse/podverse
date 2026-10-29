import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { SearchDetailView } from '../../components/searchDetail/SearchDetailView';
import { ListEmpty } from '../../components/state/ListEmpty';
import { addByRssRepository } from '../../data';
import { useAddByRssAddFlow } from '../../hooks/useAddByRssAddFlow';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import { useOfflineMode } from '../../prefs/offlineMode';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { AddByRssDetailStackParamList } from '../home/addByRss/addByRssStackParams';

type AddByRssRemoteFeedScreenProps = NativeStackScreenProps<
  AddByRssDetailStackParamList,
  'AddByRssRemoteFeedDetail'
>;

const createStyles = ({ styles: themeStyles }: ThemedStylesTheme) =>
  StyleSheet.create({
    container: {
      backgroundColor: themeStyles.screen.backgroundColor,
      flex: 1,
    },
  });

/**
 * A remote feed the index provider does not know. Shows the reference title, or the feed URL when
 * the reference has none, and adds the feed the same way the Add by RSS add screen does. A feed
 * already stored on this device opens its detail screen. Username and password, when the feed
 * needs them, are entered on that detail screen after the add.
 */
export function AddByRssRemoteFeedScreen({ navigation, route }: AddByRssRemoteFeedScreenProps) {
  const { t } = useTranslation();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const styles = useThemedStyles(createStyles);
  const { feedUrl } = route.params;
  const title = route.params.title?.trim() || null;
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const setInputValue = useCallback(() => {}, []);

  const { addErrorKey, addFeed, isAdding } = useAddByRssAddFlow({
    inputValue: feedUrl,
    onAfterAdd: async () => {
      const record = await addByRssRepository.getFeedByUrl(feedUrl);
      if (record !== null) {
        navigation.replace('AddByRssPodcastDetail', { feedIdText: record.idText });
        return;
      }
      navigation.goBack();
    },
    onNotice: setNoticeKey,
    setInputValue,
  });

  useEffect(() => {
    if (offlineModeEnabled) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const record = await addByRssRepository.getFeedByUrl(feedUrl);
      if (cancelled || record === null) {
        return;
      }
      navigation.replace('AddByRssPodcastDetail', { feedIdText: record.idText });
    })();
    return () => {
      cancelled = true;
    };
  }, [feedUrl, navigation, offlineModeEnabled]);

  const handleAdd = useCallback(() => {
    void addFeed();
  }, [addFeed]);

  if (offlineModeEnabled) {
    return (
      <MobileScreenContainer testID="add-by-rss-remote-feed-screen">
        <ListEmpty
          messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
          testID="add-by-rss-remote-feed-offline-unavailable"
        />
      </MobileScreenContainer>
    );
  }

  return (
    <View style={styles.container} testID="add-by-rss-remote-feed-screen">
      <SearchDetailView
        author={null}
        description={title !== null ? feedUrl : null}
        errorMessage={addErrorKey !== null ? t(addErrorKey) : null}
        helperMessage={t('features.add_by_rss.remote_feed_explanation')}
        imageUrl={null}
        noticeMessage={noticeKey !== null ? t(noticeKey) : null}
        primaryAction={{
          label: t('features.add_by_rss.label'),
          loading: isAdding,
          onPress: handleAdd,
        }}
        progressMessage={null}
        testIDs={{
          actionButton: 'add-by-rss-remote-feed-add-button',
          error: 'add-by-rss-remote-feed-add-error',
          helper: 'add-by-rss-remote-feed-helper',
          image: 'add-by-rss-remote-feed-image',
          notice: 'add-by-rss-remote-feed-add-notice',
          progress: 'add-by-rss-remote-feed-adding',
          scroll: 'add-by-rss-remote-feed-scroll',
        }}
        title={title ?? feedUrl}
      />
    </View>
  );
}
