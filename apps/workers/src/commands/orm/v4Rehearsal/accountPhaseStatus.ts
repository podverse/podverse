import type {
  AccountPhase,
  AccountPhaseStatusValue,
  SetAccountPhaseStatusResult,
} from '@podverse/orm';
import {
  ACCOUNT_PHASE_STATUSES,
  ACCOUNT_PHASES,
  AccountPhaseStatusInputError,
  AccountPhaseStatusService,
} from '@podverse/orm';

export { ACCOUNT_PHASE_STATUSES, ACCOUNT_PHASES, AccountPhaseStatusInputError };
export type { AccountPhase, AccountPhaseStatusValue, SetAccountPhaseStatusResult };

// These functions are how a caller records account phase status.
const accountPhaseStatusService = new AccountPhaseStatusService();

export async function ensureAccountPhaseRows(
  v4UserIds: readonly string[],
  phase: AccountPhase
): Promise<{ inserted: number }> {
  return accountPhaseStatusService.ensureAccountPhaseRows(v4UserIds, phase);
}

export async function setAccountPhaseStatus(input: {
  v4UserId: string;
  phase: AccountPhase;
  status: AccountPhaseStatusValue;
  accountId?: number;
  errorClass?: string | null;
}): Promise<SetAccountPhaseStatusResult> {
  return accountPhaseStatusService.setAccountPhaseStatus(input);
}

export async function setAccountPhaseStatusMany(input: {
  v4UserIds: readonly string[];
  phase: AccountPhase;
  status: AccountPhaseStatusValue;
  errorClass?: string | null;
}): Promise<{ applied: number; refusedDone: number }> {
  return accountPhaseStatusService.setAccountPhaseStatusMany(input);
}

export async function linkAccountPhaseStatus(v4UserId: string, accountId: number): Promise<void> {
  return accountPhaseStatusService.linkAccountPhaseStatus(v4UserId, accountId);
}

export async function listAccountPhaseV4UserIds(
  phase: AccountPhase,
  options: { includeFailed: boolean }
): Promise<string[]> {
  return accountPhaseStatusService.listAccountPhaseV4UserIds(phase, options);
}

export async function listAccountPhaseV4UserIdsByStatus(
  phase: AccountPhase,
  status: AccountPhaseStatusValue
): Promise<string[]> {
  return accountPhaseStatusService.listAccountPhaseV4UserIdsByStatus(phase, status);
}

export async function countAccountPhaseStatus(
  phase: AccountPhase
): Promise<Record<AccountPhaseStatusValue, number>> {
  return accountPhaseStatusService.countAccountPhaseStatus(phase);
}
