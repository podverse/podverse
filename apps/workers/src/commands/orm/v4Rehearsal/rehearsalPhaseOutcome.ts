import type { LegacyMembershipImportCounts } from '../../billing/importLegacyMembershipExpiryLib.js';
import type { V4LibraryCommandResult } from '../v4Library/copyAccountLibrary.js';

export type PhaseErrorLine = {
  group: string | null;
  className: string;
  message: string;
};

export type LibraryPhaseDecision =
  | { status: 'done'; className: null; errors: [] }
  | { status: 'failed' | 'needs_operator'; className: string; errors: PhaseErrorLine[] };

const ERROR_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;
const MAX_ERROR_CLASS_LENGTH = 80;

type MembershipStatus = 'done' | 'failed';

type MembershipMark = {
  status: MembershipStatus;
  className: string | null;
};

type FutureMembershipClass = 'membership_unmatched' | 'membership_ambiguous' | 'membership_invalid';

/**
 * A closed copy is done. A refusal stays failed even when a group is also left for an operator.
 */
export function classifyLibraryResult(result: V4LibraryCommandResult): LibraryPhaseDecision {
  switch (result.action) {
    case 'help':
    case 'dry_run':
      return {
        status: 'failed',
        className: 'unexpected:dry_run',
        errors: [
          { group: null, className: 'unexpected:dry_run', message: 'unexpected:dry_run' },
        ],
      };
    case 'skip_already_copied':
      return doneLibrary();
    case 'skip_missing_account':
      return {
        status: 'failed',
        className: 'missing_v5_account',
        errors: [{ group: null, className: 'missing_v5_account', message: 'no v5 account' }],
      };
    case 'apply':
      return classifyApply(result.apply);
  }
}

export function replayPassFinished(before: number, after: number): boolean {
  return after >= before;
}

export function membershipOutcomes(input: {
  requestedIds: readonly string[];
  missingIds: readonly string[];
  ambiguousIds: readonly string[];
  invalidEmailIds: readonly string[];
  invalidExpiryIds: readonly string[];
  futureIds: readonly string[];
  counts: Pick<LegacyMembershipImportCounts, 'unmatched' | 'ambiguous' | 'invalid'>;
}): Array<{ v4Id: string; status: MembershipStatus; className: string | null }> {
  const byId = new Map<string, MembershipMark>();
  for (const v4Id of input.requestedIds) {
    if (!byId.has(v4Id)) {
      byId.set(v4Id, { status: 'done', className: null });
    }
  }
  markMembershipFailures(byId, input.missingIds, 'missing_v4_account');
  markMembershipFailures(byId, input.ambiguousIds, 'ambiguous_email');
  markMembershipFailures(byId, input.invalidEmailIds, 'invalid_email');
  markMembershipFailures(byId, input.invalidExpiryIds, 'invalid_expiry');
  const futureClass = futureMembershipClass(input.futureIds.length, input.counts);
  if (futureClass !== null) {
    markMembershipFailures(byId, input.futureIds, futureClass);
  }
  return input.requestedIds.map((v4Id) => {
    const mark = byId.get(v4Id);
    if (mark === undefined) {
      return { v4Id, status: 'done', className: null };
    }
    return { v4Id, status: mark.status, className: mark.className };
  });
}

/**
 * Pilot and sample do not request public pages. Full needs one web origin.
 */
export function webOriginForStage(
  stage: 'pilot' | 'sample' | 'full',
  webDomain: string | null
): { samplePublicPaths: boolean; webOrigin: string | null } {
  if (stage === 'pilot' || stage === 'sample') {
    return { samplePublicPaths: false, webOrigin: null };
  }
  if (webDomain === null || webDomain === '') {
    throw new Error('Missing web origin for the public path sample.');
  }
  if (webDomain.includes('@')) {
    throw new Error('invalid_web_origin');
  }
  const withScheme =
    webDomain.startsWith('http://') || webDomain.startsWith('https://')
      ? webDomain
      : `http://${webDomain}`;
  const webOrigin = withScheme.endsWith('/') ? withScheme.slice(0, -1) : withScheme;
  return { samplePublicPaths: true, webOrigin };
}

export function thrownErrorClass(error: unknown): string {
  if (!(error instanceof Error) || !ERROR_NAME.test(error.name)) {
    return 'unexpected:unknown';
  }
  const className = `unexpected:${error.name}`;
  if (className.length > MAX_ERROR_CLASS_LENGTH) {
    return 'unexpected:unknown';
  }
  return className;
}

export function rehearsalPasswordFromEnv(value: string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  return trimmed;
}

export function sweepIdentity(hasAccount: boolean): 'done' | 'left_out' {
  return hasAccount ? 'done' : 'left_out';
}

function doneLibrary(): Extract<LibraryPhaseDecision, { status: 'done' }> {
  const errors: [] = [];
  return { status: 'done', className: null, errors };
}

function classifyApply(
  apply: Extract<V4LibraryCommandResult, { action: 'apply' }>['apply']
): LibraryPhaseDecision {
  const operator = operatorLines(apply.needsOperatorGroups);
  const firstError = apply.groupErrors[0];
  if (firstError !== undefined) {
    return {
      status: 'failed',
      className: firstError.class,
      errors: [
        ...apply.groupErrors.map((error) => ({
          group: error.group,
          className: error.class,
          message: 'copy refused',
        })),
        ...operator,
      ],
    };
  }
  if (operator.length > 0) {
    return { status: 'needs_operator', className: 'needs_operator', errors: operator };
  }
  if (apply.libraryCopiedAtSet) {
    return doneLibrary();
  }
  return {
    status: 'failed',
    className: 'library_not_closed',
    errors: [{ group: null, className: 'library_not_closed', message: 'library not closed' }],
  };
}

function operatorLines(groups: readonly string[]): PhaseErrorLine[] {
  return groups.map((group) => ({
    group,
    className: 'needs_operator',
    message: 'left for operator',
  }));
}

function markMembershipFailures(
  byId: Map<string, MembershipMark>,
  ids: readonly string[],
  className: string
): void {
  for (const id of ids) {
    const mark = byId.get(id);
    if (mark === undefined || mark.status === 'failed') {
      continue;
    }
    mark.status = 'failed';
    mark.className = className;
  }
}

/**
 * One counter equal to the future-id count, with the other two at zero, fails those ids.
 * Any other mix leaves them as they stand.
 */
function futureMembershipClass(
  length: number,
  counts: Pick<LegacyMembershipImportCounts, 'unmatched' | 'ambiguous' | 'invalid'>
): FutureMembershipClass | null {
  if (length <= 0) {
    return null;
  }
  const options: Array<{ className: FutureMembershipClass; value: number }> = [
    { className: 'membership_unmatched', value: counts.unmatched },
    { className: 'membership_ambiguous', value: counts.ambiguous },
    { className: 'membership_invalid', value: counts.invalid },
  ];
  const hits = options.filter((option) => option.value === length);
  const zeros = options.filter((option) => option.value === 0);
  if (hits.length !== 1 || zeros.length !== 2) {
    return null;
  }
  const hit = hits[0];
  if (hit === undefined) {
    return null;
  }
  return hit.className;
}
