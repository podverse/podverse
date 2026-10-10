'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { FormDropdownOption } from '@podverse/ui';
import {
  Alert,
  Breadcrumbs,
  Button,
  CheckboxField,
  FormDropdown,
  FormGroup,
  FormMaxWidth,
  FormPrimaryActions,
  FormStack,
  ManagementPageShell,
  StackForm,
  Table,
  TextInput,
} from '@podverse/ui';

import { ManagementLoadingSpinnerOverlay } from '../../../../components/LoadingSpinner/ManagementLoadingSpinnerOverlay';
import {
  canCreateBillingProcessorProducts,
  canUpdateBillingProcessorProducts,
} from '../../../../lib/managementPermissions';
import type { CurrentUser } from '../../../../lib/requests/auth';
import type { BillingProcessorProduct } from '../../../../lib/requests/billing';
import {
  createBillingProcessorProduct,
  listBillingProcessorProducts,
  updateBillingProcessorProduct,
} from '../../../../lib/requests/billing';
import { ROUTES } from '../../../../lib/routes';

export type ProcessorProductsPageClientProps = {
  initialUser: CurrentUser;
};

const PROCESSORS = ['paypal', 'apple', 'google_play', 'test'] as const;

type Cadence = 'monthly' | 'annual';

function isCadence(value: string): value is Cadence {
  return value === 'monthly' || value === 'annual';
}

export function ProcessorProductsPageClient({ initialUser }: ProcessorProductsPageClientProps) {
  const [user] = useState(initialUser);
  const [products, setProducts] = useState<BillingProcessorProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [processor, setProcessor] = useState<string>(PROCESSORS[0]);
  const [externalId, setExternalId] = useState('');
  const [basePlan, setBasePlan] = useState('');
  const [cadence, setCadence] = useState<Cadence>('monthly');
  const t = useTranslations('billing');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const canCreate = canCreateBillingProcessorProducts(user);
  const canUpdate = canUpdateBillingProcessorProducts(user);

  const processorOptions = useMemo<FormDropdownOption[]>(
    () => PROCESSORS.map((value) => ({ value, label: value })),
    []
  );
  const cadenceOptions = useMemo<FormDropdownOption[]>(
    () => [
      { value: 'monthly', label: t('products.cadenceMonthly') },
      { value: 'annual', label: t('products.cadenceAnnual') },
    ],
    [t]
  );

  const load = useCallback(async () => {
    const result = await listBillingProcessorProducts();
    setProducts(result.data);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await load();
      } catch {
        if (!cancelled) {
          setError(t('products.failedToLoad'));
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

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await createBillingProcessorProduct({
        processor_id: processor,
        external_product_id: externalId.trim(),
        external_base_plan_id: basePlan.trim() === '' ? null : basePlan.trim(),
        billing_cadence: cadence,
      });
      setExternalId('');
      setBasePlan('');
      await load();
      setNotice(t('products.created'));
    } catch {
      setError(t('products.failedToCreate'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product: BillingProcessorProduct) => {
    setError(null);
    setNotice(null);
    try {
      const result = await updateBillingProcessorProduct(product.id, {
        is_active: !product.is_active,
      });
      setProducts((current) =>
        current.map((row) => (row.id === result.data.id ? result.data : row))
      );
      setNotice(t('products.updated'));
    } catch {
      setError(t('products.failedToUpdate'));
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
            { label: t('products.title') },
          ]}
        />
      }
      title={t('products.title')}
    >
      <ManagementLoadingSpinnerOverlay isLoading={loading} />
      <Alert>{error}</Alert>
      {notice !== null ? <Alert variant="success">{notice}</Alert> : null}
      {!loading && error === null ? (
        <>
          <Table.ScrollContainer>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>{t('products.table.processor')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('products.table.externalId')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('products.table.basePlan')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('products.table.catalogProduct')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('products.table.cadence')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('products.table.active')}</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {products.map((product) => (
                  <Table.Row key={product.id}>
                    <Table.Cell>{product.processor_id}</Table.Cell>
                    <Table.Cell>{product.external_product_id}</Table.Cell>
                    <Table.Cell>{product.external_base_plan_id ?? tc('none')}</Table.Cell>
                    <Table.Cell>{product.billing_product_id}</Table.Cell>
                    <Table.Cell>{product.billing_cadence}</Table.Cell>
                    <Table.Cell>
                      {canUpdate ? (
                        <CheckboxField
                          label={t('products.active')}
                          checked={product.is_active}
                          onChange={() => void toggleActive(product)}
                        />
                      ) : product.is_active ? (
                        t('products.active')
                      ) : (
                        t('products.inactive')
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
                {products.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={6}>{t('products.empty')}</Table.Cell>
                  </Table.Row>
                ) : null}
              </Table.Body>
            </Table>
          </Table.ScrollContainer>
          {canCreate ? (
            <FormMaxWidth>
              <StackForm onSubmit={(event) => void create(event)}>
                <FormStack>
                  <FormGroup>
                    <FormDropdown
                      id="processor-product-processor"
                      eyebrow={t('products.processorLabel')}
                      options={processorOptions}
                      value={processor}
                      onChange={setProcessor}
                    />
                    <TextInput
                      id="processor-product-external-id"
                      eyebrow={t('products.externalIdLabel')}
                      placeholder={t('products.externalIdPlaceholder')}
                      value={externalId}
                      onChange={(event) => setExternalId(event.target.value)}
                      required
                    />
                    <TextInput
                      id="processor-product-base-plan"
                      eyebrow={t('products.basePlanLabel')}
                      placeholder={t('products.basePlanPlaceholder')}
                      value={basePlan}
                      onChange={(event) => setBasePlan(event.target.value)}
                    />
                    <FormDropdown
                      id="processor-product-cadence"
                      eyebrow={t('products.cadenceLabel')}
                      options={cadenceOptions}
                      value={cadence}
                      onChange={(value) => {
                        if (isCadence(value)) {
                          setCadence(value);
                        }
                      }}
                    />
                    <FormPrimaryActions>
                      <Button type="submit" disabled={saving || externalId.trim() === ''}>
                        {t('products.create')}
                      </Button>
                    </FormPrimaryActions>
                  </FormGroup>
                </FormStack>
              </StackForm>
            </FormMaxWidth>
          ) : null}
        </>
      ) : null}
    </ManagementPageShell>
  );
}
