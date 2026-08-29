'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type { NotificationCategoryValues } from '@podverse/helpers';
import { NOTIFICATION_CATEGORY_VALUES, NotificationCategoryEnum } from '@podverse/helpers';
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
  TextInput,
} from '@podverse/ui';

import { createNotificationCampaign } from '../../../../lib/requests/notificationCampaigns';
import { buildNotificationCampaignPath, ROUTES } from '../../../../lib/routes';

function isNotificationCategoryValue(value: string): value is NotificationCategoryValues {
  return NOTIFICATION_CATEGORY_VALUES.some((categoryValue) => categoryValue === value);
}

export function NewNotificationCampaignPageClient() {
  const router = useRouter();
  const t = useTranslations('notifications');
  const tc = useTranslations('common');
  const tNav = useTranslations('nav');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkPath, setLinkPath] = useState('');
  const [category, setCategory] = useState<NotificationCategoryValues>(
    NotificationCategoryEnum.General
  );
  const [sendPush, setSendPush] = useState(false);
  const [sendAt, setSendAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo<FormDropdownOption[]>(
    () =>
      NOTIFICATION_CATEGORY_VALUES.map((value) => ({
        value,
        label: value,
      })),
    []
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim() === '') {
      setError(t('validation.titleRequired'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await createNotificationCampaign({
        title: title.trim(),
        body: body.trim() === '' ? null : body.trim(),
        link_path: linkPath.trim() === '' ? null : linkPath.trim(),
        category,
        audience: { type: 'all-valid-membership' },
        send_push: sendPush,
        send_at: sendAt.trim() === '' ? null : new Date(sendAt).toISOString(),
      });

      router.push(buildNotificationCampaignPath(response.data.id_text));
      router.refresh();
    } catch {
      setError(t('failedToCreate'));
    } finally {
      setLoading(false);
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
            { href: ROUTES.NOTIFICATIONS, label: t('title') },
            { label: tc('new') },
          ]}
        />
      }
      title={t('newTitle')}
    >
      <FormMaxWidth>
        <StackForm onSubmit={(event) => void handleSubmit(event)}>
          <FormStack>
            <TextInput
              id="notification-title"
              eyebrow={t('fields.title')}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
            <TextInput
              id="notification-body"
              eyebrow={t('fields.body')}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <TextInput
              id="notification-link-path"
              eyebrow={t('fields.linkPath')}
              value={linkPath}
              onChange={(event) => setLinkPath(event.target.value)}
            />
            <FormGroup layout="inStack">
              <FormDropdown
                id="notification-category"
                eyebrow={t('fields.category')}
                options={categoryOptions}
                value={category}
                onChange={(value) => {
                  if (isNotificationCategoryValue(value)) {
                    setCategory(value);
                  }
                }}
              />
            </FormGroup>
            <FormGroup layout="inStack">
              <CheckboxField
                checked={sendPush}
                label={t('fields.sendPush')}
                onChange={setSendPush}
              />
            </FormGroup>
            <TextInput
              id="notification-send-at"
              eyebrow={t('fields.sendAt')}
              type="datetime-local"
              value={sendAt}
              onChange={(event) => setSendAt(event.target.value)}
            />
            <Alert>{error}</Alert>
            <FormPrimaryActions>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(ROUTES.NOTIFICATIONS)}
              >
                {tc('cancel')}
              </Button>
              <Button type="submit" isLoading={loading}>
                {t('create')}
              </Button>
            </FormPrimaryActions>
          </FormStack>
        </StackForm>
      </FormMaxWidth>
    </ManagementPageShell>
  );
}
