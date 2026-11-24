import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { readSecureToken } from '../../auth/secureTokenStorage';
import { FormActions } from '../../components/form';
import { Card } from '../../components/primitives/Card';
import { ListRow } from '../../components/primitives/ListRow';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { SectionHeading } from '../../components/section/SectionHeading';
import type { CustomApiClearCopyRow } from '../../config/customApiClearLists';
import {
  CUSTOM_API_CLEAR_KEPT_ROWS,
  CUSTOM_API_CLEAR_REMOVED_ROWS,
} from '../../config/customApiClearLists';
import { clearLocalLibraryForApiSwitch } from '../../data/clearLocalLibraryForApiSwitch';
import { useOpmlExport } from '../../hooks/useOpmlExport';
import type { MoreStackParamList } from '../../navigation';
import { MORE_STACK_ROUTES } from '../../navigation';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { formActionsTopGap, settingsCardInnerGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreCustomApiClear'>;

type StackRouteSnapshot = {
  name: string;
  params?: object;
  state?: StackSnapshot;
};

type StackSnapshot = {
  index?: number;
  key?: string;
  routes: readonly StackRouteSnapshot[];
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const overflowStackNames = (): ReadonlySet<string> => {
  return new Set<string>([
    MORE_STACK_ROUTES.MoreOverflowHome,
    MORE_STACK_ROUTES.MoreOverflowBrowse,
    MORE_STACK_ROUTES.MoreOverflowRecommendations,
    MORE_STACK_ROUTES.MoreOverflowLibrary,
  ]);
};

const readStackSnapshot = (value: unknown): StackSnapshot | undefined => {
  if (!isRecord(value) || !Array.isArray(value.routes)) {
    return undefined;
  }

  const routes: StackRouteSnapshot[] = [];
  for (const route of value.routes) {
    if (!isRecord(route) || typeof route.name !== 'string') {
      return undefined;
    }
    const params = isRecord(route.params) ? route.params : undefined;
    const nested = route.state === undefined ? undefined : readStackSnapshot(route.state);
    routes.push({
      name: route.name,
      ...(params === undefined ? {} : { params }),
      ...(nested === undefined ? {} : { state: nested }),
    });
  }

  return {
    index: typeof value.index === 'number' ? value.index : undefined,
    key: typeof value.key === 'string' ? value.key : undefined,
    routes,
  };
};

const clearScreenBaseUrl = (
  params: MoreStackParamList['MoreCustomApiClear'] | undefined
): { baseUrl: string | null } | undefined => {
  if (params === undefined || !('baseUrl' in params)) {
    return undefined;
  }
  return { baseUrl: params.baseUrl };
};

/**
 * Other tabs return to their first screen so a detail page for the previous server is not left
 * open. Overflow copies of those stacks do the same. The More stack stays put.
 */
const resetOtherStacksAfterApiSwitch = (
  parent: NavigationProp<ParamListBase> | undefined
): void => {
  if (parent === undefined) {
    return;
  }
  const tabState = readStackSnapshot(parent.getState());
  if (tabState === undefined) {
    return;
  }

  const resetToFirstRoute = (stack: StackSnapshot | undefined): void => {
    if (
      stack === undefined ||
      stack.key === undefined ||
      stack.index === undefined ||
      stack.index <= 0
    ) {
      return;
    }
    const first = stack.routes[0];
    if (first === undefined) {
      return;
    }
    parent.dispatch({
      ...CommonActions.reset({
        index: 0,
        routes: [
          first.params === undefined
            ? { name: first.name }
            : { name: first.name, params: first.params },
        ],
      }),
      target: stack.key,
    });
  };

  const overflowNames = overflowStackNames();
  for (const tab of tabState.routes) {
    if (tab.name === 'More') {
      for (const route of tab.state?.routes ?? []) {
        if (overflowNames.has(route.name)) {
          resetToFirstRoute(route.state);
        }
      }
      continue;
    }
    resetToFirstRoute(tab.state);
  }
};

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    actions: {
      marginTop: formActionsTopGap(tokens.spacing),
    },
    error: {
      ...typography.body,
      color: tokens.text.danger,
    },
    exportBlock: {
      gap: settingsCardInnerGap(tokens.spacing),
    },
    intro: {
      ...typography.prose,
      color: themeStyles.textPrimary.color,
    },
    notice: {
      ...typography.body,
      color: themeStyles.textSecondary.color,
    },
    page: {
      gap: tokens.spacing.xl,
    },
    row: {
      paddingHorizontal: tokens.spacing.lg,
    },
    rowDivider: {
      borderTopColor: themeStyles.border.borderColor,
      borderTopWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: tokens.spacing.lg,
    },
    section: {
      gap: tokens.spacing.lg,
    },
  });

function ClearRowList({
  rows,
  testIDPrefix,
}: {
  rows: readonly CustomApiClearCopyRow[];
  testIDPrefix: string;
}) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <Card padded={false}>
      {rows.map((entry, index) => (
        <View key={entry.id} style={index > 0 ? styles.rowDivider : styles.row}>
          <ListRow
            paddingVertical={tokens.spacing.lg}
            subtitle={t(entry.bodyKey)}
            testID={`${testIDPrefix}-${entry.id}`}
            title={t(entry.titleKey)}
          />
        </View>
      ))}
    </Card>
  );
}

const sessionStillHasAccessToken = async (): Promise<boolean> => {
  const accessToken = await readSecureToken('accessToken');
  return accessToken !== null && accessToken !== '';
};

export function MoreCustomApiClearScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { logout, status } = useAuth();
  const { clearNowPlaying } = usePlaybackSession();
  const opmlExport = useOpmlExport();
  const clearTarget = clearScreenBaseUrl(route.params);
  const [failed, setFailed] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const busyRef = useRef(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  useEffect(() => {
    if (clearTarget === undefined) {
      navigation.goBack();
    }
  }, [clearTarget, navigation]);

  if (clearTarget === undefined) {
    return null;
  }

  const handleConfirm = () => {
    if (busyRef.current || opmlExport.isExporting) {
      return;
    }
    const baseUrl = clearTarget.baseUrl;
    busyRef.current = true;
    setIsClearing(true);
    setFailed(false);
    void (async () => {
      try {
        if (statusRef.current === 'authenticated') {
          // Revoke on this server before the wipe saves the next address.
          try {
            await logout();
          } catch {
            // The revoke can reject after the local session is already cleared.
          }
          if (await sessionStillHasAccessToken()) {
            setFailed(true);
            return;
          }
        }
        clearNowPlaying();
        await clearLocalLibraryForApiSwitch(baseUrl);
      } catch {
        setFailed(true);
        return;
      } finally {
        busyRef.current = false;
        setIsClearing(false);
      }
      const parent = navigation.getParent();
      navigation.goBack();
      resetOtherStacksAfterApiSwitch(parent);
    })();
  };

  return (
    <MobileScreenContainer scrollEnabled testID="custom-api-clear-screen">
      <View style={styles.page}>
        <View style={styles.exportBlock}>
          <Text style={styles.intro}>{t('custom_api.clear.intro')}</Text>
          <Text style={styles.intro}>{t('custom_api.clear.export_body')}</Text>
          <FormActions
            actions={[
              {
                disabled:
                  isClearing || opmlExport.source === 'unavailable' || opmlExport.isExporting,
                label: t('settings.opml.export_button'),
                loading: opmlExport.isExporting,
                onPress: () => {
                  void opmlExport.exportOpml();
                },
                testID: 'custom-api-clear-export',
                variant: 'secondary',
              },
            ]}
            testID="custom-api-clear-export-actions"
          />
          {opmlExport.notice !== null ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.notice}
              testID="custom-api-clear-export-notice"
            >
              {t(opmlExport.notice.key, opmlExport.notice.params)}
            </Text>
          ) : null}
          {opmlExport.errorKey !== null ? (
            <Text
              accessibilityLiveRegion="polite"
              style={styles.error}
              testID="custom-api-clear-export-error"
            >
              {t(opmlExport.errorKey)}
            </Text>
          ) : null}
        </View>
        <View style={styles.section}>
          <SectionHeading testID="custom-api-clear-removed-heading">
            {t('custom_api.clear.removed_heading')}
          </SectionHeading>
          <ClearRowList
            rows={CUSTOM_API_CLEAR_REMOVED_ROWS}
            testIDPrefix="custom-api-clear-removed"
          />
        </View>
        <View style={styles.section}>
          <SectionHeading testID="custom-api-clear-kept-heading">
            {t('custom_api.clear.kept_heading')}
          </SectionHeading>
          <ClearRowList rows={CUSTOM_API_CLEAR_KEPT_ROWS} testIDPrefix="custom-api-clear-kept" />
        </View>
        {failed ? (
          <Text
            accessibilityLiveRegion="polite"
            style={styles.error}
            testID="custom-api-clear-error"
          >
            {t('custom_api.clear.failed')}
          </Text>
        ) : null}
      </View>
      <FormActions
        actions={[
          {
            disabled: isClearing,
            label: t('misc.cancel'),
            onPress: () => {
              navigation.goBack();
            },
            testID: 'custom-api-clear-cancel',
            variant: 'secondary',
          },
          {
            disabled: isClearing || opmlExport.isExporting,
            label: t('custom_api.clear.confirm'),
            loading: isClearing,
            onPress: handleConfirm,
            testID: 'custom-api-clear-confirm',
            variant: 'danger',
          },
        ]}
        style={styles.actions}
        testID="custom-api-clear-actions"
      />
    </MobileScreenContainer>
  );
}
