import { ScheduledJobService } from '@orm/services/account/scheduledJob.js';

const MEMBERSHIP_EXPIRY_REMINDER_LEAD_DAYS = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const MEMBERSHIP_EXPIRY_REMINDER_JOB_TYPE = 'membership-expiry-reminder';

export type MembershipExpiryReminderJobPayload = {
  accountId: number;
  expiresAt: string;
};

export type ParsedMembershipExpiryReminderJobPayload = {
  accountId: number;
  expiresAt: Date;
  expiresAtIso: string;
};

type SyncAccountReminderParams = {
  accountId: number;
  membershipExpiresAt: Date | null;
  now?: Date;
};

type ScheduledJobWriteService = Pick<
  ScheduledJobService,
  'cancelByDedupeKey' | 'upsertByDedupeKey'
>;

export function parseMembershipExpiryReminderPayload(
  payload: Record<string, unknown>
): ParsedMembershipExpiryReminderJobPayload | null {
  const accountIdValue = payload.accountId;
  const expiresAtValue = payload.expiresAt;

  if (
    typeof accountIdValue !== 'number' ||
    !Number.isInteger(accountIdValue) ||
    accountIdValue <= 0
  ) {
    return null;
  }

  if (typeof expiresAtValue !== 'string') {
    return null;
  }

  const expiresAt = new Date(expiresAtValue);
  if (Number.isNaN(expiresAt.getTime())) {
    return null;
  }

  return {
    accountId: accountIdValue,
    expiresAt,
    expiresAtIso: expiresAtValue,
  };
}

export class MembershipExpiryReminderSchedulerService {
  protected scheduledJobService: ScheduledJobWriteService;

  constructor(scheduledJobService?: ScheduledJobWriteService) {
    this.scheduledJobService = scheduledJobService ?? new ScheduledJobService();
  }

  static buildDedupeKey(accountId: number): string {
    return `membership-expiry:account:${accountId}`;
  }

  static calculateRunAfter(membershipExpiresAt: Date, now: Date): Date {
    const runAfterMs =
      membershipExpiresAt.getTime() - MEMBERSHIP_EXPIRY_REMINDER_LEAD_DAYS * MILLISECONDS_PER_DAY;

    return runAfterMs <= now.getTime() ? now : new Date(runAfterMs);
  }

  async cancelForAccount(accountId: number): Promise<void> {
    await this.scheduledJobService.cancelByDedupeKey(
      MembershipExpiryReminderSchedulerService.buildDedupeKey(accountId)
    );
  }

  async syncAccountReminder(params: SyncAccountReminderParams): Promise<void> {
    const dedupeKey = MembershipExpiryReminderSchedulerService.buildDedupeKey(params.accountId);

    await this.scheduledJobService.cancelByDedupeKey(dedupeKey);

    if (params.membershipExpiresAt === null) {
      return;
    }

    const now = params.now ?? new Date();
    const runAfter = MembershipExpiryReminderSchedulerService.calculateRunAfter(
      params.membershipExpiresAt,
      now
    );
    const payload: MembershipExpiryReminderJobPayload = {
      accountId: params.accountId,
      expiresAt: params.membershipExpiresAt.toISOString(),
    };

    await this.scheduledJobService.upsertByDedupeKey({
      dedupe_key: dedupeKey,
      job_type: MEMBERSHIP_EXPIRY_REMINDER_JOB_TYPE,
      payload,
      run_after: runAfter,
    });
  }
}
