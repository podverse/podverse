import type { V4IdentityCommandResult } from '../v4Identity/seedAccountIdentity.js';

export type IdentityPhaseOutcome =
  | { kind: 'written'; accountId: number }
  | { kind: 'left_out' }
  | { kind: 'failed'; className: string };

/**
 * A written identity keeps the account id from the command. A case twin is left out.
 * An address owned by any other account fails as email_taken.
 */
export function classifyIdentityAction(result: V4IdentityCommandResult): IdentityPhaseOutcome {
  switch (result.action) {
    case 'create':
    case 'repair':
    case 'unchanged':
    case 'replace':
      return { kind: 'written', accountId: result.accountId };
    case 'skip_case_variant':
      return { kind: 'left_out' };
    case 'bad_email':
    case 'bad_name':
    case 'bad_password':
    case 'bad_verified':
      return { kind: 'failed', className: result.action };
    case 'skip_id_taken':
      return { kind: 'failed', className: 'id_taken' };
    case 'skip_existing_email':
      return { kind: 'failed', className: 'email_taken' };
    case 'skip_library_copied':
    case 'skip_has_grants':
    case 'conflict':
      return { kind: 'failed', className: result.action };
    case 'would_create':
    case 'would_repair':
    case 'would_replace':
      return { kind: 'failed', className: 'unexpected:dry_run' };
    case 'help':
      return { kind: 'failed', className: 'unexpected:help' };
  }
}
