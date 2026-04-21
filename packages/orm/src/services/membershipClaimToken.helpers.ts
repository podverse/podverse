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
  assertValidMonthsToAdd(monthsToAdd);
  const baseDate = membershipExpiresAt ? new Date(membershipExpiresAt) : new Date(now);
  baseDate.setMonth(baseDate.getMonth() + monthsToAdd);
  return baseDate;
}
