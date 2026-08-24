import { config } from '@management-api/config/index.js';
import { ensureAuthenticated } from '@management-api/lib/auth/index.js';
import { requireCrud } from '@management-api/lib/authz/requireCrud.js';
import { type PermissionResource } from '@management-api/lib/authz/requireCrud.js';
import { CrudMask } from '@management-api/lib/crud.js';
import { AuditLogService } from '@management-api/lib/database/auditLog.js';
import {
  DatabaseQueryEngine,
  DatabaseQueryError,
  type FilterCondition,
  type QueryOptions,
  type SortCondition,
} from '@management-api/lib/database/queryEngine.js';
import {
  isTableAllowlisted,
  isTableReadOnly,
  TABLE_POLICIES,
  type TablePolicyDefinition,
} from '@management-api/lib/database/tablePolicy.js';
import { getAuditRequestId } from '@management-api/lib/getAuditRequestId.js';
import { getParamRequired } from '@management-api/lib/params.js';
import express from 'express';
import Joi from 'joi';

const router = express.Router();

const queryEngine = new DatabaseQueryEngine();
const auditLog = new AuditLogService();

// --- Validation Schemas ---

const filterSchema = Joi.object({
  field: Joi.string().required(),
  operator: Joi.string()
    .valid('eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'in', 'is_null', 'is_not_null')
    .required(),
  value: Joi.alternatives().conditional('operator', {
    switch: [
      { is: 'in', then: Joi.array().items(Joi.string(), Joi.number()).max(50).required() },
      { is: 'like', then: Joi.string().max(100).required() },
      { is: 'is_null', then: Joi.any().forbidden() },
      { is: 'is_not_null', then: Joi.any().forbidden() },
    ],
    otherwise: Joi.alternatives(Joi.string(), Joi.number()).required(),
  }),
});

const sortSchema = Joi.object({
  field: Joi.string().required(),
  direction: Joi.string().valid('ASC', 'DESC').required(),
});

const querySchema = Joi.object({
  filters: Joi.array().items(filterSchema).max(10).default([]),
  sorts: Joi.array().items(sortSchema).max(3).default([]),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(25),
});

const mutationSchema = Joi.object()
  .pattern(Joi.string(), Joi.alternatives(Joi.string(), Joi.number(), Joi.boolean(), null))
  .min(1)
  .max(20);

// --- Error Handling ---

function sendQueryError(res: express.Response, err: unknown): void {
  if (err instanceof DatabaseQueryError) {
    res.status(400).json({ message: err.message });
    return;
  }
  res.status(500).json({ message: 'Internal server error' });
}

function sendMutationError(res: express.Response, err: unknown): void {
  if (err instanceof DatabaseQueryError) {
    if (err.message.includes('is not allowlisted')) {
      res.status(404).json({ message: 'Table not available' });
      return;
    }
    if (err.message.includes('is read-only')) {
      res.status(403).json({ message: err.message });
      return;
    }
    res.status(400).json({ message: err.message });
    return;
  }
  res.status(500).json({ message: 'Internal server error' });
}

// --- Helper ---

function getPermissionResourceForTable(tableName: string): PermissionResource {
  const policy = TABLE_POLICIES.find((p) => p.tableName === tableName);
  if (!policy) {
    return 'feeds';
  }
  return policy.permissionResource;
}

function checkReadPermission(
  user: Express.User | undefined,
  resource: PermissionResource
): boolean {
  if (!user || user.role === 'superuser') return true;
  if (!user.permissions) return false;
  const crudValue = getCrudForResource(user.permissions, resource);
  return (crudValue & CrudMask.read) !== 0;
}

function checkCrudPermission(
  user: Express.User | undefined,
  resource: PermissionResource,
  op: 'create' | 'update' | 'delete'
): boolean {
  if (!user || user.role === 'superuser') return true;
  if (!user.permissions) return false;
  const crudValue = getCrudForResource(user.permissions, resource);
  const mask =
    op === 'create' ? CrudMask.create : op === 'update' ? CrudMask.update : CrudMask.delete;
  return (crudValue & mask) !== 0;
}

function tablePolicyToMeta(policy: TablePolicyDefinition) {
  return {
    tableName: policy.tableName,
    primaryKeyField: policy.primaryKeyField,
    fields: policy.fields.map((f) => ({
      name: f.name,
      type: f.type,
      nullable: f.nullable,
      updatable: f.updatable,
    })),
    defaultSortField: policy.defaultSortField,
    defaultSortDirection: policy.defaultSortDirection,
    maxPageSize: policy.maxPageSize,
    readOnly: policy.readOnly,
  };
}

// --- Routes ---

// List all allowlisted tables
router.get('/tables', ensureAuthenticated, (_req, res) => {
  res.json({
    tables: TABLE_POLICIES.map(tablePolicyToMeta),
  });
});

// Get table metadata
router.get('/:table/meta', ensureAuthenticated, (req, res) => {
  const tableName = getParamRequired(req, 'table');
  if (!isTableAllowlisted(tableName)) {
    res.status(404).json({ message: `Table "${tableName}" is not available` });
    return;
  }

  const policy = TABLE_POLICIES.find((p) => p.tableName === tableName);
  if (!policy) {
    res.status(404).json({ message: `Table "${tableName}" is not available` });
    return;
  }

  res.json(tablePolicyToMeta(policy));
});

// Query rows (list with filters/sorts/pagination)
router.post(
  '/:table/query',
  ensureAuthenticated,
  requireCrud(getPermissionResourceForTable('__dynamic__'), 'read'),
  async (req, res) => {
    try {
      const tableName = getParamRequired(req, 'table');
      if (!isTableAllowlisted(tableName)) {
        res.status(404).json({ message: `Table "${tableName}" is not available` });
        return;
      }

      const resource = getPermissionResourceForTable(tableName);
      if (!checkReadPermission(req.user, resource)) {
        res.status(403).json({ message: 'Insufficient permissions' });
        return;
      }

      const { error, value } = querySchema.validate(req.body);
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }

      const options: QueryOptions = {
        filters: value.filters as FilterCondition[],
        sorts: value.sorts as SortCondition[],
        page: value.page,
        pageSize: value.pageSize,
      };

      const result = await queryEngine.queryTable(tableName, options);
      res.json(result);
    } catch (err) {
      sendQueryError(res, err);
    }
  }
);

// Get single row by id
router.get('/:table/:id', ensureAuthenticated, async (req, res) => {
  try {
    const tableName = getParamRequired(req, 'table');
    if (!isTableAllowlisted(tableName)) {
      res.status(404).json({ message: `Table "${tableName}" is not available` });
      return;
    }

    const resource = getPermissionResourceForTable(tableName);
    if (!checkReadPermission(req.user, resource)) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    const idParam = getParamRequired(req, 'id');
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const row = await queryEngine.getRow(tableName, id);
    if (!row) {
      res.status(404).json({ message: 'Row not found' });
      return;
    }

    res.json(row);
  } catch (err) {
    sendQueryError(res, err);
  }
});

// Create row
router.post('/:table', ensureAuthenticated, async (req, res) => {
  try {
    const tableName = getParamRequired(req, 'table');
    if (!isTableAllowlisted(tableName)) {
      res.status(404).json({ message: 'Table not available' });
      return;
    }

    if (isTableReadOnly(tableName)) {
      res.status(403).json({ message: `Table "${tableName}" is read-only` });
      return;
    }

    const resource = getPermissionResourceForTable(tableName);
    if (!checkCrudPermission(req.user, resource, 'create')) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    const { error, value } = mutationSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.message });
      return;
    }

    const adminId = req.user?.id;
    if (!adminId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const row = await queryEngine.createRow(tableName, value);

    await auditLog.record({
      adminAccountId: adminId,
      operation: 'create',
      tableName,
      rowId: row.id as number,
      afterSnapshot: row,
      requestId: getAuditRequestId(req),
    });

    res.status(201).json(row);
  } catch (err) {
    sendMutationError(res, err);
  }
});

// Update row
router.patch('/:table/:id', ensureAuthenticated, async (req, res) => {
  try {
    const tableName = getParamRequired(req, 'table');
    if (!isTableAllowlisted(tableName)) {
      res.status(404).json({ message: 'Table not available' });
      return;
    }

    if (isTableReadOnly(tableName)) {
      res.status(403).json({ message: `Table "${tableName}" is read-only` });
      return;
    }

    const resource = getPermissionResourceForTable(tableName);
    if (!checkCrudPermission(req.user, resource, 'update')) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    const idParam = getParamRequired(req, 'id');
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const { error, value } = mutationSchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.message });
      return;
    }

    const beforeRow = await queryEngine.getRow(tableName, id);
    if (!beforeRow) {
      res.status(404).json({ message: 'Row not found' });
      return;
    }

    const adminId = req.user?.id;
    if (!adminId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const row = await queryEngine.updateRow(tableName, id, value);
    if (!row) {
      res.status(404).json({ message: 'Row not found' });
      return;
    }

    await auditLog.record({
      adminAccountId: adminId,
      operation: 'update',
      tableName,
      rowId: id,
      beforeSnapshot: beforeRow,
      afterSnapshot: row,
      requestId: getAuditRequestId(req),
    });

    res.json(row);
  } catch (err) {
    sendMutationError(res, err);
  }
});

// Delete row
router.delete('/:table/:id', ensureAuthenticated, async (req, res) => {
  try {
    const tableName = getParamRequired(req, 'table');
    if (!isTableAllowlisted(tableName)) {
      res.status(404).json({ message: 'Table not available' });
      return;
    }

    if (isTableReadOnly(tableName)) {
      res.status(403).json({ message: `Table "${tableName}" is read-only` });
      return;
    }

    const resource = getPermissionResourceForTable(tableName);
    if (!checkCrudPermission(req.user, resource, 'delete')) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }

    const idParam = getParamRequired(req, 'id');
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const beforeRow = await queryEngine.getRow(tableName, id);
    if (!beforeRow) {
      res.status(404).json({ message: 'Row not found' });
      return;
    }

    const adminId = req.user?.id;
    if (!adminId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const deleted = await queryEngine.deleteRow(tableName, id);
    if (!deleted) {
      res.status(404).json({ message: 'Row not found' });
      return;
    }

    await auditLog.record({
      adminAccountId: adminId,
      operation: 'delete',
      tableName,
      rowId: id,
      beforeSnapshot: beforeRow,
      requestId: getAuditRequestId(req),
    });

    res.json({ message: 'Row deleted' });
  } catch (err) {
    sendMutationError(res, err);
  }
});

function getCrudForResource(
  permissions: NonNullable<Express.User['permissions']>,
  resource: PermissionResource
): number {
  switch (resource) {
    case 'feeds':
      return permissions.feeds_crud;
    case 'feed_takedown_reasons':
      return permissions.feed_takedown_reasons_crud;
    case 'admins':
      return permissions.admins_crud;
    case 'stats':
      return permissions.stats_crud;
    case 'billing_prices':
      return permissions.billing_prices_crud ?? 0;
    case 'bucket':
      return permissions.bucket_crud ?? 0;
    case 'embed_demo':
      return permissions.embed_demo_crud ?? 0;
    case 'notifications':
      return permissions.notifications_crud ?? 0;
  }
}

const databaseRoot = express.Router();
databaseRoot.use(`${config.api.prefix}${config.api.version}/database`, router);
export const databaseRouter = databaseRoot;
