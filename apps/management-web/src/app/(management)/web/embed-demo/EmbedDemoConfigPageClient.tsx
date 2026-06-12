'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaPenToSquare, FaTrash } from 'react-icons/fa6';

import type { EmbedDemoShowcaseAdminSlot } from '@podverse/helpers';
import {
  Alert,
  Breadcrumbs,
  DescriptionList,
  DescriptionListRow,
  EditValueModal,
  IconButton,
  ManagementPageShell,
  SectionHeading,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import {
  deleteEmbedDemoShowcaseSlot,
  listEmbedDemoShowcaseSlots,
  upsertEmbedDemoShowcaseSlot,
} from '../../../../lib/requests/embedDemo';

import styles from './EmbedDemoConfigPageClient.module.scss';

type EditTarget = {
  showcaseId: string;
  label: string;
  resourceIdText: string;
};

export function EmbedDemoConfigPageClient() {
  const t = useTranslations('embedDemoConfig');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const tWeb = useTranslations('webHub');

  const [slots, setSlots] = useState<EmbedDemoShowcaseAdminSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listEmbedDemoShowcaseSlots();
      setSlots(response.data);
    } catch {
      setError(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const slotLabel = useCallback(
    (showcaseId: string) => t(`slotLabels.${showcaseId}` as 'slotLabels.episode-audio'),
    [t]
  );

  const singleSlots = useMemo(
    () =>
      slots.filter((slot) =>
        ['episode', 'track', 'clip', 'chapter', 'official-clip'].includes(slot.routeKind)
      ),
    [slots]
  );

  const listSlots = useMemo(
    () => slots.filter((slot) => ['podcast', 'album', 'playlist'].includes(slot.routeKind)),
    [slots]
  );

  const handleModalSubmit = async (raw: string) => {
    if (editTarget === null) {
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await upsertEmbedDemoShowcaseSlot(editTarget.showcaseId, raw.trim());
      setSaveSuccess(t('saveSuccess'));
      setEditTarget(null);
      await loadSlots();
    } catch {
      setSaveError(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async (showcaseId: string) => {
    setSaveError(null);
    setSaveSuccess(null);

    try {
      await deleteEmbedDemoShowcaseSlot(showcaseId);
      setSaveSuccess(t('clearSuccess'));
      await loadSlots();
    } catch {
      setSaveError(t('saveError'));
    }
  };

  const renderSlotRows = (sectionSlots: EmbedDemoShowcaseAdminSlot[]) =>
    sectionSlots.map((slot) => {
      const label = slotLabel(slot.showcaseId);
      const configured = slot.resourceIdText !== null && slot.resourceIdText !== '';

      return (
        <DescriptionListRow
          key={slot.showcaseId}
          detail={
            <div className={styles.detailWithAction}>
              <span className={styles.detailValue}>
                {configured ? slot.resourceIdText : t('notConfigured')}
              </span>
              <IconButton
                appearance="ghost"
                aria-label={t('editFieldAria', { fieldLabel: label })}
                title={t('editFieldAria', { fieldLabel: label })}
                onClick={() =>
                  setEditTarget({
                    showcaseId: slot.showcaseId,
                    label,
                    resourceIdText: slot.resourceIdText ?? '',
                  })
                }
              >
                <FaPenToSquare aria-hidden />
              </IconButton>
              {configured ? (
                <IconButton
                  appearance="ghost"
                  aria-label={t('clearFieldAria', { fieldLabel: label })}
                  title={t('clearFieldAria', { fieldLabel: label })}
                  onClick={() => {
                    void handleClear(slot.showcaseId);
                  }}
                >
                  <FaTrash aria-hidden />
                </IconButton>
              ) : null}
            </div>
          }
          term={label}
        />
      );
    });

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: '/dashboard', label: tNav('dashboard') },
            { href: '/web', label: tWeb('pageTitle') },
            { label: t('pageTitle') },
          ]}
        />
      }
      title={t('pageTitle')}
    >
      <div className={styles.page}>
        {loading ? <ManagementLoadingSpinnerOverlay isLoading /> : null}
        {error !== null ? <Alert variant="error">{error}</Alert> : null}
        {saveError !== null ? <Alert variant="error">{saveError}</Alert> : null}
        {saveSuccess !== null ? <Alert variant="success">{saveSuccess}</Alert> : null}

        <p className={styles.lead}>{t('pageSubtitle')}</p>

        <SectionHeading level={2}>{t('singleSectionTitle')}</SectionHeading>
        <DescriptionList variant="rows">{renderSlotRows(singleSlots)}</DescriptionList>

        <SectionHeading level={2}>{t('listSectionTitle')}</SectionHeading>
        <DescriptionList variant="rows">{renderSlotRows(listSlots)}</DescriptionList>

        {editTarget !== null ? (
          <EditValueModal
            cancelLabel={tc('cancel')}
            closeButtonAriaLabel={tc('close')}
            emptyValueMessage={t('emptyValueMessage')}
            externalError={saveError}
            initialValue={editTarget.resourceIdText}
            inputAriaLabel={t('resourceIdTextLabel')}
            inputEyebrow={t('resourceIdTextLabel')}
            inputId="embed-demo-resource-id-text"
            isOpen={editTarget !== null}
            isSaving={saving}
            modalAriaLabel={t('editValueModalAria')}
            onClose={() => {
              setEditTarget(null);
              setSaveError(null);
            }}
            onSubmit={handleModalSubmit}
            saveLabel={tc('saveChanges')}
            title={t('editModalTitle', { label: editTarget.label })}
            type="text"
          />
        ) : null}
      </div>
    </ManagementPageShell>
  );
}
