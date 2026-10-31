import type { ReactNode } from 'react';
import { Fragment, memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { DTOAccountTasteProfileHiddenRow, DTOAccountTasteProfileRow } from '@podverse/helpers';
import { formatDateAbbrev, primaryChannelListArtworkUrl } from '@podverse/helpers';

import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { Button, CoverImage, ListRow } from '../../components/primitives';
import { Accordion } from '../../components/primitives/Accordion';
import { LoadingSection } from '../../components/state/LoadingSection';
import { RetryableError } from '../../components/state/RetryableError';
import type { TasteProfileListState } from '../../hooks/useTasteProfileLists';
import { useTasteProfileLists } from '../../hooks/useTasteProfileLists';
import {
  LIST_ROW_ARTWORK_SIZE,
  settingsCardGap,
  settingsCardInnerGap,
} from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

/** Artwork sizing only, so it does not depend on the theme. Square, matching every other row. */
const coverStyles = StyleSheet.create({
  image: {
    height: LIST_ROW_ARTWORK_SIZE,
    width: LIST_ROW_ARTWORK_SIZE,
  },
});

/** Content rows draw a top hairline, including the first row. */
const createContentListRowStyles = ({ styles: themeStyles }: ThemedStylesTheme) => ({
  row: {
    borderTopColor: themeStyles.border.borderColor,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

const createSectionStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    body: {
      gap: settingsCardInnerGap(tokens.spacing),
    },
    description: {
      ...typography.body,
      color: themeStyles.textSecondary.color,
    },
    section: {
      gap: settingsCardInnerGap(tokens.spacing),
      marginTop: settingsCardGap(tokens.spacing),
    },
    status: {
      ...typography.body,
      color: themeStyles.textSecondary.color,
    },
    weight: {
      gap: settingsCardInnerGap(tokens.spacing),
      paddingHorizontal: tokens.spacing.lg,
      paddingBottom: tokens.spacing.lg,
    },
    weightLevels: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm,
    },
  });

type ListTestIdPrefix = 'taste-profile' | 'taste-profile-hidden' | 'channel-hidden';

type ShowRowProps = {
  actionAccessibilityLabel: string;
  actionLabel: string;
  actionTestID: string;
  idText: string;
  imageUrl: string | null;
  onAction: (idText: string, title: string) => void;
  pending: boolean;
  subtitle: string;
  testID: string;
  title: string;
};

const TasteProfileShowRow = memo(function TasteProfileShowRow({
  actionAccessibilityLabel,
  actionLabel,
  actionTestID,
  idText,
  imageUrl,
  onAction,
  pending,
  subtitle,
  testID,
  title,
}: ShowRowProps) {
  const styles = useThemedStyles(createContentListRowStyles);
  const handlePress = useCallback(() => {
    onAction(idText, title);
  }, [idText, onAction, title]);

  return (
    <View style={styles.row}>
      <ListRow
        leading={
          <CoverImage
            decodeEdge={LIST_ROW_ARTWORK_SIZE}
            opensViewer={false}
            style={coverStyles.image}
            uri={imageUrl}
          />
        }
        subtitle={subtitle}
        testID={testID}
        title={title}
        trailing={
          <Button
            accessibilityLabel={actionAccessibilityLabel}
            disabled={pending}
            label={actionLabel}
            onPress={handlePress}
            size="sm"
            testID={actionTestID}
            variant="secondary"
          />
        }
      />
    </View>
  );
});

type ListBodyProps<Row extends { channel: { id_text: string } }> = {
  emptyKey: string;
  errorKey: string;
  onLoadMore: () => void;
  onRetry: () => void;
  prefix: ListTestIdPrefix;
  renderRow: (row: Row) => ReactNode;
  state: TasteProfileListState<Row>;
};

function TasteProfileListBody<Row extends { channel: { id_text: string } }>({
  emptyKey,
  errorKey,
  onLoadMore,
  onRetry,
  prefix,
  renderRow,
  state,
}: ListBodyProps<Row>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createSectionStyles);

  if (state.status === 'idle') {
    return null;
  }
  if (state.status === 'loading') {
    return <LoadingSection testID={`${prefix}-loading`} />;
  }
  if (state.status === 'error') {
    return <RetryableError errorKey={errorKey} onRetry={onRetry} testID={`${prefix}-error`} />;
  }
  if (state.data.rows.length === 0) {
    return (
      <Text style={styles.status} testID={`${prefix}-empty`}>
        {t(emptyKey)}
      </Text>
    );
  }
  return (
    <View style={styles.body}>
      <View>
        {state.data.rows.map((row) => (
          <Fragment key={row.channel.id_text}>{renderRow(row)}</Fragment>
        ))}
      </View>
      {state.loadMoreFailed ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.status}
          testID={`${prefix}-load-more-error`}
        >
          {t('taste_profile.load_more_error')}
        </Text>
      ) : null}
      {state.data.hasMore ? (
        <Button
          fullWidth
          label={t('taste_profile.load_more')}
          loading={state.loadingMore}
          onPress={onLoadMore}
          size="form"
          testID={`${prefix}-load-more`}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}

type UnhideTarget = { idText: string; title: string };

const WEIGHT_LEVELS = ['1', '2', '3', '4', '5'] as const;

type WeightLevel = (typeof WEIGHT_LEVELS)[number];

function toWeightLevel(weight: number): WeightLevel {
  if (weight === 2) {
    return '2';
  }
  if (weight === 3) {
    return '3';
  }
  if (weight === 4) {
    return '4';
  }
  if (weight === 5) {
    return '5';
  }
  return '1';
}

function WeightControl({
  channelIdText,
  disabled,
  onApply,
  title,
  weight,
  weightOverride,
}: {
  channelIdText: string;
  disabled: boolean;
  onApply: (channelIdText: string, weight: number) => Promise<void>;
  title: string;
  weight: number;
  weightOverride: number | null;
}) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createSectionStyles);
  const [selected, setSelected] = useState<WeightLevel>(toWeightLevel(weight));

  return (
    <View style={styles.weight}>
      <Text style={styles.description}>{t('taste_profile.weight_label')}</Text>
      <View style={styles.weightLevels}>
        {WEIGHT_LEVELS.map((level) => {
          const chosen = selected === level;
          return (
            <Button
              accessibilityLabel={t('taste_profile.weight_accessible', { level, title })}
              disabled={disabled}
              key={level}
              label={level}
              onPress={() => {
                setSelected(level);
              }}
              size="sm"
              testID={`taste-profile-weight-${channelIdText}-${level}`}
              variant={chosen ? 'primary' : 'secondary'}
            />
          );
        })}
      </View>
      {weightOverride === null ? (
        <Text style={styles.status}>{t('taste_profile.weight_automatic')}</Text>
      ) : null}
      <Button
        accessibilityLabel={t('taste_profile.weight_apply_accessible', { title })}
        disabled={disabled}
        label={t('taste_profile.weight_apply')}
        onPress={() => {
          void onApply(channelIdText, Number(selected));
        }}
        size="sm"
        testID={`taste-profile-weight-apply-${channelIdText}`}
        variant="secondary"
      />
    </View>
  );
}

/**
 * Taste Profile and Hidden From Taste Profile for the signed-in listener. Rows are not links; the
 * listener manages each list here.
 */
export function TasteProfileSections() {
  const { i18n, t } = useTranslation();
  const styles = useThemedStyles(createSectionStyles);
  const [profileActive, setProfileActive] = useState(false);
  const [hiddenActive, setHiddenActive] = useState(false);
  const [channelHiddenActive, setChannelHiddenActive] = useState(false);
  const {
    actionFailed,
    hidden,
    hideShow,
    loadMoreHidden,
    loadMoreProfile,
    loadMoreChannelHidden,
    pendingChannelIds,
    profile,
    channelHidden,
    retry,
    unhideChannelFromLists,
    unhideShow,
    applyWeight,
  } = useTasteProfileLists({ hiddenActive, profileActive, channelHiddenActive });
  const [unhideTarget, setUnhideTarget] = useState<UnhideTarget | null>(null);
  const [unhideVisible, setUnhideVisible] = useState(false);

  const showTitle = useCallback(
    (title: string | null) => {
      const trimmed = title?.trim() ?? '';
      return trimmed.length > 0 ? trimmed : t('misc.untitled');
    },
    [t]
  );

  const handleRemove = useCallback(
    (idText: string) => {
      void hideShow(idText);
    },
    [hideShow]
  );

  const openUnhide = useCallback((idText: string, title: string) => {
    setUnhideTarget({ idText, title });
    setUnhideVisible(true);
  }, []);

  // Only visibility closes, so the dialog copy stays put while it fades out.
  const closeUnhide = useCallback(() => {
    setUnhideVisible(false);
  }, []);

  const renderProfileRow = useCallback(
    (row: DTOAccountTasteProfileRow) => {
      const idText = row.channel.id_text;
      const title = showTitle(row.channel.title);
      return (
        <View>
          <TasteProfileShowRow
            actionAccessibilityLabel={t('taste_profile.remove_accessible', { title })}
            actionLabel={t('taste_profile.remove')}
            actionTestID={`taste-profile-remove-${idText}`}
            idText={idText}
            imageUrl={primaryChannelListArtworkUrl(row.channel.channel_images)}
            onAction={handleRemove}
            pending={pendingChannelIds.has(idText)}
            subtitle={
              row.last_listened_at === null
                ? t('taste_profile.added_back')
                : t('taste_profile.last_listened', {
                    date: formatDateAbbrev(row.last_listened_at, i18n.language),
                  })
            }
            testID={`taste-profile-row-${idText}`}
            title={title}
          />
          <WeightControl
            key={`${idText}-${row.recommendation_weight}-${row.recommendation_weight_override ?? 'auto'}`}
            channelIdText={idText}
            disabled={pendingChannelIds.has(idText)}
            onApply={applyWeight}
            title={title}
            weight={row.recommendation_weight}
            weightOverride={row.recommendation_weight_override}
          />
        </View>
      );
    },
    [applyWeight, handleRemove, i18n.language, pendingChannelIds, showTitle, t]
  );

  const renderHiddenRow = useCallback(
    (row: DTOAccountTasteProfileHiddenRow) => {
      const idText = row.channel.id_text;
      const title = showTitle(row.channel.title);
      return (
        <TasteProfileShowRow
          actionAccessibilityLabel={t('taste_profile.unhide_accessible', { title })}
          actionLabel={t('taste_profile.unhide')}
          actionTestID={`taste-profile-unhide-${idText}`}
          idText={idText}
          imageUrl={primaryChannelListArtworkUrl(row.channel.channel_images)}
          onAction={openUnhide}
          pending={pendingChannelIds.has(idText)}
          subtitle={t('taste_profile.hidden_on', {
            date: formatDateAbbrev(row.hidden_at, i18n.language),
          })}
          testID={`taste-profile-hidden-row-${idText}`}
          title={title}
        />
      );
    },
    [i18n.language, openUnhide, pendingChannelIds, showTitle, t]
  );

  const handleUnhideChannelFromLists = useCallback(
    (idText: string) => {
      void unhideChannelFromLists(idText);
    },
    [unhideChannelFromLists]
  );

  const renderChannelHiddenRow = useCallback(
    (row: DTOAccountTasteProfileHiddenRow) => {
      const idText = row.channel.id_text;
      const title = showTitle(row.channel.title);
      return (
        <TasteProfileShowRow
          actionAccessibilityLabel={t('taste_profile.unhide_accessible', { title })}
          actionLabel={t('taste_profile.unhide')}
          actionTestID={`channel-hidden-unhide-${idText}`}
          idText={idText}
          imageUrl={primaryChannelListArtworkUrl(row.channel.channel_images)}
          onAction={handleUnhideChannelFromLists}
          pending={pendingChannelIds.has(idText)}
          subtitle={t('taste_profile.hidden_on', {
            date: formatDateAbbrev(row.hidden_at, i18n.language),
          })}
          testID={`channel-hidden-row-${idText}`}
          title={title}
        />
      );
    },
    [handleUnhideChannelFromLists, i18n.language, pendingChannelIds, showTitle, t]
  );

  return (
    <View>
      {actionFailed ? (
        <Text
          accessibilityLiveRegion="polite"
          style={styles.status}
          testID="taste-profile-action-error"
        >
          {t('taste_profile.action_error')}
        </Text>
      ) : null}
      <Accordion
        onToggle={(open) => {
          if (open) {
            setProfileActive(true);
          }
        }}
        testID="taste-profile-section"
        title={t('taste_profile.affects_title')}
      >
        <Text style={styles.description}>{t('taste_profile.affects_description')}</Text>
        <TasteProfileListBody
          emptyKey="taste_profile.empty"
          errorKey="taste_profile.load_error"
          onLoadMore={loadMoreProfile}
          onRetry={retry}
          prefix="taste-profile"
          renderRow={renderProfileRow}
          state={profile}
        />
      </Accordion>
      <View style={styles.section}>
        <Accordion
          onToggle={(open) => {
            if (open) {
              setHiddenActive(true);
            }
          }}
          testID="taste-profile-hidden-section"
          title={t('taste_profile.hidden_title')}
        >
          <Text style={styles.description}>{t('taste_profile.hidden_description')}</Text>
          <TasteProfileListBody
            emptyKey="taste_profile.hidden_empty"
            errorKey="taste_profile.hidden_load_error"
            onLoadMore={loadMoreHidden}
            onRetry={retry}
            prefix="taste-profile-hidden"
            renderRow={renderHiddenRow}
            state={hidden}
          />
        </Accordion>
      </View>
      <View style={styles.section}>
        <Accordion
          onToggle={(open) => {
            if (open) {
              setChannelHiddenActive(true);
            }
          }}
          testID="channel-hidden-section"
          title={t('taste_profile.hidden_channels_title')}
        >
          <Text style={styles.description}>
            {t('taste_profile.hidden_channels_description')}
          </Text>
          <TasteProfileListBody
            emptyKey="taste_profile.hidden_channels_empty"
            errorKey="taste_profile.hidden_channels_load_error"
            onLoadMore={loadMoreChannelHidden}
            onRetry={retry}
            prefix="channel-hidden"
            renderRow={renderChannelHiddenRow}
            state={channelHidden}
          />
        </Accordion>
      </View>
      <ConfirmDialog
        body={t('taste_profile.unhide_dialog_body', { title: unhideTarget?.title ?? '' })}
        cancelLabel={t('misc.cancel')}
        cancelTestID="taste-profile-unhide-dialog-cancel"
        confirmLabel={t('taste_profile.unhide_add_back')}
        confirmTestID="taste-profile-unhide-dialog-add-back"
        onCancel={closeUnhide}
        onConfirm={() => {
          closeUnhide();
          if (unhideTarget !== null) {
            void unhideShow(unhideTarget.idText, true);
          }
        }}
        onSecondaryConfirm={() => {
          closeUnhide();
          if (unhideTarget !== null) {
            void unhideShow(unhideTarget.idText, false);
          }
        }}
        secondaryConfirmLabel={t('taste_profile.unhide_remove_only')}
        secondaryConfirmTestID="taste-profile-unhide-dialog-remove-only"
        testID="taste-profile-unhide-dialog"
        title={t('taste_profile.unhide_dialog_title')}
        visible={unhideVisible}
      />
    </View>
  );
}
