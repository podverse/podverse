import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import { FormActions } from '../../components/form/FormActions';
import { Button } from '../../components/primitives/Button';
import { CheckboxRow } from '../../components/primitives/CheckboxMark';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { HeaderBarChrome } from '../../components/screen/HeaderBarChrome';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { v4CarryoverRepository } from '../../data/repositories/v4CarryoverRepository';
import { buildDeviceOpmlExport } from '../../lib/opml/opmlExportFile';
import { shareOpmlFile } from '../../lib/opml/shareOpmlFile';
import { buildCarryoverOutlines } from '../../migration/v4/carryoverOutlines';
import { notifyV4CarryoverRowsSaved } from '../../migration/v4/readV4LocalState';
import { formActionsTopGap, settingsCardInnerGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    decision: {
      gap: settingsCardInnerGap(tokens.spacing),
      marginTop: formActionsTopGap(tokens.spacing),
    },
    prose: {
      ...typography.prose,
      color: themeStyles.textPrimary.color,
    },
    proseStack: {
      gap: settingsCardInnerGap(tokens.spacing),
    },
    root: {
      backgroundColor: themeStyles.screen.backgroundColor,
      flex: 1,
    },
    status: {
      ...typography.body,
      color: themeStyles.textSecondary.color,
    },
  });

/**
 * Asks a signed-out person to save the shows already staged on this phone before those rows
 * are resolved.
 *
 * Export builds the OPML file from the staged titles and addresses and opens the share sheet.
 * It does not look up feeds. Continue records that the copy may start, asks for a sync run,
 * and closes. Sign In opens the existing sign-in sheet and does not start the copy.
 */
export function V4ContinueMigrationScreen() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const { onRequestLogin } = useAuthPrompt();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const styles = useThemedStyles(createStyles);
  const [checked, setChecked] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const [isContinuing, setIsContinuing] = useState(false);
  const [continueFailed, setContinueFailed] = useState(false);
  const exportingRef = useRef(false);
  const continuingRef = useRef(false);
  const exportAbortRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      exportAbortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    if (status !== 'authenticated') {
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation, status]);

  const signInLabel = t('migration.v4_continue.sign_in');

  const onExport = () => {
    if (exportingRef.current) {
      return;
    }
    exportingRef.current = true;
    const controller = new AbortController();
    exportAbortRef.current?.abort();
    exportAbortRef.current = controller;
    setIsExporting(true);
    setExportFailed(false);

    void (async () => {
      try {
        const rows = await v4CarryoverRepository.listOutlineSources();
        if (controller.signal.aborted) {
          return;
        }
        const outlines = buildCarryoverOutlines(rows);
        const text = buildDeviceOpmlExport({
          addByRssFeeds: outlines.addByRssFeeds,
          directoryFeeds: outlines.directoryFeeds,
        });
        if (text === null) {
          setExportFailed(true);
          return;
        }
        await shareOpmlFile(text, controller.signal);
      } catch {
        if (!controller.signal.aborted) {
          setExportFailed(true);
        }
      } finally {
        exportingRef.current = false;
        if (exportAbortRef.current === controller) {
          exportAbortRef.current = null;
        }
        if (!controller.signal.aborted) {
          setIsExporting(false);
        }
      }
    })();
  };

  const onContinue = () => {
    if (!checked || continuingRef.current) {
      return;
    }
    continuingRef.current = true;
    setIsContinuing(true);
    setContinueFailed(false);

    void (async () => {
      try {
        await v4CarryoverRepository.setCopyAllowed();
        notifyV4CarryoverRowsSaved();
        if (navigation.canGoBack()) {
          navigation.goBack();
          return;
        }
        continuingRef.current = false;
        setIsContinuing(false);
      } catch {
        continuingRef.current = false;
        setIsContinuing(false);
        setContinueFailed(true);
      }
    })();
  };

  return (
    <View style={styles.root} testID="v4-continue-migration-screen">
      <HeaderBarChrome
        right={
          <HeaderBarAction
            accessibilityLabel={signInLabel}
            label={signInLabel}
            onPress={onRequestLogin}
            testID="v4-continue-migration-sign-in"
          />
        }
        testID="v4-continue-migration-header"
        title={t('migration.v4_continue.title')}
      />
      <MobileScreenContainer testID="v4-continue-migration-body">
        <View style={styles.proseStack}>
          <Text style={styles.prose}>{t('migration.v4_continue.body_file')}</Text>
          <Text style={styles.prose}>{t('migration.v4_continue.body_account')}</Text>
        </View>
        <View style={styles.decision}>
          <Button
            fullWidth
            label={t('settings.opml.export_button')}
            loading={isExporting}
            onPress={onExport}
            size="form"
            testID="v4-continue-migration-export"
            variant="secondary"
          />
          {exportFailed ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.status}
              testID="v4-continue-migration-export-error"
            >
              {t('migration.v4_continue.export_error')}
            </Text>
          ) : null}
          <CheckboxRow
            checked={checked}
            label={t('migration.v4_continue.saved_copy')}
            onPress={() => {
              setChecked((current) => !current);
            }}
            testID="v4-continue-migration-saved-copy"
          />
          <FormActions
            actions={[
              {
                disabled: !checked,
                label: t('migration.v4_continue.continue'),
                loading: isContinuing,
                onPress: onContinue,
                testID: 'v4-continue-migration-continue',
              },
            ]}
          />
          {continueFailed ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.status}
              testID="v4-continue-migration-continue-error"
            >
              {t('migration.v4_continue.continue_error')}
            </Text>
          ) : null}
        </View>
      </MobileScreenContainer>
    </View>
  );
}
