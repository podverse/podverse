'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import {
  Alert,
  Breadcrumbs,
  Button,
  CheckboxField,
  ManagementPageShell,
  Table,
  TextInput,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import { canUpdateBillingChannels } from '../../../../lib/managementPermissions';
import type { CurrentUser } from '../../../../lib/requests/auth';
import type { BillingCheckoutChannel } from '../../../../lib/requests/billing';
import {
  listBillingCheckoutChannels,
  updateBillingCheckoutChannel,
} from '../../../../lib/requests/billing';
import { ROUTES } from '../../../../lib/routes';

export type CheckoutChannelsPageClientProps = {
  initialUser: CurrentUser;
};

type ChannelDraft = {
  enabled: boolean;
  minVersion: string;
  storefronts: string;
};

function draftFromChannel(channel: BillingCheckoutChannel): ChannelDraft {
  return {
    enabled: channel.enabled,
    minVersion: channel.min_client_version ?? '',
    storefronts: channel.storefront_allowlist.join(', '),
  };
}

function parseStorefronts(value: string): string[] {
  return value
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code !== '');
}

export function CheckoutChannelsPageClient({ initialUser }: CheckoutChannelsPageClientProps) {
  const [user] = useState(initialUser);
  const [channels, setChannels] = useState<BillingCheckoutChannel[]>([]);
  const [drafts, setDrafts] = useState<Record<number, ChannelDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const canUpdate = canUpdateBillingChannels(user);

  const load = useCallback(async () => {
    const result = await listBillingCheckoutChannels();
    setChannels(result.data);
    const next: Record<number, ChannelDraft> = {};
    for (const channel of result.data) {
      next[channel.id] = draftFromChannel(channel);
    }
    setDrafts(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await load();
      } catch {
        if (!cancelled) {
          setError(t('channels.failedToLoad'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [load, t]);

  const updateDraft = (id: number, patch: Partial<ChannelDraft>) => {
    setDrafts((current) => {
      const existing = current[id];
      if (existing === undefined) {
        return current;
      }
      return { ...current, [id]: { ...existing, ...patch } };
    });
  };

  const save = async (channel: BillingCheckoutChannel) => {
    const draft = drafts[channel.id];
    if (draft === undefined) {
      return;
    }
    setSavingId(channel.id);
    setError(null);
    setNotice(null);
    try {
      const result = await updateBillingCheckoutChannel(channel.id, {
        enabled: draft.enabled,
        min_client_version: draft.minVersion.trim() === '' ? null : draft.minVersion.trim(),
        storefront_allowlist: parseStorefronts(draft.storefronts),
      });
      setChannels((current) =>
        current.map((row) => (row.id === result.data.id ? result.data : row))
      );
      setDrafts((current) => ({ ...current, [result.data.id]: draftFromChannel(result.data) }));
      setNotice(t('channels.updated'));
    } catch {
      setError(t('channels.failedToUpdate'));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <ManagementPageShell
      headerBreadcrumbs={
        <Breadcrumbs
          LinkComponent={Link}
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: ROUTES.DASHBOARD, label: tNav('dashboard') },
            { href: ROUTES.BILLING, label: t('pageTitle') },
            { label: t('channels.title') },
          ]}
        />
      }
      title={t('channels.title')}
    >
      <ManagementLoadingSpinnerOverlay isLoading={loading} />
      <Alert>{error}</Alert>
      {notice !== null ? <Alert variant="success">{notice}</Alert> : null}
      {!loading && error === null ? (
        <>
          <p>{t('channels.cacheNote')}</p>
          <Table.ScrollContainer>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>{t('channels.table.processor')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('channels.table.platform')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('channels.table.enabled')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('channels.table.minVersion')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('channels.table.storefronts')}</Table.HeaderCell>
                  {canUpdate ? <Table.HeaderCell>{tc('actions')}</Table.HeaderCell> : null}
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {channels.map((channel) => {
                  const draft = drafts[channel.id] ?? draftFromChannel(channel);
                  return (
                    <Table.Row key={channel.id}>
                      <Table.Cell>{channel.processor_id}</Table.Cell>
                      <Table.Cell>{channel.platform}</Table.Cell>
                      <Table.Cell>
                        {canUpdate ? (
                          <CheckboxField
                            label={t('channels.enabled')}
                            checked={draft.enabled}
                            onChange={(checked) => updateDraft(channel.id, { enabled: checked })}
                          />
                        ) : draft.enabled ? (
                          t('channels.enabled')
                        ) : (
                          t('channels.disabled')
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {canUpdate ? (
                          <TextInput
                            id={`channel-${channel.id}-min-version`}
                            eyebrow={t('channels.minVersionLabel')}
                            placeholder={t('channels.minVersionPlaceholder')}
                            value={draft.minVersion}
                            onChange={(event) =>
                              updateDraft(channel.id, { minVersion: event.target.value })
                            }
                          />
                        ) : (
                          (channel.min_client_version ?? tc('none'))
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {canUpdate ? (
                          <TextInput
                            id={`channel-${channel.id}-storefronts`}
                            eyebrow={t('channels.storefrontsLabel')}
                            placeholder={t('channels.storefrontsPlaceholder')}
                            value={draft.storefronts}
                            onChange={(event) =>
                              updateDraft(channel.id, { storefronts: event.target.value })
                            }
                          />
                        ) : channel.storefront_allowlist.length === 0 ? (
                          t('channels.allStorefronts')
                        ) : (
                          channel.storefront_allowlist.join(', ')
                        )}
                      </Table.Cell>
                      {canUpdate ? (
                        <Table.Cell>
                          <Button
                            type="button"
                            onClick={() => void save(channel)}
                            disabled={savingId === channel.id}
                          >
                            {tc('save')}
                          </Button>
                        </Table.Cell>
                      ) : null}
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table>
          </Table.ScrollContainer>
        </>
      ) : null}
    </ManagementPageShell>
  );
}
