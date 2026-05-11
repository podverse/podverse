'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import {
  ActionLink,
  Alert,
  Breadcrumbs,
  Button,
  CopyToClipboardButton,
  DescriptionList,
  DescriptionListRow,
  Divider,
  ManagementPageShell,
  Modal,
  ModalActions,
  PageHeaderActions,
  SectionHeading,
  StatusBadge,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { canDeleteAdmins, canUpdateAdmins } from '../../../../lib/managementPermissions';
import {
  type AdminAccount,
  type AdminInviteLink,
  deleteAdmin,
  generateAdminInviteLink,
  getAdminAccountById,
  getAdminInviteLink,
  revokeAdminInviteLink,
} from '../../../../lib/requests/admins';
import type { CurrentUser } from '../../../../lib/requests/auth';

import styles from './AdminDetailPageClient.module.scss';

type Props = {
  adminId: number;
  initialUser: CurrentUser;
};

export function AdminDetailPageClient({ adminId, initialUser }: Props) {
  const t = useTranslations('admins');
  const tu = useTranslations('users');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');

  const [user] = useState<CurrentUser>(initialUser);
  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [inviteLink, setInviteLink] = useState<AdminInviteLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const isSuperuserActor = user.role === 'superuser';
  const targetIsSuperuser = admin?.role === 'superuser';
  const canEdit =
    admin !== null &&
    canUpdateAdmins(user) &&
    (isSuperuserActor || !targetIsSuperuser) &&
    !targetIsSuperuser;
  const canManageInvite =
    admin !== null && canUpdateAdmins(user) && (isSuperuserActor || !targetIsSuperuser);
  const canDeleteRow =
    admin !== null && canDeleteAdmins(user) && admin.id !== user.id && !targetIsSuperuser;

  const loadInviteLink = useCallback(async () => {
    try {
      const result = await getAdminInviteLink(adminId);
      setInviteLink(result.invite_link);
    } catch {
      // Non-critical -- omit invite section state
    }
  }, [adminId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const loaded = await getAdminAccountById(adminId);
        if (!cancelled) {
          setAdmin(loaded);
          void loadInviteLink();
        }
      } catch {
        if (!cancelled) setError(t('failedToLoad'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [adminId, t, loadInviteLink]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    setError(null);
    try {
      await deleteAdmin(adminId);
      window.location.href = '/admins';
    } catch {
      setError(t('failedToDeleteAdmin'));
      setDeleteConfirmOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    try {
      const result = await generateAdminInviteLink(adminId);
      setInviteLink(result.invite_link);
    } catch {
      setError(t('failedToUpdate'));
    }
  };

  const handleRevokeLink = async () => {
    try {
      await revokeAdminInviteLink(adminId);
      setInviteLink(null);
    } catch {
      setError(t('failedToUpdate'));
    }
  };

  return (
    <>
      <ManagementLoadingSpinnerOverlay isLoading={loading} />
      {!loading && error ? (
        <Alert>{error}</Alert>
      ) : !loading && !admin ? (
        <Alert>{t('failedToLoad')}</Alert>
      ) : !loading && admin !== null ? (
        <ManagementPageShell
          headerBreadcrumbs={
            <Breadcrumbs
              LinkComponent={Link}
              navAriaLabel={tc('breadcrumbNav')}
              items={[
                { href: '/dashboard', label: tNav('dashboard') },
                { href: '/admins', label: t('title') },
                { label: admin.id_text },
              ]}
            />
          }
          title={t('adminDetail')}
        >
          <DescriptionList variant="rows">
            <DescriptionListRow detail={admin.id_text} term={t('tableHeaders.id')} />
            <DescriptionListRow detail={admin.email ?? '-'} term={t('tableHeaders.email')} />
            <DescriptionListRow detail={admin.username ?? '-'} term={t('tableHeaders.username')} />
            <DescriptionListRow
              detail={
                <StatusBadge variant={admin.role === 'superuser' ? 'success' : 'neutral'}>
                  {admin.role}
                </StatusBadge>
              }
              term={t('tableHeaders.role')}
            />
            <DescriptionListRow
              detail={admin.created_at ? new Date(admin.created_at).toLocaleString() : '-'}
              term={t('tableHeaders.createdAt')}
            />
          </DescriptionList>

          <PageHeaderActions>
            {canEdit ? (
              <ActionLink href={`/admins/${adminId}/edit`} variant="primary" LinkComponent={Link}>
                {tc('edit')}
              </ActionLink>
            ) : null}
            {canDeleteRow ? (
              <Button
                onClick={() => {
                  setDeleteConfirmOpen(true);
                }}
                type="button"
                variant="danger"
              >
                {tc('delete')}
              </Button>
            ) : null}
          </PageHeaderActions>

          {canManageInvite ? (
            <>
              <Divider />

              <div className={styles.linkSectionStack}>
                <SectionHeading level={2}>{tu('passwordResetLinkSection')}</SectionHeading>
                <p className={styles.linkSectionSecondaryText}>
                  {tu('passwordResetLinkAdminHint')}
                </p>
                {inviteLink ? (
                  <>
                    <p>
                      <strong>{tu('activePasswordResetLink')}</strong>
                    </p>
                    <p className={styles.linkSectionUrl}>
                      <a href={inviteLink.url} rel="noopener noreferrer" target="_blank">
                        {inviteLink.url}
                      </a>
                    </p>
                    <p className={styles.linkSectionSecondaryText}>
                      {tu('expiresAt', {
                        date: new Date(inviteLink.expires_at).toLocaleString(),
                      })}
                    </p>
                    <PageHeaderActions>
                      <CopyToClipboardButton
                        copiedLabel={tu('linkCopied')}
                        idleLabel={tu('copyLink')}
                        textToCopy={inviteLink.url}
                      />
                      <Button
                        onClick={() => void handleRevokeLink()}
                        type="button"
                        variant="linkInline"
                      >
                        {tu('revokeLink')}
                      </Button>
                    </PageHeaderActions>
                  </>
                ) : (
                  <Button
                    className={styles.linkSectionGenerateAction}
                    onClick={() => void handleGenerateLink()}
                    type="button"
                    variant="linkInline"
                  >
                    {tu('generatePasswordResetLink')}
                  </Button>
                )}
              </div>
            </>
          ) : null}

          <Modal
            ariaLabel={t('deleteConfirmAria')}
            closeButtonAriaLabel={tc('closeModalAria')}
            isOpen={deleteConfirmOpen}
            onClose={() => {
              setDeleteConfirmOpen(false);
            }}
          >
            <p>{t('confirmDeleteAdmin')}</p>
            <ModalActions>
              <Button
                disabled={deleteLoading}
                onClick={() => {
                  setDeleteConfirmOpen(false);
                }}
                type="button"
                variant="secondary"
              >
                {tc('cancel')}
              </Button>
              <Button
                isLoading={deleteLoading}
                onClick={() => void handleDelete()}
                type="button"
                variant="primary"
              >
                {tc('confirm')}
              </Button>
            </ModalActions>
          </Modal>
        </ManagementPageShell>
      ) : null}
    </>
  );
}
