import { config } from '@management-api/config/index.js';
import { ensureAuthenticated } from '@management-api/lib/auth/index.js';
import { requireCrud } from '@management-api/lib/authz/requireCrud.js';
import { getParamRequired } from '@management-api/lib/params.js';
import {
  createNotificationCampaignSchema,
  listNotificationCampaignsQuerySchema,
} from '@management-api/schemas/notificationCampaigns.js';
import express from 'express';

import { AdminNotificationCampaignStatusEnum } from '@podverse/helpers';
import type { AdminNotificationCampaign } from '@podverse/orm';
import {
  ADMIN_NOTIFICATION_SEND_JOB_TYPE,
  AdminNotificationCampaignService,
  buildAdminNotificationSendDedupeKey,
  dispatchAdminNotificationCampaign,
  ScheduledJobService,
} from '@podverse/orm';

const router = express.Router();

function campaignToJson(campaign: AdminNotificationCampaign) {
  return {
    id: campaign.id,
    id_text: campaign.id_text,
    title: campaign.title,
    body: campaign.body ?? null,
    link_path: campaign.link_path ?? null,
    category: campaign.category,
    audience: campaign.audience,
    send_push: campaign.send_push,
    status: campaign.status,
    scheduled_at: campaign.scheduled_at?.toISOString() ?? null,
    sent_at: campaign.sent_at?.toISOString() ?? null,
    cancelled_at: campaign.cancelled_at?.toISOString() ?? null,
    created_by_admin_id: campaign.created_by_admin_id ?? null,
    created_at: campaign.created_at.toISOString(),
    updated_at: campaign.updated_at.toISOString(),
    last_error: campaign.last_error ?? null,
  };
}

router.get('/', ensureAuthenticated, requireCrud('notifications', 'read'), async (req, res) => {
  const { error, value } = listNotificationCampaignsQuerySchema.validate(req.query, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  const service = new AdminNotificationCampaignService();
  const page = value.page as number;
  const limit = value.limit as number;
  const status = value.status as AdminNotificationCampaignStatusEnum | undefined;
  const category = value.category as AdminNotificationCampaign['category'] | undefined;

  const { rows, total } = await service.listPaginated({ category, limit, page, status });
  const totalPages = Math.max(1, Math.ceil(total / limit));

  res.json({
    data: rows.map(campaignToJson),
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
});

router.get(
  '/:id_text',
  ensureAuthenticated,
  requireCrud('notifications', 'read'),
  async (req, res) => {
    const idText = getParamRequired(req, 'id_text');
    const service = new AdminNotificationCampaignService();
    const campaign = await service.getByIdText(idText);
    if (campaign === null) {
      res.status(404).json({ message: 'Notification campaign not found' });
      return;
    }
    res.json({ data: campaignToJson(campaign) });
  }
);

router.post('/', ensureAuthenticated, requireCrud('notifications', 'create'), async (req, res) => {
  const { error, value } = createNotificationCampaignSchema.validate(req.body, {
    convert: true,
    stripUnknown: true,
  });
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  const actor = req.user;
  if (actor === undefined) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const sendAtRaw = value.send_at as string | null | undefined;
  const sendAt = sendAtRaw === undefined || sendAtRaw === null ? null : new Date(sendAtRaw);
  if (
    sendAt !== null &&
    sendAtRaw !== null &&
    sendAtRaw !== undefined &&
    Number.isNaN(sendAt.getTime())
  ) {
    res.status(400).json({ message: 'Invalid send_at' });
    return;
  }

  const now = new Date();
  const isImmediate = sendAt === null || sendAt.getTime() <= now.getTime();

  const campaignService = new AdminNotificationCampaignService();
  const scheduledJobService = new ScheduledJobService();

  const status = isImmediate
    ? AdminNotificationCampaignStatusEnum.Sending
    : AdminNotificationCampaignStatusEnum.Scheduled;

  const campaign = await campaignService.create({
    audience: value.audience as AdminNotificationCampaign['audience'],
    body: value.body ?? null,
    category: value.category as AdminNotificationCampaign['category'],
    created_by_admin_id: actor.id,
    link_path: value.link_path ?? null,
    scheduled_at: sendAt,
    scheduled_job_dedupe_key: null,
    send_push: (value.send_push as boolean | undefined) ?? false,
    status,
    title: value.title as string,
  });

  if (isImmediate) {
    await dispatchAdminNotificationCampaign(campaign);
    const sentCampaign = await campaignService.markSent(campaign.id, new Date());
    if (sentCampaign === null) {
      res.status(500).json({ message: 'Failed to update campaign status' });
      return;
    }
    res.status(201).json({ data: campaignToJson(sentCampaign) });
    return;
  }

  const scheduledDedupeKey = buildAdminNotificationSendDedupeKey(campaign.id_text);
  await scheduledJobService.upsertByDedupeKey({
    dedupe_key: scheduledDedupeKey,
    job_type: ADMIN_NOTIFICATION_SEND_JOB_TYPE,
    payload: { campaignIdText: campaign.id_text },
    run_after: sendAt ?? now,
  });
  const scheduledCampaign = await campaignService.updateScheduling(campaign.id, {
    scheduled_at: sendAt,
    scheduled_job_dedupe_key: scheduledDedupeKey,
    status: AdminNotificationCampaignStatusEnum.Scheduled,
  });

  if (scheduledCampaign === null) {
    res.status(500).json({ message: 'Failed to schedule notification campaign' });
    return;
  }
  res.status(201).json({ data: campaignToJson(scheduledCampaign) });
});

router.post(
  '/:id_text/cancel',
  ensureAuthenticated,
  requireCrud('notifications', 'update'),
  async (req, res) => {
    const idText = getParamRequired(req, 'id_text');
    const campaignService = new AdminNotificationCampaignService();
    const campaign = await campaignService.getByIdText(idText);
    if (campaign === null) {
      res.status(404).json({ message: 'Notification campaign not found' });
      return;
    }
    if (campaign.status !== AdminNotificationCampaignStatusEnum.Scheduled) {
      res.status(400).json({ message: 'Only scheduled campaigns can be cancelled' });
      return;
    }
    const dedupeKey = campaign.scheduled_job_dedupe_key;
    if (dedupeKey === null || dedupeKey === undefined || dedupeKey === '') {
      res.status(400).json({ message: 'Campaign has no scheduled job to cancel' });
      return;
    }
    const scheduledJobService = new ScheduledJobService();
    await scheduledJobService.cancelByDedupeKey(dedupeKey);
    const cancelledCampaign = await campaignService.markCancelled(
      campaign.id,
      'Cancelled by admin'
    );
    if (cancelledCampaign === null) {
      res.status(500).json({ message: 'Failed to cancel campaign' });
      return;
    }
    res.json({ data: campaignToJson(cancelledCampaign) });
  }
);

router.delete(
  '/:id_text',
  ensureAuthenticated,
  requireCrud('notifications', 'delete'),
  async (req, res) => {
    const campaignService = new AdminNotificationCampaignService();
    const campaign = await campaignService.getByIdText(getParamRequired(req, 'id_text'));
    if (campaign === null) {
      res.status(404).json({ message: 'Notification campaign not found' });
      return;
    }
    if (campaign.status !== AdminNotificationCampaignStatusEnum.Draft) {
      res.status(400).json({ message: 'Only draft campaigns can be deleted' });
      return;
    }

    await campaignService.markCancelled(campaign.id, 'Deleted draft campaign');
    res.json({ message: 'Draft campaign deleted' });
  }
);

const notificationCampaignsRoot = express.Router();
notificationCampaignsRoot.use(`${config.api.prefix}${config.api.version}/notifications`, router);

export const notificationCampaignsRouter = notificationCampaignsRoot;
