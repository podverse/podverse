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
import {
  deleteUser,
  generateInviteLink,
  getInviteLink,
  getUser,
  type InviteLink,
  revokeInviteLink,
  type User,
} from '../../../../lib/requests/users';
import { buildUserEditPath, ROUTES } from '../../../../lib/routes';

import styles from './UserDetailPageClient.module.scss';

type Props = {
  userId: number;
};

export function UserDetailPageClient({ userId }: Props) {
  const t = useTranslations('users');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');

  const [user, setUser] = useState<User | null>(null);
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const userLinkSection =
    user !== null
      ? {
          activeLinkLabel: user.verified ? t('activePasswordResetLink') : t('activeInviteLink'),
          generateLabel: user.verified ? t('generatePasswordResetLink') : t('generateInviteLink'),
          sectionTitle: user.verified ? t('passwordResetLinkSection') : t('inviteLinks'),
          showAdminHint: user.verified,
        }
      : null;

  const loadInviteLink = useCallback(async () => {
    try {
      const result = await getInviteLink(userId);
      setInviteLink(result.invite_link);
    } catch {
      // Non-critical -- just don't show invite link section
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await getUser(userId);
        if (!cancelled) {
          setUser(result.user);
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
  }, [userId, t, loadInviteLink]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    setError(null);
    try {
      await deleteUser(userId);
      window.location.href = ROUTES.USERS;
    } catch {
      setError(t('failedToDelete'));
      setDeleteConfirmOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    try {
      const result = await generateInviteLink(userId);
      setInviteLink(result.invite_link);
    } catch {
      setError(t('failedToUpdate'));
    }
  };

  const handleRevokeLink = async () => {
    try {
      await revokeInviteLink(userId);
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
      ) : !loading && !user ? (
        <Alert>{t('failedToLoad')}</Alert>
      ) : !loading && user !== null && userLinkSection !== null ? (
        <ManagementPageShell
          headerBreadcrumbs={
            <Breadcrumbs
              LinkComponent={Link}
              navAriaLabel={tc('breadcrumbNav')}
              items={[
                { href: ROUTES.DASHBOARD, label: tNav('dashboard') },
                { href: ROUTES.USERS, label: t('title') },
                { label: user.id_text },
              ]}
            />
          }
          title={t('userDetail')}
        >
          <DescriptionList variant="rows">
            <DescriptionListRow detail={user.id_text} term="ID" />
            <DescriptionListRow detail={user.email ?? '-'} term={t('tableHeaders.email')} />
            <DescriptionListRow detail={user.username ?? '-'} term={t('tableHeaders.username')} />
            <DescriptionListRow
              detail={
                <StatusBadge variant={user.verified ? 'success' : 'warning'}>
                  {user.verified ? tc('yes') : tc('no')}
                </StatusBadge>
              }
              term={t('tableHeaders.verified')}
            />
            <DescriptionListRow
              detail={user.created_at ? new Date(user.created_at).toLocaleString() : '-'}
              term={t('tableHeaders.createdAt')}
            />
          </DescriptionList>

          <PageHeaderActions>
            <ActionLink href={buildUserEditPath(userId)} variant="primary" LinkComponent={Link}>
              {tc('edit')}
            </ActionLink>
            <Button
              onClick={() => {
                setDeleteConfirmOpen(true);
              }}
              type="button"
              variant="danger"
            >
              {tc('delete')}
            </Button>
          </PageHeaderActions>

          <Divider />

          <div className={styles.linkSectionStack}>
            <SectionHeading level={2}>{userLinkSection.sectionTitle}</SectionHeading>
            {userLinkSection.showAdminHint ? (
              <p className={styles.linkSectionSecondaryText}>{t('passwordResetLinkAdminHint')}</p>
            ) : null}
            {inviteLink ? (
              <>
                <p>
                  <strong>{userLinkSection.activeLinkLabel}</strong>
                </p>
                <p className={styles.linkSectionUrl}>
                  <a href={inviteLink.url} target="_blank" rel="noopener noreferrer">
                    {inviteLink.url}
                  </a>
                </p>
                <p className={styles.linkSectionSecondaryText}>
                  {t('expiresAt', {
                    date: new Date(inviteLink.expires_at).toLocaleString(),
                  })}
                </p>
                <PageHeaderActions>
                  <CopyToClipboardButton
                    textToCopy={inviteLink.url}
                    idleLabel={t('copyLink')}
                    copiedLabel={t('linkCopied')}
                  />
                  <Button
                    onClick={() => void handleRevokeLink()}
                    type="button"
                    variant="linkInline"
                  >
                    {t('revokeLink')}
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
                {userLinkSection.generateLabel}
              </Button>
            )}
          </div>

          <Modal
            ariaLabel={t('deleteConfirmAria')}
            closeButtonAriaLabel={tc('closeModalAria')}
            isOpen={deleteConfirmOpen}
            onClose={() => {
              setDeleteConfirmOpen(false);
            }}
          >
            <p>{t('confirmDelete')}</p>
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
