import { beforeEach, describe, expect, it, vi } from 'vitest';

const savedArgs: unknown[] = [];
const saveMock = vi.fn(async (entity: unknown) => {
  savedArgs.push(entity);
});

vi.mock('@mgmt-api/orm/db/index.js', () => ({
  AppDataSourceReadWrite: {
    getRepository: () => ({
      save: saveMock,
    }),
  },
}));

import { AuditLogService } from './auditLog.js';

describe('AuditLogService', () => {
  let service: AuditLogService;

  beforeEach(() => {
    service = new AuditLogService();
    saveMock.mockClear();
    savedArgs.length = 0;
  });

  it('records an audit entry with all fields', async () => {
    await service.record({
      adminAccountId: 1,
      operation: 'create',
      tableName: 'feed_flag_status_reason',
      rowId: 5,
      afterSnapshot: { id: 5, reason: 'spam' },
      requestId: 'req-123',
    });

    expect(saveMock).toHaveBeenCalledTimes(1);
    const saved = savedArgs[0] as Record<string, unknown>;
    expect(saved.admin_account_id).toBe(1);
    expect(saved.operation).toBe('create');
    expect(saved.table_name).toBe('feed_flag_status_reason');
    expect(saved.row_id).toBe(5);
    expect(saved.request_id).toBe('req-123');
  });

  it('redacts password fields in snapshots', async () => {
    await service.record({
      adminAccountId: 1,
      operation: 'update',
      tableName: 'some_table',
      rowId: 10,
      beforeSnapshot: {
        id: 10,
        name: 'visible',
        password: 'secret123',
      },
      afterSnapshot: {
        id: 10,
        name: 'visible-updated',
        password: 'newsecret456',
      },
      requestId: 'req-456',
    });

    const saved = savedArgs[0] as Record<string, unknown>;
    const before = saved.before_snapshot as Record<string, unknown>;
    const after = saved.after_snapshot as Record<string, unknown>;

    expect(before.password).toBe('[REDACTED]');
    expect(before.name).toBe('visible');
    expect(after.password).toBe('[REDACTED]');
    expect(after.name).toBe('visible-updated');
  });

  it('redacts api_key, token, secret, credential fields', async () => {
    await service.record({
      adminAccountId: 1,
      operation: 'update',
      tableName: 'credentials',
      rowId: 1,
      beforeSnapshot: {
        api_key: 'key-abc',
        access_token: 'tok-xyz',
        client_secret: 'sec-123',
        user_credentials: 'cred-456',
        refresh_token: 'rt-789',
        private_key: 'pk-000',
        name: 'visible',
      },
      afterSnapshot: null,
      requestId: null,
    });

    const saved = savedArgs[0] as Record<string, unknown>;
    const before = saved.before_snapshot as Record<string, unknown>;

    expect(before.api_key).toBe('[REDACTED]');
    expect(before.access_token).toBe('[REDACTED]');
    expect(before.client_secret).toBe('[REDACTED]');
    expect(before.user_credentials).toBe('[REDACTED]');
    expect(before.refresh_token).toBe('[REDACTED]');
    expect(before.private_key).toBe('[REDACTED]');
    expect(before.name).toBe('visible');
  });

  it('handles null snapshots', async () => {
    await service.record({
      adminAccountId: 1,
      operation: 'delete',
      tableName: 'feed_flag_status_reason',
      rowId: 3,
      beforeSnapshot: null,
      requestId: null,
    });

    const saved = savedArgs[0] as Record<string, unknown>;
    expect(saved.before_snapshot).toBeNull();
    expect(saved.after_snapshot).toBeNull();
    expect(saved.request_id).toBeNull();
  });
});
