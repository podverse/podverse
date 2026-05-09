'use client';

import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import { formatDateTimeAbbrevOrFallback, formatFileSize } from '@podverse/helpers';
import {
  ActionLink,
  Alert,
  Breadcrumbs,
  Button,
  DescriptionList,
  DescriptionListRow,
  Divider,
  ManagementPageShell,
  Modal,
  ModalActions,
  PageHeaderActions,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlayStatus } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { canDeleteStorage } from '../../../../lib/managementPermissions';
import type { CurrentUser } from '../../../../lib/requests/auth';
import { getCurrentUser } from '../../../../lib/requests/auth';
import type { StorageObjectMetadataResponse } from '../../../../lib/requests/storage';
import {
  deleteStorageObject,
  getStorageObjectDownloadUrl,
  getStorageObjectMetadata,
} from '../../../../lib/requests/storage';

export type StorageObjectDetailPageClientProps = {
  objectKey: string;
};

const STORAGE_DISPLAY_FALLBACK = '—';

function shortKeyLabel(key: string): string {
  if (key.length <= 56) {
    return key;
  }
  return `…${key.slice(-55)}`;
}

export function StorageObjectDetailPageClient({ objectKey }: StorageObjectDetailPageClientProps) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [meta, setMeta] = useState<StorageObjectMetadataResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('storage');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const navAria = tc('breadcrumbNav');

  const canDelete = user !== null && canDeleteStorage(user);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const current = await getCurrentUser();
        if (cancelled) {
          return;
        }
        if (!current) {
          router.replace('/');
          return;
        }
        setUser(current);
      } catch {
        if (!cancelled) {
          router.replace('/');
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const loadMeta = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const m = await getStorageObjectMetadata(objectKey);
      setMeta(m);
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        setLoadError(t('notFound'));
      } else {
        setLoadError(t('detailLoadError'));
      }
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [objectKey, t]);

  useEffect(() => {
    void loadMeta();
  }, [loadMeta]);

  const runDelete = async () => {
    setDeleteBusy(true);
    try {
      await deleteStorageObject(objectKey);
      setConfirmOpen(false);
      router.push('/storage');
    } catch {
      setLoadError(t('deleteError'));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <ManagementPageShell subtitle={t('detailSubtitle')} title={t('detailTitle')}>
      <Breadcrumbs
        items={[
          { href: '/dashboard', label: tNav('dashboard') },
          { href: '/storage', label: t('title') },
          { label: shortKeyLabel(objectKey) },
        ]}
        LinkComponent={Link}
        navAriaLabel={navAria}
      />

      {loadError !== null ? <Alert variant="error">{loadError}</Alert> : null}

      <ManagementLoadingSpinnerOverlayStatus isLoading={loading} message={t('loading')} />
      {!loading && meta !== null ? (
        <>
          <DescriptionList variant="rows">
            <DescriptionListRow detail={meta.key} term={t('detail.fields.key')} />
            <DescriptionListRow detail={meta.contentType} term={t('detail.fields.contentType')} />
            <DescriptionListRow
              detail={
                formatFileSize(meta.contentLength, { zeroLabel: '0 B' }) ?? STORAGE_DISPLAY_FALLBACK
              }
              term={t('detail.fields.contentLength')}
            />
            <DescriptionListRow
              detail={formatDateTimeAbbrevOrFallback(
                meta.lastModified,
                locale,
                STORAGE_DISPLAY_FALLBACK
              )}
              term={t('detail.fields.lastModified')}
            />
            <DescriptionListRow detail={meta.etag ?? '—'} term={t('detail.fields.etag')} />
          </DescriptionList>

          <Divider withSpacing />

          <PageHeaderActions>
            <a download href={getStorageObjectDownloadUrl(objectKey)}>
              {t('download')}
            </a>

            {canDelete ? (
              <Button
                onClick={() => {
                  setConfirmOpen(true);
                }}
                type="button"
                variant="danger"
              >
                {t('delete')}
              </Button>
            ) : null}

            <ActionLink href="/storage" LinkComponent={Link} variant="subtle">
              {t('backToList')}
            </ActionLink>
          </PageHeaderActions>

          {canDelete ? (
            <Modal
              ariaLabel={t('deleteConfirmAria')}
              closeButtonAriaLabel={tc('closeModalAria')}
              isOpen={confirmOpen}
              onClose={() => {
                setConfirmOpen(false);
              }}
            >
              <p>{t('deleteConfirmBody', { key: objectKey })}</p>
              <ModalActions>
                <Button
                  disabled={deleteBusy}
                  onClick={() => {
                    setConfirmOpen(false);
                  }}
                  type="button"
                  variant="secondary"
                >
                  {tc('cancel')}
                </Button>
                <Button
                  isLoading={deleteBusy}
                  onClick={() => {
                    void runDelete();
                  }}
                  type="button"
                  variant="danger"
                >
                  {tc('confirm')}
                </Button>
              </ModalActions>
            </Modal>
          ) : null}
        </>
      ) : null}
    </ManagementPageShell>
  );
}
