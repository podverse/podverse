import { config } from '@management-api/config/index.js';
import { ensureAuthenticated } from '@management-api/lib/auth/index.js';
import { requireCrud } from '@management-api/lib/authz/requireCrud.js';
import { AuditLogService } from '@management-api/lib/database/auditLog.js';
import type { UpdateFeedOperationsPolicyStateParams } from '@management-api/lib/feed/feedFlagStatusAppDb.js';
import {
  assertTakedownReasonExists,
  findFeedByInternalId,
  findFeedByPodcastIndexId,
  findFeedByUrl,
  getFeedAuditSnapshotById,
  listConditionTypeOptions,
  listFeedOperationsForTable,
  listLifecycleStateOptions,
  listTakedownReasonOptions,
  updateFeedOperationsPolicyState,
} from '@management-api/lib/feed/feedFlagStatusAppDb.js';
import {
  toConditionTypeEnums,
  toLifecycleStateEnum,
} from '@management-api/lib/feed/feedOperationsEnums.js';
import { getAuditRequestId } from '@management-api/lib/getAuditRequestId.js';
import {
  feedOperationsListQuerySchema,
  type FeedOperationsListQueryValidated,
} from '@management-api/schemas/feedOperationsListQuery.js';
import { feedOperationsUpdatePolicyStateBodySchema } from '@management-api/schemas/feedOperationsPolicy.js';
import express from 'express';

import { FeedLifecycleStateKeyEnum } from '@podverse/orm';

const router = express.Router();
const auditLog = new AuditLogService();

function parseIdParam(raw: string | string[] | undefined): number | null {
  if (!raw || Array.isArray(raw)) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

router.get('/options', ensureAuthenticated, requireCrud('feeds', 'read'), async (_req, res) => {
  try {
    const [lifecycle_states, condition_types, takedown_reasons] = await Promise.all([
      listLifecycleStateOptions(),
      listConditionTypeOptions(),
      listTakedownReasonOptions(),
    ]);
    res.json({ lifecycle_states, condition_types, takedown_reasons });
  } catch (err) {
    console.error('[feeds/options]', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/', ensureAuthenticated, requireCrud('feeds', 'read'), async (req, res) => {
  const { error, value } = feedOperationsListQuerySchema.validate(req.query, {
    stripUnknown: true,
    convert: true,
  });
  if (error) {
    res.status(400).json({ message: error.message });
    return;
  }

  const q = value as FeedOperationsListQueryValidated;
  const qTrimmed = q.q !== undefined && q.q.length > 0 ? q.q : null;
  const lifecycleTrimmed = q.lifecycle !== undefined && q.lifecycle.length > 0 ? q.lifecycle : null;

  try {
    const { feeds, total } = await listFeedOperationsForTable({
      page: q.page,
      limit: q.limit,
      sort: q.sort,
      order: q.order,
      q: qTrimmed,
      lifecycle: lifecycleTrimmed,
    });
    const totalPages = Math.max(1, Math.ceil(total / q.limit));
    res.json({
      feeds,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error('[feeds/list]', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/lookup', ensureAuthenticated, requireCrud('feeds', 'read'), async (req, res) => {
  try {
    const podcastRaw = req.query.podcast_index_id;
    const feedIdRaw = req.query.feed_id;
    const urlRaw = req.query.url;

    const nPresent =
      (podcastRaw !== undefined && String(podcastRaw).length > 0 ? 1 : 0) +
      (feedIdRaw !== undefined && String(feedIdRaw).length > 0 ? 1 : 0) +
      (urlRaw !== undefined && String(urlRaw).length > 0 ? 1 : 0);

    if (nPresent !== 1) {
      res
        .status(400)
        .json({ message: 'Provide exactly one of: podcast_index_id, feed_id, or url' });
      return;
    }

    if (podcastRaw !== undefined && String(podcastRaw).length > 0) {
      const podcast_index_id = parseInt(String(podcastRaw), 10);
      if (Number.isNaN(podcast_index_id) || podcast_index_id <= 0) {
        res.status(400).json({ message: 'Invalid podcast_index_id' });
        return;
      }
      const row = await findFeedByPodcastIndexId(podcast_index_id);
      if (!row) {
        res.status(404).json({ message: 'Feed not found' });
        return;
      }
      res.json({ feed: row });
      return;
    }

    if (feedIdRaw !== undefined && String(feedIdRaw).length > 0) {
      const feed_id = parseInt(String(feedIdRaw), 10);
      if (Number.isNaN(feed_id) || feed_id <= 0) {
        res.status(400).json({ message: 'Invalid feed_id' });
        return;
      }
      const row = await findFeedByInternalId(feed_id);
      if (!row) {
        res.status(404).json({ message: 'Feed not found' });
        return;
      }
      res.json({ feed: row });
      return;
    }

    const url = String(urlRaw).trim();
    if (!url) {
      res.status(400).json({ message: 'url is required when using url lookup' });
      return;
    }
    const row = await findFeedByUrl(url);
    if (!row) {
      res.status(404).json({ message: 'Feed not found' });
      return;
    }
    res.json({ feed: row });
  } catch (err) {
    console.error('[feeds/lookup]', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

router.patch(
  '/:id/policy-state',
  ensureAuthenticated,
  requireCrud('feeds', 'update'),
  async (req, res) => {
    const feedId = parseIdParam(req.params.id);
    if (feedId === null || feedId <= 0) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const { error, value } = feedOperationsUpdatePolicyStateBodySchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.message });
      return;
    }

    const adminId = req.user?.id;
    if (!adminId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    try {
      const lifecycleKey = toLifecycleStateEnum(value.lifecycle_state_key);

      const reasonKeyTrimmed =
        value.lifecycle_reason_key === undefined ||
        value.lifecycle_reason_key === null ||
        value.lifecycle_reason_key === ''
          ? null
          : String(value.lifecycle_reason_key).trim() || null;

      const transitionNoteResolved =
        value.transition_note === undefined
          ? undefined
          : value.transition_note === null || value.transition_note === ''
            ? null
            : String(value.transition_note).trim() || null;

      if (lifecycleKey === FeedLifecycleStateKeyEnum.Takedown) {
        const hasTransitionDoc =
          transitionNoteResolved !== undefined &&
          transitionNoteResolved !== null &&
          transitionNoteResolved.length > 0;
        const hasReason = reasonKeyTrimmed !== null && reasonKeyTrimmed.length > 0;
        if (!hasTransitionDoc && !hasReason) {
          res.status(400).json({
            message:
              'Takedown requires transition_note and/or a predefined lifecycle_reason_key (from options)',
          });
          return;
        }
        if (reasonKeyTrimmed !== null && !(await assertTakedownReasonExists(reasonKeyTrimmed))) {
          res.status(400).json({ message: 'Invalid lifecycle_reason_key' });
          return;
        }
      }

      const activeKeysRaw =
        value.active_condition_keys !== undefined
          ? toConditionTypeEnums(value.active_condition_keys)
          : undefined;

      const before = await getFeedAuditSnapshotById(feedId);
      if (!before) {
        res.status(404).json({ message: 'Feed not found' });
        return;
      }

      const payload: UpdateFeedOperationsPolicyStateParams = {};
      if (lifecycleKey !== undefined) {
        payload.lifecycleStateKey = lifecycleKey;
      }
      if (activeKeysRaw !== undefined) {
        payload.activeConditionKeys = activeKeysRaw;
      }
      if (value.lifecycle_reason_key !== undefined) {
        payload.lifecycleReasonKey = reasonKeyTrimmed;
      }
      if (value.transition_note !== undefined) {
        payload.transitionNote = transitionNoteResolved ?? null;
      }
      if (value.condition_note !== undefined) {
        payload.conditionNote =
          value.condition_note === null || value.condition_note === ''
            ? null
            : String(value.condition_note).trim() || null;
      }
      if (value.spam_item_limit_override !== undefined) {
        payload.spamItemLimitOverride = value.spam_item_limit_override;
      }
      if (value.max_response_body_bytes_override !== undefined) {
        payload.maxResponseBodyBytesOverride = value.max_response_body_bytes_override;
      }
      if (value.policy_overrides !== undefined) {
        payload.policyOverrides = value.policy_overrides ?? null;
      }
      if (value.takedown_transitional !== undefined) {
        payload.takedownTransitional = value.takedown_transitional;
      }

      await updateFeedOperationsPolicyState(feedId, adminId, payload);

      const afterFeed = await findFeedByInternalId(feedId);
      if (!afterFeed) {
        res.status(500).json({ message: 'Failed to read feed after update' });
        return;
      }

      const after = await getFeedAuditSnapshotById(feedId);

      await auditLog.record({
        adminAccountId: adminId,
        operation: 'update',
        tableName: 'feed',
        rowId: feedId,
        beforeSnapshot: before,
        afterSnapshot: after ?? { ...afterFeed },
        requestId: getAuditRequestId(req),
      });

      res.json({ feed: afterFeed });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Disallowed lifecycle transition')) {
        res.status(400).json({ message });
        return;
      }
      if (message.includes('Takedown lifecycle requires takedown_active')) {
        res.status(400).json({ message });
        return;
      }
      console.error('[feeds/policy-state]', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

const feedsRoot = express.Router();
feedsRoot.use(`${config.api.prefix}${config.api.version}/feeds`, router);

export const feedsRouter = feedsRoot;
