import { AppDataSourceReadWrite } from '@management-api/orm/db/index.js';
import { DatabaseAuditLog } from '@management-api/orm/entities/databaseAuditLog.js';

const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /credential/i,
  /api_key/i,
  /private_key/i,
  /auth_token/i,
  /access_token/i,
  /refresh_token/i,
  /session_id/i,
];

function redactSensitiveFields(data: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(key))) {
      redacted[key] = '[REDACTED]';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export type AuditRecord = {
  adminAccountId: number;
  operation: 'create' | 'update' | 'delete';
  tableName: string;
  rowId: number;
  beforeSnapshot?: Record<string, unknown> | null;
  afterSnapshot?: Record<string, unknown> | null;
  requestId?: string | null;
};

export class AuditLogService {
  async record(entry: AuditRecord): Promise<void> {
    const repo = AppDataSourceReadWrite.getRepository(DatabaseAuditLog);
    const log = new DatabaseAuditLog();
    log.admin_account_id = entry.adminAccountId;
    log.operation = entry.operation;
    log.table_name = entry.tableName;
    log.row_id = entry.rowId;
    log.before_snapshot = entry.beforeSnapshot ? redactSensitiveFields(entry.beforeSnapshot) : null;
    log.after_snapshot = entry.afterSnapshot ? redactSensitiveFields(entry.afterSnapshot) : null;
    log.request_id = entry.requestId ?? null;
    await repo.save(log);
  }
}
