'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { FormEventHandler } from 'react';
import { useEffect, useState } from 'react';

import type { ResolvedProductMembership } from '@podverse/helpers';
import {
  Alert,
  Breadcrumbs,
  Button,
  DescriptionList,
  DescriptionListRow,
  fieldPrimitiveClasses,
  FormContainer,
  FormGroup,
  FormPrimaryActions,
  Input,
  Label,
  LoadingText,
  ManagementPageShell,
  SectionHeading,
  Table,
} from '@podverse/ui';

import {
  getResolvedProductMembership,
  updateProductMembershipTrial,
} from '../../../../lib/requests/productMembership';
import {
  getActiveProductPricing,
  type ProductPricingRow,
} from '../../../../lib/requests/productPricing';

const FIELD_ORDER: (keyof ResolvedProductMembership)[] = [
  'freeTrialExpirationSeconds',
  'premiumMembershipCostMonthly',
  'premiumMembershipCostAnnually',
  'trialMaxAddByRSSFeeds',
  'trialMaxManualRefreshesPerHour',
  'premiumMaxAddByRSSFeeds',
  'premiumMaxManualRefreshesPerHour',
];

export function ProductMembershipsPageClient() {
  const t = useTranslations('productMemberships');
  const tc = useTranslations('common');
  const [data, setData] = useState<ResolvedProductMembership | null>(null);
  const [pricingRows, setPricingRows] = useState<ProductPricingRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [trialSecondsInput, setTrialSecondsInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [resolvedRes, pricingRes] = await Promise.all([
          getResolvedProductMembership(),
          getActiveProductPricing(),
        ]);
        if (!cancelled) {
          setData(resolvedRes.data);
          setPricingRows(pricingRes.data);
          setTrialSecondsInput(String(resolvedRes.data.freeTrialExpirationSeconds));
        }
      } catch {
        if (!cancelled) {
          setLoadError(t('loadError'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleTrialSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setSaveError(null);
    setSaveSuccess(null);

    const parsedSeconds = Number.parseInt(trialSecondsInput, 10);
    if (!Number.isInteger(parsedSeconds) || parsedSeconds <= 0) {
      setSaveError(t('validation.invalidFreeTrialSeconds'));
      return;
    }

    setSaving(true);
    try {
      const response = await updateProductMembershipTrial({
        freeTrialExpirationSeconds: parsedSeconds,
      });
      setData(response.data);
      setTrialSecondsInput(String(response.data.freeTrialExpirationSeconds));
      setSaveSuccess(t('saveSuccess'));
    } catch {
      setSaveError(t('saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ManagementPageShell
      headerChildren={
        <Breadcrumbs
          LinkComponent={Link}
          marginBottom="lg"
          navAriaLabel={tc('breadcrumbNav')}
          items={[
            { href: '/dashboard', label: t('breadcrumbDashboard') },
            { href: '/products', label: t('breadcrumbProducts') },
            { label: t('pageTitle') },
          ]}
        />
      }
      subtitle={t('pageSubtitle')}
      title={t('pageTitle')}
    >
      {loading && <LoadingText>{tc('loading')}</LoadingText>}
      {loadError && <p role="alert">{loadError}</p>}
      {!loading && !loadError && data !== null && (
        <>
          <SectionHeading level={2}>{t('editableTrialHeading')}</SectionHeading>
          <FormContainer onSubmit={(event) => void handleTrialSubmit(event)}>
            <FormGroup>
              <Label htmlFor="free-trial-expiration-seconds-input">
                {t('fieldLabels.freeTrialExpirationSeconds')}
              </Label>
              <Input
                id="free-trial-expiration-seconds-input"
                type="number"
                min={1}
                className={fieldPrimitiveClasses.input}
                value={trialSecondsInput}
                onChange={(event) => setTrialSecondsInput(event.target.value)}
              />
            </FormGroup>
            <FormPrimaryActions>
              <Button type="submit" disabled={saving}>
                {saving ? tc('saving') : tc('saveChanges')}
              </Button>
            </FormPrimaryActions>
          </FormContainer>
          {saveError !== null && <Alert>{saveError}</Alert>}
          {saveSuccess !== null && <Alert variant="success">{saveSuccess}</Alert>}
          <DescriptionList variant="rows">
            {FIELD_ORDER.map((key) => (
              <DescriptionListRow key={key} detail={data[key]} term={t(`fieldLabels.${key}`)} />
            ))}
          </DescriptionList>
          <SectionHeading level={2}>{t('pricingTable.heading')}</SectionHeading>
          <Table.ScrollContainer>
            <Table>
              <Table.Head>
                <Table.Row>
                  <Table.HeaderCell>{t('pricingTable.cadence')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('pricingTable.amountCents')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('pricingTable.currency')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('pricingTable.effectiveFrom')}</Table.HeaderCell>
                  <Table.HeaderCell>{t('pricingTable.source')}</Table.HeaderCell>
                </Table.Row>
              </Table.Head>
              <Table.Body>
                {pricingRows.map((row) => (
                  <Table.Row key={row.id}>
                    <Table.Cell>{row.billing_cadence}</Table.Cell>
                    <Table.Cell>{row.amount_cents}</Table.Cell>
                    <Table.Cell>{row.currency_code}</Table.Cell>
                    <Table.Cell>{row.effective_from}</Table.Cell>
                    <Table.Cell>{row.source}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </Table.ScrollContainer>
        </>
      )}
    </ManagementPageShell>
  );
}
