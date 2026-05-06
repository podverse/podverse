import { extendMembershipPeriodByMonths } from '@podverse/helpers';

export function assertValidMonthsToAdd(monthsToAdd: number): void {
  if (!Number.isInteger(monthsToAdd) || monthsToAdd < 1) {
    throw new Error('months_to_add must be an integer 1 or larger');
  }
}

export function calculateMembershipExpirationDate(
  membershipExpiresAt: Date | null | undefined,
  monthsToAdd: number,
  now = new Date()
): Date {
  return extendMembershipPeriodByMonths({
    membershipExpiresAt,
    monthsToAdd,
    now,
  });
}
