import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Linking, Platform, StyleSheet, Text, View } from 'react-native';

import { Badge, Button, LIST_REMOVE_CLIPPED_SUBVIEWS } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { LoadingSection } from '../../components/state/LoadingSection';
import { getMobileConfig } from '../../config';
import { isMobileE2eFromEnv } from '../../config/env';
import type { SyncEventLogEntry } from '../../data/repositories';
import {
  formatSyncEventLogEntryReport,
  listSyncEventLogDetails,
  syncEventLogRepository,
} from '../../data/repositories';
import type { MoreStackParamList } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import { readErrorLogDeviceContext } from './errorLogDeviceContext.read';
import { buildErrorReportMailto } from './errorLogMailto';
import {
  ERROR_LOG_OUTCOME_BADGE_TONES,
  ERROR_LOG_OUTCOME_LABEL_KEYS,
  errorLogCategoryLabel,
  errorLogMessage,
  isCreatorHostedEntry,
  useErrorLogTimestampFormatter,
} from './errorLogPresentation';

const ACTION_STATUS_RESET_MS = 2500;

const DEVICE_FIELD_LABEL_KEYS: Record<string, string> = {
  app_build: 'error_log.detail.device.app_build',
  app_version: 'error_log.detail.device.app_version',
  device_type: 'error_log.detail.device.device_type',
  locale: 'error_log.detail.device.locale',
  model: 'error_log.detail.device.model',
  os: 'error_log.detail.device.os',
  runtime: 'error_log.detail.device.runtime',
  screen: 'error_log.detail.device.screen',
};

type DetailActionStatus = 'copied' | 'copy_failed' | 'email_failed' | 'idle';

type DetailField = {
  key: string;
  label: string;
  value: string;
};

type LoadState =
  { entry: SyncEventLogEntry; status: 'loaded' } | { status: 'loading' } | { status: 'missing' };

/**
 * One error log entry in full: every recorded identifier, address, and status, each selectable,
 * plus copy and email actions. Email opens the default mail client with the report filled in;
 * the message is not sent until the person sends it. Device facts follow a divider and are part
 * of that same report.
 */
export function MoreErrorLogDetailScreen() {
  const { i18n, t } = useTranslation();
  const route = useRoute<RouteProp<MoreStackParamList, 'MoreErrorLogDetail'>>();
  const { entryId } = route.params;
  const { styles: themeStyles, tokens } = useTheme();
  const timestampFormatter = useErrorLogTimestampFormatter();
  const contactEmail = getMobileConfig().contactEmail;
  const deviceFields = readErrorLogDeviceContext(i18n.language);
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [actionStatus, setActionStatus] = useState<DetailActionStatus>('idle');

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
    if (actionStatus === 'idle') {
      return undefined;
    }
    const timer = setTimeout(() => {
      setActionStatus('idle');
    }, ACTION_STATUS_RESET_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [actionStatus]);

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

  const buildReport = useCallback(() => {
    if (entry === null) {
      return null;
    }
    return formatSyncEventLogEntryReport(entry, { device: deviceFields });
  }, [deviceFields, entry]);

  const handleCopy = useCallback(() => {
    const report = buildReport();
    if (report === null) {
      return;
    }
    void Clipboard.setStringAsync(report)
      .then((didCopy) => {
        setActionStatus(didCopy ? 'copied' : 'copy_failed');
      })
      .catch(() => {
        setActionStatus('copy_failed');
      });
  }, [buildReport]);

  const handleEmail = useCallback(() => {
    const report = buildReport();
    if (report === null || entry === null) {
      return;
    }
    // The mail client leaves the app, which stops Maestro, so E2E exercises the button without it.
    if (isMobileE2eFromEnv()) {
      return;
    }
    const mailto = buildErrorReportMailto({
      email: contactEmail,
      overflowBody: t('error_log.detail.email_overflow'),
      report,
      subject: t('error_log.detail.email_subject', {
        code: entry.errorCode ?? entry.jobKind,
      }),
    });
    if (mailto === null) {
      setActionStatus('email_failed');
      return;
    }

    const openMail = () => {
      void Linking.openURL(mailto.url).catch(() => {
        setActionStatus('email_failed');
      });
    };

    if (mailto.includesReport) {
      openMail();
      return;
    }

    void Clipboard.setStringAsync(report)
      .then((didCopy) => {
        if (!didCopy) {
          setActionStatus('copy_failed');
          return;
        }
        setActionStatus('copied');
        openMail();
      })
      .catch(() => {
        setActionStatus('copy_failed');
      });
  }, [buildReport, contactEmail, entry, t]);

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
          flexWrap: 'wrap',
          gap: tokens.spacing.md,
          marginTop: tokens.spacing.md,
        },
        copyStatus: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
        },
        deviceDivider: {
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: 1,
          marginTop: tokens.spacing.xl,
        },
        deviceHeading: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          fontWeight: '600',
          marginTop: tokens.spacing.md,
        },
        field: {
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: StyleSheet.hairlineWidth,
          gap: tokens.spacing.xs,
          paddingVertical: tokens.spacing.md,
        },
        fieldFirst: {
          borderTopWidth: 0,
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
  const actionStatusText = (() => {
    switch (actionStatus) {
      case 'copied':
        return t('error_log.detail.copied');
      case 'copy_failed':
        return t('error_log.detail.copy_failed');
      case 'email_failed':
        return t('error_log.detail.email_failed');
      case 'idle':
        return '';
    }
  })();

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
        <Button
          label={t('error_log.detail.email')}
          onPress={handleEmail}
          size="sm"
          testID="error-log-detail-email"
          variant="secondary"
        />
        <Text
          accessibilityLiveRegion="polite"
          style={styles.copyStatus}
          testID="error-log-detail-copy-status"
        >
          {actionStatusText}
        </Text>
      </View>
    </View>
  );

  const renderDeviceSection = () => (
    <View testID="error-log-detail-device">
      <View style={styles.deviceDivider} />
      <Text accessibilityRole="header" style={styles.deviceHeading}>
        {t('error_log.detail.device_heading')}
      </Text>
      {deviceFields.map((field, index) => {
        const labelKey = DEVICE_FIELD_LABEL_KEYS[field.key];
        const label = labelKey === undefined ? field.key : t(labelKey);
        return (
          <View
            accessibilityLabel={`${label}: ${field.value}`}
            accessible
            key={field.key}
            style={[styles.field, index === 0 ? styles.fieldFirst : undefined]}
            testID={`error-log-detail-device-${field.key}`}
          >
            <Text style={styles.fieldLabel}>{label}</Text>
            <Text selectable style={styles.fieldValue}>
              {field.value}
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.screen} testID="error-log-detail-screen">
      <FlatList
        contentContainerStyle={styles.content}
        data={fields}
        keyExtractor={(item) => item.key}
        ListFooterComponent={renderDeviceSection}
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
