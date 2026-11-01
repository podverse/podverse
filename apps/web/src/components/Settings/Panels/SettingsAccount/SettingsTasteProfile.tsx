'use client';

import { useLocale, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { FaXmark } from 'react-icons/fa6';

import type { DTOAccountTasteProfileChannel } from '@podverse/helpers';
import { buildDTOChannelImageLoadCandidates, formatDateAbbrev } from '@podverse/helpers';
import { Accordion, Button, IconButton, LoadingSpinner, SkeletonFlashImage } from '@podverse/ui';

import { IMAGES } from '../../../../constants/images';
import { useConfig } from '../../../../contexts/Config';
import type { TasteProfileListState } from '../../../../hooks/useTasteProfileLists';
import { useTasteProfileLists } from '../../../../hooks/useTasteProfileLists';
import { NoResults } from '../../../NoResults/NoResults';
import { showToast } from '../../../Toast/Toast';
import { SettingsSection } from '../../SettingsSection';
import { ModalTasteProfileUnhide } from './ModalTasteProfileUnhide';
import { SettingsTasteProfileConsentSwitch } from './SettingsTasteProfileConsentSwitch';

import styles from '../../../../styles/components/Settings/Panels/SettingsAccount/SettingsTasteProfile.module.scss';

type UnhideTarget = { idText: string; title: string };

type ShowRow = { channel: DTOAccountTasteProfileChannel };

export function SettingsTasteProfile() {
  const t = useTranslations('taste_profile');
  const tMisc = useTranslations('misc');
  const tConsent = useTranslations('taste_profile_consent');
  const config = useConfig();
  const locale = useLocale();
  const [unhideTarget, setUnhideTarget] = useState<UnhideTarget | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [channelHiddenOpen, setChannelHiddenOpen] = useState(false);
  const [profileActive, setProfileActive] = useState(false);
  const [hiddenActive, setHiddenActive] = useState(false);
  const [channelHiddenActive, setChannelHiddenActive] = useState(false);
  const {
    profile,
    hidden,
    channelHidden,
    pendingChannelIds,
    actionFailed,
    retry,
    loadMoreProfile,
    loadMoreHidden,
    loadMoreChannelHidden,
    hideShow,
    unhideShow,
    unhideChannelFromLists,
    applyWeight,
  } = useTasteProfileLists({ hiddenActive, profileActive, channelHiddenActive });

  const titleFor = (channel: DTOAccountTasteProfileChannel): string => {
    const trimmed = channel.title?.trim() ?? '';
    return trimmed === '' ? tMisc('untitled') : trimmed;
  };

  const closeUnhideAndRun = (addToTasteProfile: boolean) => {
    if (unhideTarget === null) {
      return;
    }
    const { idText } = unhideTarget;
    setUnhideTarget(null);
    void unhideShow(idText, addToTasteProfile);
  };

  return (
    <>
      <SettingsSection>
        <section aria-labelledby="settings-taste-profile-heading">
          <h3 className={styles.heading} id="settings-taste-profile-heading">
            {t('title')}
          </h3>
          <SettingsTasteProfileConsentSwitch describedById="settings-taste-profile-summary" />
          <p className={styles.description} id="settings-taste-profile-summary">
            {tConsent('summary', { brand_name: config.public.brand.name })}
          </p>
          {actionFailed ? (
            <p className={styles.status} role="alert">
              {t('action_error')}
            </p>
          ) : null}
          <Accordion
            header={
              <h4 className={styles.subheading} id="settings-taste-profile-affects-heading">
                {t('affects_title')}
              </h4>
            }
            open={profileOpen}
            onToggle={(open) => {
              setProfileOpen(open);
              if (open) {
                setProfileActive(true);
              }
            }}
          >
            <section aria-labelledby="settings-taste-profile-affects-heading">
              <p className={styles.description}>{t('affects_description')}</p>
              <TasteProfileListBody
                state={profile}
                loadingLabel={tMisc('loading')}
                loadErrorText={t('load_error')}
                emptyText={t('empty')}
                loadMoreErrorText={t('load_more_error')}
                loadMoreLabel={t('load_more')}
                retryLabel={tConsent('retry')}
                onRetry={retry}
                onLoadMore={loadMoreProfile}
                renderRow={(row) => {
                  const idText = row.channel.id_text;
                  const title = titleFor(row.channel);
                  return (
                    <TasteProfileShowRow
                      key={`${idText}-${row.recommendation_weight}-${row.recommendation_weight_override ?? 'auto'}`}
                      channel={row.channel}
                      title={title}
                      disabled={pendingChannelIds.has(idText)}
                      extra={
                        <WeightControl
                          channelIdText={idText}
                          disabled={pendingChannelIds.has(idText)}
                          title={title}
                          weight={row.recommendation_weight}
                          onApply={applyWeight}
                          onHide={async () => {
                            const moved = await hideShow(idText);
                            if (moved) {
                              showToast(t('moved_to_hidden'), 'success');
                            }
                          }}
                        />
                      }
                    />
                  );
                }}
              />
            </section>
          </Accordion>
        </section>
        <section
          aria-labelledby="settings-taste-profile-hidden-heading"
          className={styles.hiddenSection}
        >
          <Accordion
            header={
              <h4 className={styles.subheading} id="settings-taste-profile-hidden-heading">
                {t('hidden_title')}
              </h4>
            }
            open={hiddenOpen}
            onToggle={(open) => {
              setHiddenOpen(open);
              if (open) {
                setHiddenActive(true);
              }
            }}
          >
            <p className={styles.description}>{t('hidden_description')}</p>
            <TasteProfileListBody
              state={hidden}
              loadingLabel={tMisc('loading')}
              loadErrorText={t('hidden_load_error')}
              emptyText={t('hidden_empty')}
              loadMoreErrorText={t('load_more_error')}
              loadMoreLabel={t('load_more')}
              retryLabel={tConsent('retry')}
              onRetry={retry}
              onLoadMore={loadMoreHidden}
              renderRow={(row) => {
                const idText = row.channel.id_text;
                const title = titleFor(row.channel);
                return (
                  <TasteProfileShowRow
                    key={idText}
                    channel={row.channel}
                    title={title}
                    subtitle={t('not_counted_on', {
                      date: formatDateAbbrev(row.hidden_at, locale),
                    })}
                    actionLabel={t('count_again')}
                    actionAccessibleLabel={t('count_again_accessible', { title })}
                    disabled={pendingChannelIds.has(idText)}
                    onAction={() => {
                      setUnhideTarget({ idText, title });
                    }}
                  />
                );
              }}
            />
          </Accordion>
        </section>
        <section aria-labelledby="settings-channel-hidden-heading" className={styles.hiddenSection}>
          <Accordion
            header={
              <h4 className={styles.subheading} id="settings-channel-hidden-heading">
                {t('hidden_channels_title')}
              </h4>
            }
            open={channelHiddenOpen}
            onToggle={(open) => {
              setChannelHiddenOpen(open);
              if (open) {
                setChannelHiddenActive(true);
              }
            }}
          >
            <p className={styles.description}>{t('hidden_channels_description')}</p>
            <TasteProfileListBody
              state={channelHidden}
              loadingLabel={tMisc('loading')}
              loadErrorText={t('hidden_channels_load_error')}
              emptyText={t('hidden_channels_empty')}
              loadMoreErrorText={t('load_more_error')}
              loadMoreLabel={t('load_more')}
              retryLabel={tConsent('retry')}
              onRetry={retry}
              onLoadMore={loadMoreChannelHidden}
              renderRow={(row) => {
                const idText = row.channel.id_text;
                const title = titleFor(row.channel);
                return (
                  <TasteProfileShowRow
                    key={idText}
                    channel={row.channel}
                    title={title}
                    subtitle={t('hidden_on', { date: formatDateAbbrev(row.hidden_at, locale) })}
                    actionLabel={t('unhide')}
                    actionAccessibleLabel={t('unhide_channel_accessible', { title })}
                    disabled={pendingChannelIds.has(idText)}
                    onAction={() => {
                      void unhideChannelFromLists(idText);
                    }}
                  />
                );
              }}
            />
          </Accordion>
        </section>
      </SettingsSection>
      <ModalTasteProfileUnhide
        target={unhideTarget}
        onCancel={() => {
          setUnhideTarget(null);
        }}
        onRemoveOnly={() => {
          closeUnhideAndRun(false);
        }}
        onAddBack={() => {
          closeUnhideAndRun(true);
        }}
      />
    </>
  );
}

type TasteProfileListBodyProps<Row extends ShowRow> = {
  state: TasteProfileListState<Row>;
  loadingLabel: string;
  loadErrorText: string;
  emptyText: string;
  loadMoreErrorText: string;
  loadMoreLabel: string;
  retryLabel: string;
  onRetry: () => void;
  onLoadMore: () => void;
  renderRow: (row: Row) => ReactNode;
};

function TasteProfileListBody<Row extends ShowRow>({
  state,
  loadingLabel,
  loadErrorText,
  emptyText,
  loadMoreErrorText,
  loadMoreLabel,
  retryLabel,
  onRetry,
  onLoadMore,
  renderRow,
}: TasteProfileListBodyProps<Row>) {
  if (state.status === 'idle') {
    return null;
  }
  if (state.status === 'loading') {
    return <LoadingSpinner ariaLabel={loadingLabel} size="medium" />;
  }
  if (state.status === 'error') {
    return (
      <>
        <p className={styles.status} role="alert">
          {loadErrorText}
        </p>
        <Button type="button" variant="secondary" onClick={onRetry}>
          {retryLabel}
        </Button>
      </>
    );
  }
  if (state.data.rows.length === 0) {
    return <NoResults message={emptyText} role="status" />;
  }
  return (
    <>
      <ul className={styles.rows}>{state.data.rows.map((row) => renderRow(row))}</ul>
      {state.loadMoreFailed ? (
        <p className={styles.status} role="alert">
          {loadMoreErrorText}
        </p>
      ) : null}
      {state.data.hasMore ? (
        <Button
          type="button"
          variant="secondary"
          isLoading={state.loadingMore}
          onClick={onLoadMore}
        >
          {loadMoreLabel}
        </Button>
      ) : null}
    </>
  );
}

type TasteProfileShowRowProps = {
  channel: DTOAccountTasteProfileChannel;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionAccessibleLabel?: string;
  disabled: boolean;
  onAction?: () => void;
  extra?: ReactNode;
};

function TasteProfileShowRow({
  channel,
  title,
  subtitle,
  actionLabel,
  actionAccessibleLabel,
  disabled,
  onAction,
  extra,
}: TasteProfileShowRowProps) {
  const imageCandidates = buildDTOChannelImageLoadCandidates(
    channel.channel_images,
    IMAGES.PODROLL.SQUARE.SIZE_FIND_TARGET,
    'greater'
  );

  return (
    <li className={styles.row}>
      <SkeletonFlashImage
        className={styles.image}
        candidates={imageCandidates}
        alt={title}
        width={IMAGES.PODROLL.SQUARE.SIZE}
        height={IMAGES.PODROLL.SQUARE.SIZE}
      />
      <div className={styles.text}>
        <div className={styles.title}>{title}</div>
        {subtitle !== undefined ? <div className={styles.subtitle}>{subtitle}</div> : null}
        {extra}
      </div>
      {actionLabel !== undefined && actionAccessibleLabel !== undefined && onAction !== undefined ? (
        <Button
          type="button"
          variant="secondary"
          aria-label={actionAccessibleLabel}
          disabled={disabled}
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </li>
  );
}

const WEIGHT_LEVELS = [1, 2, 3, 4, 5] as const;

function WeightControl({
  channelIdText,
  disabled,
  onApply,
  onHide,
  title,
  weight,
}: {
  channelIdText: string;
  disabled: boolean;
  onApply: (channelIdText: string, weight: number) => Promise<boolean>;
  onHide: () => Promise<void>;
  title: string;
  weight: number;
}) {
  const t = useTranslations('taste_profile');
  const [selected, setSelected] = useState(weight);

  return (
    <div className={styles.weight}>
      <span className={styles.weightLabel}>{t('weight_label')}</span>
      <div className={styles.weightLevels}>
        {WEIGHT_LEVELS.map((level) => {
          const chosen = selected === level;
          return (
            <Button
              key={level}
              type="button"
              variant={chosen ? 'primary' : 'secondary'}
              aria-label={t('weight_accessible', { level, title })}
              aria-pressed={chosen}
              disabled={disabled}
              onClick={() => {
                if (chosen || disabled) {
                  return;
                }
                setSelected(level);
                void onApply(channelIdText, level).then((applied) => {
                  if (!applied) {
                    setSelected(weight);
                  }
                });
              }}
            >
              {level}
            </Button>
          );
        })}
      </div>
      <IconButton
        className={styles.weightHide}
        aria-label={t('hide_accessible', { title })}
        disabled={disabled}
        onClick={() => {
          void onHide();
        }}
      >
        <FaXmark aria-hidden />
      </IconButton>
    </div>
  );
}
