import type { BillingCadence } from './billingDomain.js';
import { addUtcMonthsClamped, laterOfDates } from './date.js';

function assertValidMonthsToExtend(monthsToAdd: number): void {
  if (!Number.isInteger(monthsToAdd) || monthsToAdd < 1) {
    throw new Error('months_to_add must be an integer 1 or larger');
  }
}

export function resolveMembershipExtensionBaseDate(
  membershipExpiresAt: Date | null | undefined,
  now = new Date()
): Date {
  const base =
    membershipExpiresAt && membershipExpiresAt.getTime() > now.getTime()
      ? laterOfDates(membershipExpiresAt, now)
      : now;
  return new Date(base.getTime());
}

export function extendMembershipPeriodByMonths(params: {
  membershipExpiresAt: Date | null | undefined;
  monthsToAdd: number;
  now?: Date;
}): Date {
  assertValidMonthsToExtend(params.monthsToAdd);
  const baseDate = resolveMembershipExtensionBaseDate(
    params.membershipExpiresAt,
    params.now ?? new Date()
  );
  return addUtcMonthsClamped(baseDate, params.monthsToAdd);
}

export function extendMembershipPeriodByCadence(params: {
  membershipExpiresAt: Date | null | undefined;
  cadence: BillingCadence;
  now?: Date;
}): Date {
  const monthsToAdd = params.cadence === 'monthly' ? 1 : 12;
  return extendMembershipPeriodByMonths({
    membershipExpiresAt: params.membershipExpiresAt,
    monthsToAdd,
    now: params.now,
  });
}
