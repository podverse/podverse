import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { FormActions, TextField } from '../../components/form';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { getBuiltInMobileApiBaseUrl } from '../../config';
import { readCustomApiBaseUrlOverride, useCustomApiBaseUrl } from '../../config/customApiEndpoint';
import type { CustomApiProbeFailure } from '../../config/customApiProbe';
import { probeCustomApiBaseUrl } from '../../config/customApiProbe';
import {
  customApiCommitOpensClearScreen,
  normalizeCustomApiBaseUrl,
  planCustomApiCommit,
} from '../../config/customApiUrl';
import type { MoreStackParamList } from '../../navigation';
import { MORE_STACK_ROUTES } from '../../navigation';
import { formActionsGap, formActionsTopGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type Props = NativeStackScreenProps<MoreStackParamList, 'MoreCustomApi'>;

type Feedback =
  { kind: 'saved' } | { kind: 'reset_done' } | { kind: 'invalid_url' } | CustomApiProbeFailure;

const HTTP_URL_PREFIX = /^https?:\/\//i;

/**
 * Empty text is a valid "use the original API" value. Text that is not an http(s) address is
 * invalid immediately. An http(s) address that is not a canonical API base waits for blur or Save.
 */
const isCustomApiFieldInvalid = (
  draft: string,
  blurred: boolean,
  saveRejected: boolean
): boolean => {
  const trimmed = draft.trim();
  if (trimmed === '' || normalizeCustomApiBaseUrl(trimmed) !== null) {
    return false;
  }

  return !HTTP_URL_PREFIX.test(trimmed) || blurred || saveRejected;
};

export function MoreCustomApiScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const saved = useCustomApiBaseUrl();
  const { styles: themeStyles, tokens } = useTheme();
  const [draft, setDraft] = useState(saved ?? '');
  const [draftSource, setDraftSource] = useState(saved);
  const [urlBlurred, setUrlBlurred] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const busyRef = useRef(false);

  if (saved !== draftSource) {
    setDraftSource(saved);
    setDraft(saved ?? '');
    setUrlBlurred(false);
  }

  const styles = StyleSheet.create({
    actions: {
      marginTop: formActionsTopGap(tokens.spacing),
    },
    body: {
      ...typography.body,
      color: themeStyles.textSecondary.color,
    },
    error: {
      ...typography.body,
      color: tokens.text.danger,
    },
    label: {
      ...typography.label,
      color: themeStyles.textPrimary.color,
    },
    reset: {
      marginTop: formActionsGap(tokens.spacing),
    },
    stack: {
      gap: tokens.spacing.md,
    },
    status: {
      ...typography.body,
      color: themeStyles.textPrimary.color,
    },
    url: {
      ...typography.body,
      color: themeStyles.textPrimary.color,
    },
  });

  const builtIn = getBuiltInMobileApiBaseUrl();
  const isBusy = isSaving;

  const feedbackText = (value: Feedback): string => {
    switch (value.kind) {
      case 'saved':
        return t('custom_api.saved');
      case 'reset_done':
        return t('custom_api.reset_done');
      case 'invalid_url':
        return t('custom_api.invalid_url');
      case 'unreachable':
        return t('custom_api.unreachable');
      case 'unexpected_body':
        return t('custom_api.unexpected_body');
      case 'unexpected_status':
        return t('custom_api.unexpected_status', { status: value.status });
    }
  };

  const fieldInvalid = isCustomApiFieldInvalid(draft, urlBlurred, feedback?.kind === 'invalid_url');
  const displayedFeedback: Feedback | null =
    fieldInvalid && (feedback === null || feedback.kind === 'invalid_url')
      ? { kind: 'invalid_url' }
      : feedback;
  const isError =
    displayedFeedback !== null &&
    displayedFeedback.kind !== 'saved' &&
    displayedFeedback.kind !== 'reset_done';

  const commit = async (draftValue: string) => {
    if (busyRef.current) {
      return;
    }
    const plan = planCustomApiCommit(draftValue, readCustomApiBaseUrlOverride(), builtIn);
    if (plan.action === 'unchanged') {
      return;
    }
    if (plan.action === 'invalid') {
      setFeedback({ kind: 'invalid_url' });
      return;
    }
    if (!customApiCommitOpensClearScreen(plan)) {
      return;
    }
    if (plan.action === 'clear') {
      navigation.navigate(MORE_STACK_ROUTES.MoreCustomApiClear, { baseUrl: null, webOrigin: null });
      return;
    }

    busyRef.current = true;
    setIsSaving(true);
    setFeedback(null);
    try {
      const result = await probeCustomApiBaseUrl(plan.baseUrl);
      if (!result.ok) {
        setFeedback(result.failure);
        return;
      }
      navigation.navigate(MORE_STACK_ROUTES.MoreCustomApiClear, {
        baseUrl: result.baseUrl,
        webOrigin: result.webOrigin,
      });
    } catch {
      setFeedback({ kind: 'unreachable' });
    } finally {
      busyRef.current = false;
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (busyRef.current) {
      return;
    }
    if (readCustomApiBaseUrlOverride() === null) {
      setFeedback(null);
      setUrlBlurred(false);
      busyRef.current = true;
      try {
        setDraft('');
        setFeedback({ kind: 'reset_done' });
      } finally {
        busyRef.current = false;
      }
      return;
    }
    navigation.navigate(MORE_STACK_ROUTES.MoreCustomApiClear, { baseUrl: null, webOrigin: null });
  };

  return (
    <MobileScreenContainer automaticallyAdjustKeyboardInsets testID="custom-api-screen">
      <View style={styles.stack}>
        <Text style={styles.body}>{t('custom_api.intro')}</Text>
        <Text style={styles.label}>{t('custom_api.original_label')}</Text>
        <Text selectable style={styles.url} testID="custom-api-original-url">
          {builtIn ?? t('custom_api.original_missing')}
        </Text>
        <Text style={styles.body} testID="custom-api-active">
          {saved === null ? t('custom_api.using_original') : t('custom_api.using_custom')}
        </Text>
        <TextField
          accessibilityLabel={t('custom_api.url_label')}
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect={false}
          editable={!isBusy}
          eyebrow={t('custom_api.url_label')}
          invalid={fieldInvalid}
          keyboardType="url"
          onBlur={() => {
            setUrlBlurred(true);
          }}
          onChangeText={(value) => {
            setDraft(value);
            setFeedback(null);
          }}
          onSubmitEditing={() => {
            void commit(draft);
          }}
          placeholder={t('custom_api.url_placeholder')}
          testID="custom-api-url-input"
          textContentType="URL"
          value={draft}
        />
        {displayedFeedback !== null ? (
          <Text
            accessibilityLiveRegion="polite"
            style={isError ? styles.error : styles.status}
            testID={isError ? 'custom-api-error' : 'custom-api-status'}
          >
            {feedbackText(displayedFeedback)}
          </Text>
        ) : null}
      </View>
      <FormActions
        actions={[
          {
            disabled: isBusy,
            label: t('misc.cancel'),
            onPress: () => {
              navigation.goBack();
            },
            testID: 'custom-api-cancel',
            variant: 'secondary',
          },
          {
            disabled: isBusy,
            label: t('misc.save'),
            loading: isSaving,
            onPress: () => {
              void commit(draft);
            },
            testID: 'custom-api-save',
          },
        ]}
        style={styles.actions}
        testID="custom-api-actions"
      />
      <FormActions
        actions={[
          {
            disabled: isBusy,
            label: t('custom_api.reset'),
            onPress: () => {
              void handleReset();
            },
            testID: 'custom-api-reset',
            variant: 'danger',
          },
        ]}
        style={styles.reset}
      />
    </MobileScreenContainer>
  );
}
