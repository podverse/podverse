import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Platform, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, LIST_REMOVE_CLIPPED_SUBVIEWS } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { LoadingSection } from '../../components/state/LoadingSection';
import type { SyncEventLogEntry } from '../../data/repositories';
import {
  formatSyncEventLogEntryReport,
  listSyncEventLogDetails,
  syncEventLogRepository,
} from '../../data/repositories';
import type { MoreStackParamList } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import {
  ERROR_LOG_OUTCOME_BADGE_TONES,
  ERROR_LOG_OUTCOME_LABEL_KEYS,
  errorLogCategoryLabel,
  errorLogMessage,
  isCreatorHostedEntry,
  useErrorLogTimestampFormatter,
} from './errorLogPresentation';

const COPY_STATUS_RESET_MS = 2500;

type CopyStatus = 'copied' | 'failed' | 'idle';

type DetailField = {
  key: string;
  label: string;
  value: string;
};

type LoadState =
  { entry: SyncEventLogEntry; status: 'loaded' } | { status: 'loading' } | { status: 'missing' };

/**
 * One error log entry in full: every recorded identifier, address, and status, each selectable,
 * plus a copy action that puts the whole report on the clipboard for pasting into an email.
 */
export function MoreErrorLogDetailScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<MoreStackParamList, 'MoreErrorLogDetail'>>();
  const { entryId } = route.params;
  const { styles: themeStyles, tokens } = useTheme();
  const timestampFormatter = useErrorLogTimestampFormatter();
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle');

  useEffect(() => {
    let isActive = true;
    setLoadState({ status: 'loading' });
    void syncEventLogRepository
      .getById(entryId)
      .then((entry) => {
        if (!isActive) {
          return;
        }
        setLoadState(entry === null ? { status: 'missing' } : { entry, status: 'loaded' });
      })
      .catch(() => {
        if (isActive) {
          setLoadState({ status: 'missing' });
        }
      });
    return () => {
      isActive = false;
    };
  }, [entryId]);

  useEffect(() => {
    if (copyStatus === 'idle') {
      return undefined;
    }
    const timer = setTimeout(() => {
      setCopyStatus('idle');
    }, COPY_STATUS_RESET_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [copyStatus]);

  const entry = loadState.status === 'loaded' ? loadState.entry : null;

  const fields = useMemo<DetailField[]>(() => {
    if (entry === null) {
      return [];
    }
    const summaryFields: DetailField[] = [
      {
        key: 'time',
        label: t('error_log.detail.time'),
        value: new Date(entry.occurredAt).toISOString(),
      },
      { key: 'code', label: t('error_log.detail.code'), value: entry.errorCode ?? '-' },
    ];
    const message = errorLogMessage(t, entry);
    if (message !== null) {
      summaryFields.push({ key: 'message', label: t('error_log.detail.message'), value: message });
    }
    const detailFields = listSyncEventLogDetails(entry.details).map(({ key, value }) => ({
      key,
      label: t(`error_log.detail.field.${key}`),
      value,
    }));
    return [...summaryFields, ...detailFields];
  }, [entry, t]);

  const handleCopy = useCallback(() => {
    if (entry === null) {
      return;
    }
    const report = formatSyncEventLogEntryReport(entry, {
      appVersion: Constants.expoConfig?.version ?? '-',
      platform: `${Platform.OS} ${String(Platform.Version)}`,
    });
    void Clipboard.setStringAsync(report)
      .then((didCopy) => {
        setCopyStatus(didCopy ? 'copied' : 'failed');
      })
      .catch(() => {
        setCopyStatus('failed');
      });
  }, [entry]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        category: {
          color: themeStyles.textPrimary.color,
          fontSize: 17,
          fontWeight: '600',
        },
        content: {
          padding: tokens.spacing.lg,
          paddingBottom: tokens.spacing['2xl'],
        },
        copyRow: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.md,
          marginTop: tokens.spacing.md,
        },
        copyStatus: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
        },
        field: {
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: StyleSheet.hairlineWidth,
          gap: tokens.spacing.xs,
          paddingVertical: tokens.spacing.md,
        },
        fieldLabel: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
          fontWeight: '600',
        },
        fieldValue: {
          color: themeStyles.textPrimary.color,
          fontFamily: Platform.select({ android: 'monospace', default: 'Menlo' }),
          fontSize: 13,
        },
        header: {
          gap: tokens.spacing.sm,
          marginBottom: tokens.spacing.lg,
        },
        headline: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
        hostedNote: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
        },
        screen: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        timestamp: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
        },
      }),
    [themeStyles, tokens]
  );

  if (loadState.status === 'loading') {
    return (
      <View style={styles.screen} testID="error-log-detail-screen">
        <LoadingSection testID="error-log-detail-loading" />
      </View>
    );
  }

  if (entry === null) {
    return (
      <View style={styles.screen} testID="error-log-detail-screen">
        <ListEmpty messageKey="error_log.detail.not_found" testID="error-log-detail-not-found" />
      </View>
    );
  }

  const outcomeLabel = t(ERROR_LOG_OUTCOME_LABEL_KEYS[entry.outcome]);
  const copyStatusText =
    copyStatus === 'copied'
      ? t('error_log.detail.copied')
      : copyStatus === 'failed'
        ? t('error_log.detail.copy_failed')
        : '';

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headline}>
        <Badge
          label={outcomeLabel}
          testID="error-log-detail-outcome"
          tone={ERROR_LOG_OUTCOME_BADGE_TONES[entry.outcome]}
        />
        <Text accessibilityRole="header" style={styles.category}>
          {errorLogCategoryLabel(t, entry.jobKind)}
        </Text>
      </View>
      <Text style={styles.timestamp}>{timestampFormatter.format(new Date(entry.occurredAt))}</Text>
      {isCreatorHostedEntry(entry) ? (
        <Text style={styles.hostedNote} testID="error-log-detail-hosted-note">
          {t('error_log.detail.hosted_media_note')}
        </Text>
      ) : null}
      <View style={styles.copyRow}>
        <Button
          label={t('error_log.detail.copy')}
          onPress={handleCopy}
          size="sm"
          testID="error-log-detail-copy"
        />
        <Text
          accessibilityLiveRegion="polite"
          style={styles.copyStatus}
          testID="error-log-detail-copy-status"
        >
          {copyStatusText}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen} testID="error-log-detail-screen">
      <FlatList
        contentContainerStyle={styles.content}
        data={fields}
        keyExtractor={(item) => item.key}
        ListHeaderComponent={renderHeader}
        removeClippedSubviews={LIST_REMOVE_CLIPPED_SUBVIEWS}
        renderItem={({ item }) => (
          <View
            accessible
            accessibilityLabel={`${item.label}: ${item.value}`}
            style={styles.field}
            testID={`error-log-detail-field-${item.key}`}
          >
            <Text style={styles.fieldLabel}>{item.label}</Text>
            <Text selectable style={styles.fieldValue}>
              {item.value}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
