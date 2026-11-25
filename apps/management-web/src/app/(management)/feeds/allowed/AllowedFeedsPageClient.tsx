'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import type {
  CatalogAllowlistDirectoryHit,
  CatalogAllowlistFeed,
  CurrentUser,
} from '@podverse/management-api-requests';
import {
  Alert,
  Breadcrumbs,
  Button,
  FormStack,
  ManagementPageShell,
  Modal,
  ModalActions,
  ModalBody,
  Table,
  TextInput,
} from '@podverse/ui';

import { canUpdateFeeds } from '../../../../lib/managementPermissions';
import {
  addCatalogAllowlistFeed,
  getCatalogAllowlist,
  removeCatalogAllowlistFeed,
  searchCatalogAllowlistDirectory,
} from '../../../../lib/requests/feeds';
import { ROUTES } from '../../../../lib/routes';

type SortKey = 'title' | 'podcast_index_id';

type AllowedFeedsPageClientProps = {
  user: CurrentUser;
};

function titleOf(feed: CatalogAllowlistFeed): string {
  return feed.title ?? '';
}

export function AllowedFeedsPageClient({ user }: AllowedFeedsPageClientProps) {
  const t = useTranslations('feedCatalogAllowlist');
  const tHub = useTranslations('feedsHub');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const canUpdate = canUpdateFeeds(user);

  const [feeds, setFeeds] = useState<CatalogAllowlistFeed[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<CatalogAllowlistDirectoryHit[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CatalogAllowlistFeed | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('podcast_index_id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const load = useCallback(async () => {
    try {
      const response = await getCatalogAllowlist();
      setFeeds(response.feeds);
      setLoadError(null);
    } catch {
      setLoadError(tc('error'));
    }
  }, [tc]);

  useEffect(() => {
    void load();
  }, [load]);

  const sorted = useMemo(() => {
    const copy = [...feeds];
    copy.sort((left, right) => {
      const result =
        sortKey === 'title'
          ? titleOf(left).localeCompare(titleOf(right))
          : left.podcast_index_id - right.podcast_index_id;
      return sortDirection === 'asc' ? result : -result;
    });
    return copy;
  }, [feeds, sortDirection, sortKey]);

  function toggleSort(next: SortKey) {
    if (sortKey === next) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(next);
    setSortDirection('asc');
  }

  async function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (term === '') {
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const response = await searchCatalogAllowlistDirectory(term);
      setHits(response.feeds);
    } catch {
      setHits(null);
      setSearchError(t('directoryUnavailable'));
    } finally {
      setSearching(false);
    }
  }

  async function onAdd(hit: CatalogAllowlistDirectoryHit) {
    setBusyId(hit.podcast_index_id);
    setSearchError(null);
    try {
      await addCatalogAllowlistFeed({
        podcast_index_id: hit.podcast_index_id,
        title: hit.title,
        feed_url: hit.feed_url,
      });
      setHits((current) =>
        current === null
          ? current
          : current.map((entry) =>
              entry.podcast_index_id === hit.podcast_index_id
                ? { ...entry, already_allowed: true }
                : entry
            )
      );
      await load();
    } catch {
      setSearchError(t('addFailed'));
    } finally {
      setBusyId(null);
    }
  }

  async function onRemove() {
    if (removeTarget === null) {
      return;
    }
    setBusyId(removeTarget.podcast_index_id);
    try {
      await removeCatalogAllowlistFeed(removeTarget.podcast_index_id);
      setRemoveTarget(null);
      await load();
    } catch {
      setLoadError(t('removeOnDeployment'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: ROUTES.DASHBOARD, label: tNav('dashboard') },
            { href: ROUTES.FEEDS, label: tHub('pageTitle') },
            { label: t('pageTitle') },
          ]}
        />
      }
      title={t('pageTitle')}
    >
      <FormStack>
        <p>{t('pageDescription')}</p>
        {loadError !== null ? (
          <div role="alert">
            <Alert>{loadError}</Alert>
          </div>
        ) : null}
        <form onSubmit={(event) => void onSearch(event)}>
          <FormStack>
            <TextInput
              eyebrow={t('searchEyebrow')}
              id="catalog-allowlist-search"
              onChange={(event) => {
                setQuery(event.target.value);
              }}
              placeholder={t('searchPlaceholder')}
              value={query}
            />
            <Button disabled={searching} isLoading={searching} type="submit" variant="primary">
              {t('searchSubmit')}
            </Button>
          </FormStack>
        </form>
        {searchError !== null ? (
          <div role="alert">
            <Alert>{searchError}</Alert>
          </div>
        ) : null}
        {hits !== null && hits.length === 0 ? <p>{t('searchEmpty')}</p> : null}
        {hits !== null && hits.length > 0 ? (
          <Table>
            <Table.Head>
              <Table.Row>
                <Table.HeaderCell>{t('columnTitle')}</Table.HeaderCell>
                <Table.HeaderCell>{t('columnListedId')}</Table.HeaderCell>
                <Table.HeaderCell>{t('add')}</Table.HeaderCell>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {hits.map((hit) => (
                <Table.Row key={hit.podcast_index_id}>
                  <Table.Cell>{hit.title}</Table.Cell>
                  <Table.Cell>{hit.podcast_index_id}</Table.Cell>
                  <Table.Cell>
                    {hit.already_allowed ? (
                      t('alreadyAllowed')
                    ) : canUpdate ? (
                      <Button
                        disabled={busyId === hit.podcast_index_id}
                        isLoading={busyId === hit.podcast_index_id}
                        onClick={() => void onAdd(hit)}
                        type="button"
                        variant="secondary"
                      >
                        {t('add')}
                      </Button>
                    ) : null}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        ) : null}
        <Table>
          <Table.Head>
            <Table.Row>
              <Table.SortableHeaderCell
                ariaLabel={t('sortByTitle')}
                onSort={() => {
                  toggleSort('title');
                }}
                sortActive={sortKey === 'title'}
                sortDirection={sortKey === 'title' ? sortDirection : null}
              >
                {t('columnTitle')}
              </Table.SortableHeaderCell>
              <Table.SortableHeaderCell
                ariaLabel={t('sortByListedId')}
                onSort={() => {
                  toggleSort('podcast_index_id');
                }}
                sortActive={sortKey === 'podcast_index_id'}
                sortDirection={sortKey === 'podcast_index_id' ? sortDirection : null}
              >
                {t('columnListedId')}
              </Table.SortableHeaderCell>
              <Table.HeaderCell>{t('columnCurrentId')}</Table.HeaderCell>
              <Table.HeaderCell>{t('columnOrigin')}</Table.HeaderCell>
              <Table.HeaderCell>{t('columnStored')}</Table.HeaderCell>
              <Table.HeaderCell>{t('remove')}</Table.HeaderCell>
            </Table.Row>
          </Table.Head>
          <Table.Body>
            {sorted.map((feed) => (
              <Table.Row key={feed.podcast_index_id}>
                <Table.Cell>{feed.title ?? feed.feed_url ?? ''}</Table.Cell>
                <Table.Cell>{feed.podcast_index_id}</Table.Cell>
                <Table.Cell>{feed.resolved_podcast_index_id ?? ''}</Table.Cell>
                <Table.Cell>
                  {feed.origin === 'admin' ? t('originAdmin') : t('originDeployment')}
                </Table.Cell>
                <Table.Cell>{feed.stored ? t('storedYes') : t('storedNo')}</Table.Cell>
                <Table.Cell>
                  {canUpdate && feed.removable ? (
                    <Button
                      onClick={() => {
                        setRemoveTarget(feed);
                      }}
                      type="button"
                      variant="secondary"
                    >
                      {t('remove')}
                    </Button>
                  ) : null}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      </FormStack>
      <Modal
        ariaLabel={t('removeTitle')}
        closeButtonAriaLabel={t('close')}
        header={t('removeTitle')}
        isOpen={removeTarget !== null}
        onClose={() => {
          setRemoveTarget(null);
        }}
      >
        <ModalBody>
          <p>{t('removeConfirm')}</p>
        </ModalBody>
        <ModalActions>
          <Button
            onClick={() => {
              setRemoveTarget(null);
            }}
            type="button"
            variant="secondary"
          >
            {tc('cancel')}
          </Button>
          <Button
            disabled={busyId !== null}
            isLoading={busyId !== null}
            onClick={() => void onRemove()}
            type="button"
            variant="primary"
          >
            {t('remove')}
          </Button>
        </ModalActions>
      </Modal>
    </ManagementPageShell>
  );
}
