'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import {
  ActionLink,
  Alert,
  Button,
  CopyToClipboardButton,
  DescriptionList,
  DescriptionListRow,
  Divider,
  FormHintText,
  LoadingText,
  ManagementPageShell,
  PageHeaderActions,
  SectionHeading,
  StatusBadge,
} from '@podverse/ui';

import {
  deleteUser,
  generateInviteLink,
  getInviteLink,
  getUser,
  type InviteLink,
  revokeInviteLink,
  type User,
} from '../../../../lib/requests/users';

type Props = {
  userId: number;
};

export function UserDetailPageClient({ userId }: Props) {
  const t = useTranslations('users');
  const tc = useTranslations('common');

  const [user, setUser] = useState<User | null>(null);
  const [inviteLink, setInviteLink] = useState<InviteLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      await deleteUser(userId);
      window.location.href = '/users';
    } catch {
      setError(t('failedToDelete'));
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

  if (loading) return <LoadingText>{tc('loading')}</LoadingText>;
  if (error) return <Alert>{error}</Alert>;
  if (!user) return <Alert>{t('failedToLoad')}</Alert>;

  return (
    <ManagementPageShell title={t('userDetail')}>
      <ActionLink href="/users" variant="inline" LinkComponent={Link}>
        &larr; {t('backToList')}
      </ActionLink>

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
        <ActionLink href={`/users/${userId}/edit`} variant="primary" LinkComponent={Link}>
          {tc('edit')}
        </ActionLink>
        <Button onClick={() => void handleDelete()} type="button" variant="danger">
          {tc('delete')}
        </Button>
      </PageHeaderActions>

      <Divider />

      <SectionHeading level={2}>{t('inviteLinks')}</SectionHeading>
      {inviteLink ? (
        <div>
          <p>
            <strong>{t('activeInviteLink')}</strong>
          </p>
          <p style={{ wordBreak: 'break-all', margin: 'var(--spacing-md) 0' }}>
            <a href={inviteLink.url} target="_blank" rel="noopener noreferrer">
              {inviteLink.url}
            </a>
          </p>
          <FormHintText variant="block">
            {t('expiresAt', {
              date: new Date(inviteLink.expires_at).toLocaleString(),
            })}
          </FormHintText>
          <PageHeaderActions>
            <CopyToClipboardButton
              textToCopy={inviteLink.url}
              idleLabel={t('copyLink')}
              copiedLabel={t('linkCopied')}
            />
            <Button onClick={() => void handleRevokeLink()} type="button" variant="link">
              {t('revokeLink')}
            </Button>
          </PageHeaderActions>
        </div>
      ) : (
        <div>
          <FormHintText variant="block">{t('noActiveInviteLinks')}</FormHintText>
          <Button onClick={() => void handleGenerateLink()} type="button" variant="link">
            {t('generateInviteLink')}
          </Button>
        </div>
      )}
    </ManagementPageShell>
  );
}
