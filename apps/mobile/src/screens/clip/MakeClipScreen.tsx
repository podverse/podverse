import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { CLIP_END_PREVIEW_LEAD_SECONDS } from '@podverse/helpers';
import {
  MEDIA_JUMP_BACK_SECONDS,
  MEDIA_JUMP_FORWARD_SECONDS,
  MEDIA_MINI_JUMP_SECONDS,
} from '@podverse/helpers';
import { SharableStatusEnum } from '@podverse/helpers';

import { ClipTimeCard } from '../../components/clip/ClipTimeCard';
import { ManagedCopyModal } from '../../components/content/ManagedCopyModal';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { FormActions, FormField, OptionChipGroup, TextField } from '../../components/form';
import { FullPlayerScrubber } from '../../components/player/FullPlayerScrubber';
import { MakeClipTransportRow } from '../../components/player/MakeClipTransportRow';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { HeaderBarChrome } from '../../components/screen/HeaderBarChrome';
import { LoadingSection } from '../../components/state/LoadingSection';
import { RetryableError } from '../../components/state/RetryableError';
import { useActionError } from '../../feedback/ActionErrorProvider';
import { useManagedCopy } from '../../hooks/useManagedCopy';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { useNowPlayingChapters } from '../../playback/useNowPlayingChapters';
import type { ClipVisibility } from '../../prefs/clipPrefs';
import { hasSeenMakeClipHowToPref, writeSeenMakeClipHowToPref } from '../../prefs/clipPrefs';
import { formActionsGap, screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import type { MakeClipValidationReason } from './makeClipValidation';
import type { DeleteClipResult, SaveClipResult } from './useMakeClipForm';
import { useMakeClipForm } from './useMakeClipForm';

type MakeClipStackParamList = {
  MakeClip: { mode: 'create' } | { mode: 'edit'; clipId: string };
};

type MakeClipScreenProps = NativeStackScreenProps<MakeClipStackParamList, 'MakeClip'>;

const VALIDATION_REASON_COPY_KEYS: Record<MakeClipValidationReason, string> = {
  end_must_be_after_start: 'features.clip.end_must_be_after_start',
  start_required: 'misc.required',
};

const VISIBILITY_OPTIONS: readonly { labelKey: string; testID: string; value: ClipVisibility }[] = [
  {
    labelKey: 'misc.sharable_status.public',
    testID: 'make-clip-visibility-public',
    value: SharableStatusEnum.Public,
  },
  {
    labelKey: 'misc.sharable_status.unlisted',
    testID: 'make-clip-visibility-unlisted',
    value: SharableStatusEnum.Unlisted,
  },
  {
    labelKey: 'misc.sharable_status.private',
    testID: 'make-clip-visibility-private',
    value: SharableStatusEnum.Private,
  },
];

export function MakeClipScreen({ navigation, route }: MakeClipScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const {
    beginAuthoringHold,
    clearPauseBoundary,
    endAuthoringHold,
    jumpBy,
    lastPlaybackError,
    pause,
    previewWindow,
    resume,
    retryPlayback,
    transportState,
  } = usePlaybackSession();
  const { chapters } = useNowPlayingChapters();
  const { handleGateError } = useMembershipGate();
  const { openPlaybackError } = useActionError();
  const form = useMakeClipForm(route.params);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [createdClipUrl, setCreatedClipUrl] = useState<string | null>(null);
  const [isFaqOpen, setIsFaqOpen] = useState<boolean>(false);
  const [isHowToOpen, setIsHowToOpen] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const faqCopy = useManagedCopy({ enabled: isFaqOpen, slug: 'faq' });
  const howToCopy = useManagedCopy({ enabled: isHowToOpen, slug: 'clip-how-to' });

  // Clip authoring must keep the current item now-playing even if the playhead reaches the end
  // with nothing queued next. This screen never auto-dismisses on an empty session.
  useEffect(() => {
    beginAuthoringHold();
    return () => {
      endAuthoringHold();
      clearPauseBoundary();
    };
  }, [beginAuthoringHold, clearPauseBoundary, endAuthoringHold]);

  useEffect(() => {
    if (route.params.mode !== 'create') {
      return;
    }
    let cancelled = false;
    void hasSeenMakeClipHowToPref().then((hasSeen) => {
      if (cancelled || hasSeen) {
        return;
      }
      setIsHowToOpen(true);
      void writeSeenMakeClipHowToPref();
    });
    return () => {
      cancelled = true;
    };
  }, [route.params.mode]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          ...screenBodyInsets(tokens.spacing),
          gap: tokens.spacing.md,
          paddingBottom: tokens.spacing['2xl'],
        },
        followingActions: {
          marginTop: formActionsGap(tokens.spacing),
        },
        root: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        tip: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
        },
      }),
    [themeStyles, tokens]
  );

  const isEdit = route.params.mode === 'edit';
  const canSave = !form.isSaving && form.currentResource !== null;
  const heading = t(isEdit ? 'features.clip.edit_clip' : 'features.clip.create_clip');
  const visibilityOptions = useMemo(
    () =>
      VISIBILITY_OPTIONS.map((option) => ({
        label: t(option.labelKey),
        testID: option.testID,
        value: option.value,
      })),
    [t]
  );

  const handleSaveResult = useCallback(
    (result: SaveClipResult) => {
      if (result.ok) {
        if (isEdit) {
          navigation.goBack();
          return;
        }

        const clipUrl = buildPublicShareUrl('clip', result.clip.id_text);
        setCreatedClipUrl(clipUrl);
        return;
      }

      if (result.reason === 'request_error') {
        if (!handleGateError(result.error)) {
          setErrorKey('errors.generic');
        }
        return;
      }

      if (result.reason === 'validation') {
        setErrorKey(VALIDATION_REASON_COPY_KEYS[result.validationReason]);
        return;
      }

      setErrorKey('errors.generic');
    },
    [handleGateError, isEdit, navigation]
  );

  const handleSave = useCallback(() => {
    if (!canSave) {
      return;
    }

    setErrorKey(null);
    void form.saveClip().then(handleSaveResult);
  }, [canSave, form, handleSaveResult]);

  const handleDeleteResult = useCallback(
    (result: DeleteClipResult) => {
      if (result.ok) {
        setShowDeleteConfirm(false);
        navigation.goBack();
        return;
      }

      if (result.reason === 'request_error' && !handleGateError(result.error)) {
        setErrorKey('errors.generic');
      }
    },
    [handleGateError, navigation]
  );

  const handleDelete = useCallback(() => {
    setErrorKey(null);
    void form.deleteClip().then(handleDeleteResult);
  }, [form, handleDeleteResult]);

  const closeCreatedDialog = useCallback(() => {
    setCreatedClipUrl(null);
    navigation.goBack();
  }, [navigation]);

  const onStartPreview = useCallback(() => {
    if (form.startSeconds === null) {
      return;
    }
    void previewWindow({
      fromSeconds: form.startSeconds,
      pauseAtSeconds: form.endSeconds,
    });
  }, [form.endSeconds, form.startSeconds, previewWindow]);

  const onEndPreview = useCallback(() => {
    if (form.endSeconds === null) {
      return;
    }

    void previewWindow({
      fromSeconds: Math.max(0, form.endSeconds - CLIP_END_PREVIEW_LEAD_SECONDS),
      pauseAtSeconds: form.endSeconds,
    });
  }, [form.endSeconds, previewWindow]);

  return (
    <View style={styles.root} testID="make-clip-screen">
      <HeaderBarChrome
        backAccessibilityLabel={t('misc.back')}
        backTestID="make-clip-close"
        onBack={() => {
          navigation.goBack();
        }}
        right={
          <HeaderBarAction
            accessibilityLabel={t('misc.save')}
            disabled={!canSave}
            label={form.isSaving ? t('misc.saving') : t('misc.save')}
            onPress={handleSave}
            testID="make-clip-save"
          />
        }
        title={heading}
      />
      {form.isLoading ? (
        <LoadingSection testID="make-clip-loading" />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          style={styles.root}
        >
          <Text style={styles.tip}>{t('features.clip.link_to_clip')}</Text>
          <TextField
            accessibilityLabel={t('misc.title')}
            eyebrow={t('misc.title')}
            onChangeText={form.setTitle}
            placeholder={t('misc.optional')}
            testID="make-clip-title"
            value={form.title}
          />
          <FormField label={t('misc.sharable_status.sharable_status')}>
            <OptionChipGroup
              options={visibilityOptions}
              onChange={form.setVisibility}
              testID="make-clip-visibility"
              value={form.visibility}
            />
          </FormField>
          <ClipTimeCard
            emptyHintKey="misc.required"
            label={t('features.clip.start_time')}
            onCapture={form.captureStartTime}
            onPreview={onStartPreview}
            previewDisabled={form.startSeconds === null}
            previewTestID="make-clip-start-preview"
            seconds={form.startSeconds}
            testID="make-clip-start-time"
          />
          <ClipTimeCard
            emptyHintKey="misc.optional"
            label={t('features.clip.end_time')}
            onCapture={form.captureEndTime}
            onClear={form.clearEndTime}
            onPreview={onEndPreview}
            previewDisabled={form.endSeconds === null}
            previewTestID="make-clip-end-preview"
            seconds={form.endSeconds}
            testID="make-clip-end-time"
          />
          <FullPlayerScrubber chapters={chapters} />
          <MakeClipTransportRow
            onJumpBack={() => {
              jumpBy(-MEDIA_JUMP_BACK_SECONDS);
            }}
            onJumpBackSmall={() => {
              jumpBy(-MEDIA_MINI_JUMP_SECONDS);
            }}
            onJumpForward={() => {
              jumpBy(MEDIA_JUMP_FORWARD_SECONDS);
            }}
            onJumpForwardSmall={() => {
              jumpBy(MEDIA_MINI_JUMP_SECONDS);
            }}
            onPause={pause}
            onPlay={() => {
              void resume();
            }}
            onErrorPress={() => {
              openPlaybackError(lastPlaybackError, () => {
                void retryPlayback();
              });
            }}
            state={transportState}
          />
          {errorKey !== null ? (
            <RetryableError errorKey={errorKey} onRetry={handleSave} testID="make-clip-error" />
          ) : null}
          <View>
            {isEdit ? (
              <FormActions
                actions={[
                  {
                    label: t('features.clip.delete_clip'),
                    onPress: () => {
                      setShowDeleteConfirm(true);
                    },
                    testID: 'make-clip-delete',
                    variant: 'danger',
                  },
                ]}
              />
            ) : null}
            <FormActions
              actions={[
                {
                  label: t('misc.how_to'),
                  onPress: () => {
                    setIsHowToOpen(true);
                  },
                  testID: 'make-clip-how-to',
                  variant: 'secondary',
                },
                {
                  label: t('misc.faq'),
                  onPress: () => {
                    setIsFaqOpen(true);
                  },
                  testID: 'make-clip-faq',
                  variant: 'secondary',
                },
              ]}
              style={isEdit ? styles.followingActions : undefined}
            />
          </View>
        </ScrollView>
      )}
      <ConfirmDialog
        body={t('features.clip.delete_clip_confirm')}
        cancelLabel={t('misc.cancel')}
        cancelTestID="make-clip-delete-cancel"
        confirmLabel={t('features.clip.delete_clip')}
        confirmTestID="make-clip-delete-confirm"
        onCancel={() => {
          setShowDeleteConfirm(false);
        }}
        onConfirm={handleDelete}
        testID="make-clip-delete-dialog"
        title={t('features.clip.delete_clip')}
        visible={showDeleteConfirm}
      />
      <ConfirmDialog
        body={createdClipUrl ?? ''}
        cancelLabel={t('misc.close')}
        cancelTestID="make-clip-created-close"
        confirmLabel={t('features.share')}
        confirmTestID="make-clip-created-share"
        onCancel={closeCreatedDialog}
        onConfirm={() => {
          shareResolvedUrl(createdClipUrl);
          closeCreatedDialog();
        }}
        testID="make-clip-created-dialog"
        title={t('features.clip.clip_created')}
        visible={createdClipUrl !== null}
      />
      <ManagedCopyModal
        backAccessibilityLabel={t('misc.close')}
        backTestID="make-clip-how-to-close"
        errorKey={howToCopy.errorKey}
        isLoading={howToCopy.isLoading}
        markdown={howToCopy.markdown}
        onClose={() => {
          setIsHowToOpen(false);
        }}
        onRetry={howToCopy.retry}
        testID="make-clip-how-to-modal"
        title={t('misc.how_to')}
        visible={isHowToOpen}
      />
      <ManagedCopyModal
        backAccessibilityLabel={t('misc.close')}
        backTestID="make-clip-faq-close"
        errorKey={faqCopy.errorKey}
        isLoading={faqCopy.isLoading}
        markdown={faqCopy.markdown}
        onClose={() => {
          setIsFaqOpen(false);
        }}
        onRetry={faqCopy.retry}
        testID="make-clip-faq-modal"
        title={t('misc.faq')}
        visible={isFaqOpen}
      />
    </View>
  );
}
