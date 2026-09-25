import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Share, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { Badge, Button, LIST_REMOVE_CLIPPED_SUBVIEWS, ListRow } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { LoadingSection } from '../../components/state/LoadingSection';
import { isMobileE2eFromEnv } from '../../config/env';
import type { SyncEventLogEntry } from '../../data/repositories';
import { formatSyncEventLogExport, syncEventLogRepository } from '../../data/repositories';
import type { MoreStackParamList } from '../../navigation';
import { MORE_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import {
  ERROR_LOG_OUTCOME_BADGE_TONES,
  ERROR_LOG_OUTCOME_LABEL_KEYS,
  errorLogCategoryLabel,
  errorLogSubject,
  useErrorLogTimestampFormatter,
} from './errorLogPresentation';

/**
 * Abridged error log: one tappable row per entry (outcome, category, time, code, and what it was
 * about). The detail screen holds everything else and the copy action.
 *
 * Plain and dense on purpose: the reason to open this screen is that something is not working and
 * somebody needs to be told what, so it optimizes for getting the contents out rather than for
 * looking like the rest of the app.
 */
export function MoreErrorLogScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const { styles: themeStyles, tokens } = useTheme();
  const timestampFormatter = useErrorLogTimestampFormatter();
  const [entries, setEntries] = useState<SyncEventLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isClearConfirmVisible, setIsClearConfirmVisible] = useState<boolean>(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      setEntries(await syncEventLogRepository.list());
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const handleExport = useCallback(() => {
    // The native share sheet is modal and stops Maestro dead, so E2E exercises the button without it.
    if (isMobileE2eFromEnv()) {
      return;
    }
    const message = formatSyncEventLogExport(entries);
    void Share.share({ message }).catch(() => {
      // Dismissing the share sheet is not a failure worth reporting on a diagnostics screen.
    });
  }, [entries]);

  const handleClear = useCallback(() => {
    setIsClearConfirmVisible(false);
    void syncEventLogRepository.clear().then(load);
  }, [load]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          flexDirection: 'row',
          gap: tokens.spacing.md,
          marginBottom: tokens.spacing.md,
        },
        chevron: {
          color: themeStyles.textSecondary.color,
          fontSize: 18,
        },
        content: {
          padding: tokens.spacing.lg,
          paddingBottom: tokens.spacing['2xl'],
        },
        intro: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginBottom: tokens.spacing.md,
        },
        rowDivider: {
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        screen: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
      }),
    [themeStyles, tokens]
  );

  const renderRow = ({ item, index }: { index: number; item: SyncEventLogEntry }) => {
    const category = errorLogCategoryLabel(t, item.jobKind);
    const outcomeLabel = t(ERROR_LOG_OUTCOME_LABEL_KEYS[item.outcome]);
    const timestamp = timestampFormatter.format(new Date(item.occurredAt));
    const subtitle = item.errorCode === null ? timestamp : `${timestamp} · ${item.errorCode}`;
    const subject = errorLogSubject(item) ?? undefined;

    // One announcement per entry, so a screen reader user can tell which code belongs to which row.
    const accessibilityLabel = [category, outcomeLabel, timestamp, item.errorCode, subject]
      .filter((part) => part !== null && part !== undefined && part !== '')
      .join('. ');

    return (
      <View style={index > 0 ? styles.rowDivider : undefined}>
        <ListRow
          accessibilityLabel={`${accessibilityLabel}. ${t('error_log.row_a11y_hint')}`}
          leading={
            <Badge
              label={outcomeLabel}
              testID={`error-log-row-outcome-${item.id}`}
              tone={ERROR_LOG_OUTCOME_BADGE_TONES[item.outcome]}
            />
          }
          meta={subject}
          onPress={() => {
            navigation.navigate(MORE_STACK_ROUTES.MoreErrorLogDetail, { entryId: item.id });
          }}
          subtitle={subtitle}
          subtitleNumberOfLines={1}
          subtitleTestID={`error-log-row-code-${item.id}`}
          testID={`error-log-row-${item.id}`}
          title={category}
          trailing={<Text style={styles.chevron}>›</Text>}
        />
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <Text style={styles.intro}>{t('error_log.intro')}</Text>
      <View style={styles.actions}>
        <Button
          disabled={entries.length === 0}
          label={t('error_log.export')}
          onPress={handleExport}
          size="sm"
          testID="error-log-export"
        />
        <Button
          disabled={entries.length === 0}
          label={t('error_log.clear')}
          onPress={() => {
            setIsClearConfirmVisible(true);
          }}
          size="sm"
          testID="error-log-clear"
          variant="secondary"
        />
      </View>
    </View>
  );

  return (
    <View style={styles.screen} testID="error-log-screen">
      <FlatList
        contentContainerStyle={styles.content}
        data={entries}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          isLoading ? (
            <LoadingSection testID="error-log-loading" />
          ) : (
            <ListEmpty messageKey="error_log.empty" testID="error-log-empty" />
          )
        }
        ListHeaderComponent={renderHeader}
        removeClippedSubviews={LIST_REMOVE_CLIPPED_SUBVIEWS}
        renderItem={renderRow}
      />
      <ConfirmDialog
        body={t('error_log.clear_confirm_body')}
        cancelLabel={t('misc.cancel')}
        cancelTestID="error-log-clear-cancel"
        confirmLabel={t('error_log.clear')}
        confirmTestID="error-log-clear-confirm"
        onCancel={() => {
          setIsClearConfirmVisible(false);
        }}
        onConfirm={handleClear}
        testID="error-log-clear-confirm-dialog"
        title={t('error_log.clear_confirm_title')}
        visible={isClearConfirmVisible}
      />
    </View>
  );
}
