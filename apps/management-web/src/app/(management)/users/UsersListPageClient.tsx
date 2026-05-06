'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import {
  ActionLink,
  Alert,
  Button,
  EmptyStateText,
  Input,
  LoadingText,
  ManagementPageShell,
  PageHeaderActions,
  Pagination,
  StatusBadge,
  Table,
} from '@podverse/ui';

import { deleteUser, listUsers, type User } from '../../../lib/requests/users';

export function UsersListPageClient() {
  const t = useTranslations('users');
  const tc = useTranslations('common');

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const loadUsers = useCallback(
    async (p: number, s?: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await listUsers({ page: p, limit: 25, search: s || undefined });
        setUsers(result.users);
        setTotalPages(result.pagination.totalPages);
        setPage(result.pagination.page);
      } catch {
        setError(t('failedToLoad'));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void loadUsers(1);
  }, [loadUsers]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    void loadUsers(newPage, search);
  };

  const handleSearch = () => {
    setSearch(searchInput);
    void loadUsers(1, searchInput);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      await deleteUser(id);
      void loadUsers(page, search);
    } catch {
      setError(t('failedToDelete'));
    }
  };

  return (
    <ManagementPageShell
      title={t('title')}
      headerChildren={
        <PageHeaderActions>
          <ActionLink href="/users/new" variant="primary" LinkComponent={Link}>
            {tc('createNew')}
          </ActionLink>
        </PageHeaderActions>
      }
    >
      <div style={{ maxWidth: '250px', marginBottom: 'var(--spacing-lg)' }}>
        <Input
          type="text"
          placeholder={t('searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          style={{ width: '100%' }}
        />
      </div>

      {loading && <LoadingText>{tc('loading')}</LoadingText>}
      {error && <Alert>{error}</Alert>}
      {!loading && !error && users.length === 0 && (
        <EmptyStateText>{search ? t('noResults') : t('noUsers')}</EmptyStateText>
      )}
      {!loading && !error && users.length > 0 && (
        <>
          <Table.ScrollContainer>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>{t('tableHeaders.id')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('tableHeaders.email')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('tableHeaders.username')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('tableHeaders.verified')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('tableHeaders.createdAt')}</Table.HeaderCell>
                  <Table.HeaderCell>{tc('actions')}</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {users.map((user) => (
                  <Table.Row key={user.id}>
                    <Table.Cell>{user.id_text}</Table.Cell>
                    <Table.Cell>{user.email ?? '-'}</Table.Cell>
                    <Table.Cell>{user.username ?? '-'}</Table.Cell>
                    <Table.Cell>
                      <StatusBadge variant={user.verified ? 'success' : 'warning'}>
                        {user.verified ? tc('yes') : tc('no')}
                      </StatusBadge>
                    </Table.Cell>
                    <Table.Cell>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </Table.Cell>
                    <Table.Cell>
                      <PageHeaderActions>
                        <ActionLink
                          href={`/users/${user.id}`}
                          variant="inline"
                          LinkComponent={Link}
                        >
                          {tc('view')}
                        </ActionLink>
                        <ActionLink
                          href={`/users/${user.id}/edit`}
                          variant="inline"
                          LinkComponent={Link}
                        >
                          {tc('edit')}
                        </ActionLink>
                        <Button
                          onClick={() => void handleDelete(user.id)}
                          type="button"
                          variant="danger"
                        >
                          {tc('delete')}
                        </Button>
                      </PageHeaderActions>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Table.ScrollContainer>

          <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </>
      )}
    </ManagementPageShell>
  );
}
