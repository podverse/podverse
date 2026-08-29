import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Share, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { Button } from '../../components/primitives';
import { ListEmpty } from '../../components/state/ListEmpty';
import { isMobileE2eFromEnv } from '../../config/env';
import type { SyncEventLogEntry } from '../../data/repositories';
import { formatSyncEventLogExport, syncEventLogRepository } from '../../data/repositories';
import type { SyncJobKind } from '../../sync/syncJobKinds';
import { SYNC_JOB_KINDS, SYNC_JOB_LABEL_KEYS } from '../../sync/syncJobKinds';
import { useTheme } from '../../theme/useTheme';

/**
 * Diagnostics for sync failures the indicator stays silent about.
 *
 * Plain and dense on purpose: the reason to open this screen is that something is not working and
 * somebody needs to be told what, so it optimizes for getting the contents out rather than for
 * looking like the rest of the app.
 */

const isSyncJobKind = (value: string): value is SyncJobKind => {
  return SYNC_JOB_KINDS.some((kind) => kind === value);
};

const OUTCOME_LABEL_KEYS: Record<SyncEventLogEntry['outcome'], string> = {
  failure: 'sync.log.outcome_failure',
  skipped: 'sync.log.outcome_skipped',
  success: 'sync.log.outcome_success',
};

export function MoreSyncLogScreen() {
  const { i18n, t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const [entries, setEntries] = useState<SyncEventLogEntry[]>([]);
  const [isClearConfirmVisible, setIsClearConfirmVisible] = useState<boolean>(false);

  const load = useCallback(async () => {
    setEntries(await syncEventLogRepository.list());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  // Absolute rather than relative: "2 days ago" is fine for a notification and useless in a report
  // somebody reads a week later. Component options rather than `dateStyle`/`timeStyle`, which are
  // the parts of ECMA-402 that Hermes has been least consistent about across platforms.
  const timestampFormatter = useMemo(() => {
    return new Intl.DateTimeFormat(i18n.language, {
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      month: '2-digit',
      second: '2-digit',
      year: 'numeric',
    });
  }, [i18n.language]);

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
          marginBottom: tokens.spacing.lg,
        },
        code: {
          color: themeStyles.textPrimary.color,
          fontSize: 13,
          marginTop: tokens.spacing.xs,
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
        message: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
          marginTop: tokens.spacing.xs,
        },
        meta: {
          color: themeStyles.textSecondary.color,
          fontSize: 12,
          marginTop: tokens.spacing.xs,
        },
        row: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginTop: tokens.spacing.sm,
          padding: tokens.spacing.md,
        },
        rowTitle: {
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          fontWeight: '600',
        },
        screen: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
      }),
    [themeStyles, tokens]
  );

  const renderRow = ({ item }: { item: SyncEventLogEntry }) => {
    const jobKind = item.jobKind;
    const jobLabel = isSyncJobKind(jobKind) ? t(SYNC_JOB_LABEL_KEYS[jobKind]) : jobKind;
    const outcomeLabel = t(OUTCOME_LABEL_KEYS[item.outcome]);
    const timestamp = timestampFormatter.format(new Date(item.occurredAt));

    // One announcement per entry: four fragments read in sequence is how a screen reader user ends
    // up unable to tell which code belonged to which job.
    const accessibilityLabel = [jobLabel, outcomeLabel, timestamp, item.errorCode, item.message]
      .filter((part) => part !== null && part !== '')
      .join('. ');

    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel}
        style={styles.row}
        testID={`sync-log-row-${item.id}`}
      >
        <Text style={styles.rowTitle}>{jobLabel}</Text>
        <Text style={styles.meta}>{`${outcomeLabel} · ${timestamp}`}</Text>
        {item.errorCode === null ? null : (
          <Text selectable style={styles.code} testID={`sync-log-row-code-${item.id}`}>
            {item.errorCode}
          </Text>
        )}
        {item.message === null ? null : (
          <Text numberOfLines={3} style={styles.message}>
            {item.message}
          </Text>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      <Text style={styles.intro}>{t('sync.log.intro')}</Text>
      <View style={styles.actions}>
        <Button
          disabled={entries.length === 0}
          label={t('sync.log.export')}
          onPress={handleExport}
          size="sm"
          testID="sync-log-export"
        />
        <Button
          disabled={entries.length === 0}
          label={t('sync.log.clear')}
          onPress={() => {
            setIsClearConfirmVisible(true);
          }}
          size="sm"
          testID="sync-log-clear"
          variant="secondary"
        />
      </View>
    </View>
  );

  return (
    <View style={styles.screen} testID="sync-log-screen">
      <FlatList
        contentContainerStyle={styles.content}
        data={entries}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<ListEmpty messageKey="sync.log.empty" testID="sync-log-empty" />}
        ListHeaderComponent={renderHeader}
        renderItem={renderRow}
      />
      <ConfirmDialog
        body={t('sync.log.clear_confirm_body')}
        cancelLabel={t('misc.cancel')}
        cancelTestID="sync-log-clear-cancel"
        confirmLabel={t('sync.log.clear')}
        confirmTestID="sync-log-clear-confirm"
        onCancel={() => {
          setIsClearConfirmVisible(false);
        }}
        onConfirm={handleClear}
        testID="sync-log-clear-confirm-dialog"
        title={t('sync.log.clear_confirm_title')}
        visible={isClearConfirmVisible}
      />
    </View>
  );
}
