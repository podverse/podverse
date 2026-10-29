import { ensureAuthenticated } from '@management-api/lib/auth/index.js';
import { requireCrud } from '@management-api/lib/authz/requireCrud.js';
import { AuditLogService } from '@management-api/lib/database/auditLog.js';
import type { RemoteStubDetail } from '@management-api/lib/feed/feedRemoteStubsAppDb.js';
import { getRemoteStub, listRemoteStubs } from '@management-api/lib/feed/feedRemoteStubsAppDb.js';
import { getAuditRequestId } from '@management-api/lib/getAuditRequestId.js';
import type { RemoteStubListQueryValidated } from '@management-api/schemas/feedRemoteStubs.js';
import type { RemoteStubRepointBodyValidated } from '@management-api/schemas/feedRemoteStubs.js';
import {
  parseRemoteStubListQuery,
  parseRemoteStubRepointBody,
  remoteStubListQuerySchema,
  remoteStubRepointBodySchemaFor,
} from '@management-api/schemas/feedRemoteStubs.js';
import type { Request, Response, Router } from 'express';

import { isIndexProviderId } from '@podverse/helpers';
import type { ScheduledJob } from '@podverse/orm';
import {
  RemoteChannelStubService,
  scheduleRemoteStubPromote,
  scheduleRemoteStubRecheck,
  scheduleRemoteStubRepoint,
} from '@podverse/orm';

const auditLog = new AuditLogService();
const NOT_FOUND = 'Remote stub not found';

function parseIdParam(raw: string | string[] | undefined): number | null {
  if (!raw || Array.isArray(raw)) {
    return null;
  }
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

function readAdminId(req: Request, res: Response): number | null {
  const adminId = req.user?.id;
  if (!adminId) {
    res.status(401).json({ message: 'Authentication required' });
    return null;
  }
  return adminId;
}

function parsePositiveId(raw: string | string[] | undefined, res: Response): number | null {
  const id = parseIdParam(raw);
  if (id === null || id <= 0) {
    res.status(400).json({ message: 'Invalid id' });
    return null;
  }
  return id;
}

function sendUnexpected(res: Response, label: string, err: unknown): void {
  console.error(label, err);
  res.status(500).json({ message: 'Internal server error' });
}

function snapshotRecord(stub: RemoteStubDetail): Record<string, unknown> {
  return {
    id: stub.id,
    index_provider: stub.index_provider,
    provider_feed_id: stub.provider_feed_id,
    title: stub.title,
    feed_url: stub.feed_url,
  };
}

function jobBody(job: ScheduledJob): {
  id: number;
  job_type: string;
  status: string;
  run_after: string;
} {
  return {
    id: job.id,
    job_type: job.job_type,
    status: job.status,
    run_after: job.run_after.toISOString(),
  };
}

async function requireStub(id: number, res: Response): Promise<RemoteStubDetail | null> {
  const stub = await getRemoteStub(id);
  if (stub === null) {
    res.status(404).json({ message: NOT_FOUND });
    return null;
  }
  return stub;
}

async function recordStubAudit(
  req: Request,
  adminId: number,
  stub: RemoteStubDetail,
  operation: 'update' | 'delete',
  afterSnapshot: Record<string, unknown> | null
): Promise<void> {
  await auditLog.record({
    adminAccountId: adminId,
    operation,
    tableName: 'remote_channel_stub',
    rowId: stub.id,
    beforeSnapshot: snapshotRecord(stub),
    afterSnapshot,
    requestId: getAuditRequestId(req),
  });
}

function updateSnapshot(
  stub: RemoteStubDetail,
  scheduledJobType: string,
  targetProviderFeedId?: string
): Record<string, unknown> {
  const after = snapshotRecord(stub);
  after.scheduled_job_type = scheduledJobType;
  if (targetProviderFeedId !== undefined) {
    after.target_provider_feed_id = targetProviderFeedId;
  }
  return after;
}

function pagination(
  query: RemoteStubListQueryValidated,
  total: number
): { page: number; limit: number; total: number; totalPages: number } {
  return {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export function registerFeedRemoteStubRoutes(router: Router): void {
  router.get(
    '/remote-stubs',
    ensureAuthenticated,
    requireCrud('feeds', 'read'),
    async (req, res) => {
      const { error, value } = remoteStubListQuerySchema.validate(req.query, {
        stripUnknown: true,
        convert: true,
      });
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }
      const query = parseRemoteStubListQuery(value);
      if (query === null) {
        res.status(400).json({ message: 'Invalid query' });
        return;
      }
      try {
        const { rows, total } = await listRemoteStubs(query);
        res.json({
          remote_stubs: rows,
          pagination: pagination(query, total),
        });
      } catch (err) {
        sendUnexpected(res, '[feeds/remote-stubs]', err);
      }
    }
  );

  router.get(
    '/remote-stubs/:id',
    ensureAuthenticated,
    requireCrud('feeds', 'read'),
    async (req, res) => {
      const id = parsePositiveId(req.params.id, res);
      if (id === null) {
        return;
      }
      try {
        const stub = await requireStub(id, res);
        if (stub === null) {
          return;
        }
        res.json({ remote_stub: stub });
      } catch (err) {
        sendUnexpected(res, '[feeds/remote-stubs/:id]', err);
      }
    }
  );

  router.post(
    '/remote-stubs/:id/recheck',
    ensureAuthenticated,
    requireCrud('feeds', 'update'),
    async (req, res) => {
      const id = parsePositiveId(req.params.id, res);
      if (id === null) {
        return;
      }
      const adminId = readAdminId(req, res);
      if (adminId === null) {
        return;
      }
      try {
        const stub = await requireStub(id, res);
        if (stub === null) {
          return;
        }
        const job = await scheduleRemoteStubRecheck(id);
        await recordStubAudit(req, adminId, stub, 'update', updateSnapshot(stub, job.job_type));
        res.status(202).json({ job: jobBody(job) });
      } catch (err) {
        sendUnexpected(res, '[feeds/remote-stubs/recheck]', err);
      }
    }
  );

  router.post(
    '/remote-stubs/:id/repoint',
    ensureAuthenticated,
    requireCrud('feeds', 'update'),
    async (req, res) => {
      const id = parsePositiveId(req.params.id, res);
      if (id === null) {
        return;
      }
      const adminId = readAdminId(req, res);
      if (adminId === null) {
        return;
      }
      try {
        const stub = await requireStub(id, res);
        if (stub === null) {
          return;
        }
        const { error, value } = remoteStubRepointBodySchemaFor(stub.index_provider).validate(
          req.body ?? {},
          { stripUnknown: true }
        );
        if (error) {
          res.status(400).json({ message: error.message });
          return;
        }
        const body: RemoteStubRepointBodyValidated | null = parseRemoteStubRepointBody(
          value,
          stub.index_provider
        );
        if (body === null) {
          res.status(400).json({ message: 'Invalid provider feed id' });
          return;
        }
        if (body.provider_feed_id === stub.provider_feed_id) {
          res.status(400).json({ message: 'Target equals the current provider feed id' });
          return;
        }
        const job = await scheduleRemoteStubRepoint(id, body.provider_feed_id);
        await recordStubAudit(
          req,
          adminId,
          stub,
          'update',
          updateSnapshot(stub, job.job_type, body.provider_feed_id)
        );
        res.status(202).json({ job: jobBody(job) });
      } catch (err) {
        sendUnexpected(res, '[feeds/remote-stubs/repoint]', err);
      }
    }
  );

  router.post(
    '/remote-stubs/:id/promote',
    ensureAuthenticated,
    requireCrud('feeds', 'create'),
    async (req, res) => {
      const id = parsePositiveId(req.params.id, res);
      if (id === null) {
        return;
      }
      const adminId = readAdminId(req, res);
      if (adminId === null) {
        return;
      }
      try {
        const stub = await requireStub(id, res);
        if (stub === null) {
          return;
        }
        const indexProvider = stub.index_provider;
        if (!isIndexProviderId(indexProvider)) {
          throw new Error('Remote stub index provider is not recognized');
        }
        const job = await scheduleRemoteStubPromote(indexProvider, stub.provider_feed_id);
        await recordStubAudit(req, adminId, stub, 'update', updateSnapshot(stub, job.job_type));
        res.status(202).json({ job: jobBody(job) });
      } catch (err) {
        sendUnexpected(res, '[feeds/remote-stubs/promote]', err);
      }
    }
  );

  router.delete(
    '/remote-stubs/:id',
    ensureAuthenticated,
    requireCrud('feeds', 'delete'),
    async (req, res) => {
      const id = parsePositiveId(req.params.id, res);
      if (id === null) {
        return;
      }
      const adminId = readAdminId(req, res);
      if (adminId === null) {
        return;
      }
      try {
        const stub = await requireStub(id, res);
        if (stub === null) {
          return;
        }
        const deleted = await new RemoteChannelStubService().deleteById(id);
        if (!deleted) {
          res.status(404).json({ message: NOT_FOUND });
          return;
        }
        await recordStubAudit(req, adminId, stub, 'delete', null);
        res.status(204).send();
      } catch (err) {
        sendUnexpected(res, '[feeds/remote-stubs/delete]', err);
      }
    }
  );
}
