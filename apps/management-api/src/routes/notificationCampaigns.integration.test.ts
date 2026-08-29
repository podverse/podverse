import { app } from '@management-api/app.js';
import { config } from '@management-api/config/index.js';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';
const notificationsBase = `${config.api.prefix}${config.api.version}/notifications`;

const nowIso = new Date('2026-08-23T18:00:00.000Z').toISOString();

const mockCampaign = {
  id: 42,
  id_text: 'notifCampA1',
  title: 'Maintenance tonight',
  body: 'Service maintenance starts at midnight.',
  link_path: '/settings',
  category: 'maintenance',
  audience: { type: 'all-valid-membership' },
  send_push: false,
  status: 'scheduled',
  scheduled_at: new Date('2026-08-24T00:00:00.000Z'),
  sent_at: null,
  cancelled_at: null,
  created_by_admin_id: 1,
  created_at: new Date('2026-08-23T12:00:00.000Z'),
  updated_at: new Date('2026-08-23T12:00:00.000Z'),
  last_error: null,
  scheduled_job_dedupe_key: 'admin-notification-send:notifCampA1',
};

const {
  createCampaignMock,
  getByIdTextMock,
  listPaginatedMock,
  markCancelledMock,
  markSentMock,
  updateSchedulingMock,
  upsertByDedupeKeyMock,
  cancelByDedupeKeyMock,
  dispatchCampaignMock,
} = vi.hoisted(() => ({
  createCampaignMock: vi.fn(),
  getByIdTextMock: vi.fn(),
  listPaginatedMock: vi.fn(),
  markCancelledMock: vi.fn(),
  markSentMock: vi.fn(),
  updateSchedulingMock: vi.fn(),
  upsertByDedupeKeyMock: vi.fn(),
  cancelByDedupeKeyMock: vi.fn(),
  dispatchCampaignMock: vi.fn(),
}));

vi.mock('@podverse/orm', async () => {
  const actual = await vi.importActual<typeof import('@podverse/orm')>('@podverse/orm');
  return {
    ...actual,
    AdminNotificationCampaignService: class {
      async create(dto: unknown) {
        return createCampaignMock(dto);
      }
      async getByIdText(idText: string) {
        return getByIdTextMock(idText);
      }
      async listPaginated(params: unknown) {
        return listPaginatedMock(params);
      }
      async markCancelled(id: number, reason?: string) {
        return markCancelledMock(id, reason);
      }
      async markSent(id: number, sentAt: Date) {
        return markSentMock(id, sentAt);
      }
      async updateScheduling(
        id: number,
        params: {
          scheduled_at: Date | null;
          scheduled_job_dedupe_key: string | null;
          status: string;
          last_error?: string | null;
        }
      ) {
        return updateSchedulingMock(id, params);
      }
    },
    ScheduledJobService: class {
      async upsertByDedupeKey(dto: unknown) {
        return upsertByDedupeKeyMock(dto);
      }
      async cancelByDedupeKey(dedupeKey: string) {
        return cancelByDedupeKeyMock(dedupeKey);
      }
    },
    dispatchAdminNotificationCampaign: async (campaign: unknown) => {
      return dispatchCampaignMock(campaign);
    },
  };
});

const superuser = {
  id: 1,
  id_text: 'pvMgtSu001',
  admin_account_role_id: 1,
  admin_account_role: { role: 'superuser' },
  admin_account_credentials: { email: 'super@example.com', username: null },
  permissions: {
    feedsCrud: 15,
    feedTakedownReasonsCrud: 15,
    adminsCrud: 15,
    statsCrud: 15,
    billingPricesCrud: 15,
    bucketCrud: 15,
    embedDemoCrud: 15,
    notificationsCrud: 15,
  },
  created_at: new Date('2020-01-01T00:00:00.000Z'),
};

vi.mock('@management-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async get(_id: number) {
      return superuser;
    }
    async getWithRoleAndPermissions(_id: number) {
      return superuser;
    }
  }
  return { AdminAccountService };
});

const adminAuthHeaders = (): { Authorization: string } => ({
  Authorization: `Bearer ${jwt.sign({ id: 1, id_text: 'pvMgtSu001' }, JWT_SECRET, { expiresIn: '1h' })}`,
});

describe('management-api notification campaigns routes', () => {
  beforeEach(() => {
    createCampaignMock.mockReset();
    getByIdTextMock.mockReset();
    listPaginatedMock.mockReset();
    markCancelledMock.mockReset();
    markSentMock.mockReset();
    updateSchedulingMock.mockReset();
    upsertByDedupeKeyMock.mockReset();
    cancelByDedupeKeyMock.mockReset();
    dispatchCampaignMock.mockReset();

    dispatchCampaignMock.mockResolvedValue({
      notifications_created: 3,
      push_evaluation: [],
    });
    listPaginatedMock.mockResolvedValue({
      rows: [mockCampaign],
      total: 1,
    });
  });

  it('creates and sends immediate campaigns', async () => {
    createCampaignMock.mockResolvedValue({
      ...mockCampaign,
      status: 'sending',
      scheduled_at: null,
    });
    markSentMock.mockResolvedValue({
      ...mockCampaign,
      status: 'sent',
      sent_at: new Date(nowIso),
    });

    const response = await request(app)
      .post(notificationsBase)
      .set(adminAuthHeaders())
      .send({
        title: 'Maintenance now',
        body: 'Short downtime expected.',
        link_path: '/settings',
        category: 'maintenance',
        audience: { type: 'all-valid-membership' },
        send_push: false,
        send_at: null,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('sent');
    expect(dispatchCampaignMock).toHaveBeenCalledTimes(1);
  });

  it('creates scheduled campaigns and enqueues a scheduled job', async () => {
    // Must be in the future relative to the real wall clock so the route treats it as scheduled
    // (not immediate). Compute dynamically so the test does not rot as time passes.
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    createCampaignMock.mockResolvedValue({
      ...mockCampaign,
      status: 'scheduled',
      scheduled_at: new Date(scheduledAt),
    });
    updateSchedulingMock.mockResolvedValue({
      ...mockCampaign,
      status: 'scheduled',
      scheduled_at: new Date(scheduledAt),
    });

    const response = await request(app)
      .post(notificationsBase)
      .set(adminAuthHeaders())
      .send({
        title: 'Maintenance later',
        body: 'Downtime scheduled.',
        link_path: '/settings',
        category: 'maintenance',
        audience: { type: 'all-valid-membership' },
        send_push: false,
        send_at: scheduledAt,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('scheduled');
    expect(upsertByDedupeKeyMock).toHaveBeenCalledTimes(1);
  });

  it('cancels scheduled campaigns and cancels their queued jobs', async () => {
    getByIdTextMock.mockResolvedValue({
      ...mockCampaign,
      status: 'scheduled',
    });
    markCancelledMock.mockResolvedValue({
      ...mockCampaign,
      status: 'cancelled',
      cancelled_at: new Date(nowIso),
    });

    const response = await request(app)
      .post(`${notificationsBase}/${mockCampaign.id_text}/cancel`)
      .set(adminAuthHeaders())
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('cancelled');
    expect(cancelByDedupeKeyMock).toHaveBeenCalledWith(mockCampaign.scheduled_job_dedupe_key);
  });
});
