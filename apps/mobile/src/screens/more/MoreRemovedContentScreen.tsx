import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { DTOAccountContentLog } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { FillList } from '../../components/primitives/FillList';
import { ListError } from '../../components/state/ListError';
import { LoadingSection } from '../../components/state/LoadingSection';
import { screenBodyInsets, settingsCardInnerGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type Translate = ReturnType<typeof useTranslation>['t'];

const removedContentSentences = (row: DTOAccountContentLog, t: Translate): string[] => {
  const trimmedTitle = row.channel_title?.trim() ?? '';
  const title = trimmedTitle.length > 0 ? trimmedTitle : t('removed_content.unknown_show');
  const sentences = [
    row.reason === 'taken_down'
      ? t('removed_content.taken_down', { title })
      : t('removed_content.left_directory', { title }),
  ];

  if (row.follow_outcome === 'moved_to_add_by_rss') {
    sentences.push(t('removed_content.moved_to_add_by_rss'));
  } else if (row.follow_outcome === 'ended') {
    sentences.push(t('removed_content.follow_ended'));
  }

  if (row.clip_count > 0) {
    sentences.push(t('settings.advanced.clips', { count: row.clip_count }));
  }
  if (row.playlist_entry_count > 0) {
    sentences.push(t('settings.advanced.playlist_entries', { count: row.playlist_entry_count }));
  }

  return sentences;
};

/**
 * Signed-in Removed Content list. Each row is one show from the account content log.
 * Rows are text, not links.
 */
export function MoreRemovedContentScreen() {
  const { t } = useTranslation();
  const { accessToken, account, clearSession, refreshToken, setTokens } = useAuth();
  const { styles: themeStyles, tokens } = useTheme();
  const accountId = account?.id ?? null;
  const previousAccountId = useRef<number | null | undefined>(undefined);
  const [rows, setRows] = useState<DTOAccountContentLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (previousAccountId.current !== accountId) {
      previousAccountId.current = accountId;
      setRows([]);
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadFailed(false);

    const run = async () => {
      if (accessToken === null) {
        if (!cancelled) {
          setRows([]);
          setLoadFailed(true);
          setIsLoading(false);
        }
        return;
      }

      try {
        const next = await requestWithMobileAuthRefresh(
          { accessToken, clearSession, refreshToken, setTokens },
          async (api) => api.reqAccountContentLog({ type: 'removed_content' })
        );
        if (!cancelled) {
          setRows(next);
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setLoadFailed(true);
          setIsLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [accessToken, accountId, clearSession, refreshToken, reloadToken, setTokens]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          ...screenBodyInsets(tokens.spacing),
          paddingBottom: tokens.spacing.lg,
        },
        header: {
          gap: settingsCardInnerGap(tokens.spacing),
          marginBottom: rows.length > 0 ? settingsCardInnerGap(tokens.spacing) : 0,
        },
        row: {
          gap: tokens.spacing.sm,
        },
        screen: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        sentence: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
        },
        separator: {
          height: tokens.spacing.base,
        },
      }),
    [rows.length, themeStyles, tokens]
  );

  const renderSeparator = useCallback(() => <View style={styles.separator} />, [styles.separator]);

  const renderRow = useCallback(
    ({ item }: { item: DTOAccountContentLog }) => {
      const sentences = removedContentSentences(item, t);
      return (
        <View
          accessibilityLabel={sentences.join(' ')}
          accessible
          style={styles.row}
          testID="removed-content-row"
        >
          {sentences.map((sentence, index) => (
            <Text key={`${item.id}-${index}`} style={styles.sentence}>
              {sentence}
            </Text>
          ))}
        </View>
      );
    },
    [styles.row, styles.sentence, t]
  );

  const listEmpty = isLoading ? (
    <LoadingSection testID="removed-content-loading" />
  ) : loadFailed ? (
    <ListError
      messageKey="removed_content.load_error"
      onRetry={() => {
        setReloadToken((token) => token + 1);
      }}
      testID="removed-content-error"
    />
  ) : null;

  const listHeader = (
    <View style={styles.header}>
      <Text style={styles.sentence} testID="removed-content-explanation">
        {t('removed_content.explanation')}
      </Text>
      {!isLoading && !loadFailed && rows.length === 0 ? (
        <Text style={styles.sentence} testID="removed-content-empty">
          {t('removed_content.empty')}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.screen} testID="removed-content-screen">
      <FillList
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={listEmpty}
        ListHeaderComponent={listHeader}
        contentContainerStyle={styles.content}
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
      />
    </View>
  );
}
