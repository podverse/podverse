import { describe, expect, it, vi } from 'vitest';

import {
  MEMBERSHIP_EXPIRY_REMINDER_JOB_TYPE,
  MembershipExpiryReminderSchedulerService,
  parseMembershipExpiryReminderPayload,
} from './membershipExpiryReminderScheduler.js';

describe('parseMembershipExpiryReminderPayload', () => {
  it('parses valid payload', () => {
    const payload = parseMembershipExpiryReminderPayload({
      accountId: 77,
      expiresAt: '2026-08-01T00:00:00.000Z',
    });

    expect(payload).not.toBeNull();
    expect(payload).toMatchObject({
      accountId: 77,
      expiresAtIso: '2026-08-01T00:00:00.000Z',
    });
  });

  it('returns null for malformed payload', () => {
    const payload = parseMembershipExpiryReminderPayload({
      accountId: '77',
      expiresAt: 'not-a-date',
    });

    expect(payload).toBeNull();
  });
});

describe('MembershipExpiryReminderSchedulerService', () => {
  it('cancels any existing dedupe row when membership expiration is null', async () => {
    const cancelByDedupeKey = vi.fn().mockResolvedValue(null);
    const upsertByDedupeKey = vi.fn();
    const scheduler = new MembershipExpiryReminderSchedulerService({
      cancelByDedupeKey,
      upsertByDedupeKey,
    });

    await scheduler.syncAccountReminder({
      accountId: 12,
      membershipExpiresAt: null,
      now: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(cancelByDedupeKey).toHaveBeenCalledWith('membership-expiry:account:12');
    expect(upsertByDedupeKey).not.toHaveBeenCalled();
  });

  it('schedules reminder for seven days before expiration when future dated', async () => {
    const cancelByDedupeKey = vi.fn().mockResolvedValue(null);
    const upsertByDedupeKey = vi.fn().mockResolvedValue({});
    const scheduler = new MembershipExpiryReminderSchedulerService({
      cancelByDedupeKey,
      upsertByDedupeKey,
    });
    const now = new Date('2026-03-01T00:00:00.000Z');
    const expiresAt = new Date('2026-03-20T00:00:00.000Z');

    await scheduler.syncAccountReminder({
      accountId: 45,
      membershipExpiresAt: expiresAt,
      now,
    });

    expect(upsertByDedupeKey).toHaveBeenCalledWith({
      dedupe_key: 'membership-expiry:account:45',
      job_type: MEMBERSHIP_EXPIRY_REMINDER_JOB_TYPE,
      payload: {
        accountId: 45,
        expiresAt: expiresAt.toISOString(),
      },
      run_after: new Date('2026-03-13T00:00:00.000Z'),
    });
  });

  it('schedules immediate run when expiration is inside the lead window', async () => {
    const cancelByDedupeKey = vi.fn().mockResolvedValue(null);
    const upsertByDedupeKey = vi.fn().mockResolvedValue({});
    const scheduler = new MembershipExpiryReminderSchedulerService({
      cancelByDedupeKey,
      upsertByDedupeKey,
    });
    const now = new Date('2026-03-01T00:00:00.000Z');
    const expiresAt = new Date('2026-03-04T00:00:00.000Z');

    await scheduler.syncAccountReminder({
      accountId: 99,
      membershipExpiresAt: expiresAt,
      now,
    });

    expect(upsertByDedupeKey).toHaveBeenCalledWith(
      expect.objectContaining({
        run_after: now,
      })
    );
  });
});
