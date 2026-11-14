import { describe, expect, it } from 'vitest';

import { classifyIdentityAction } from './identityOutcome.js';

const v4Id = 'abcd123';

describe('classifyIdentityAction', () => {
  it('returns the written account id for create, repair, unchanged, and replace.', () => {
    const written = [
      { action: 'create', accountId: 11 },
      { action: 'repair', accountId: 22 },
      { action: 'unchanged', accountId: 33 },
      { action: 'replace', accountId: 44 },
    ] as const;

    for (const row of written) {
      expect(
        classifyIdentityAction({ action: row.action, v4Id, accountId: row.accountId })
      ).toEqual({
        kind: 'written',
        accountId: row.accountId,
      });
    }
  });

  it('leaves out an email-case twin.', () => {
    expect(classifyIdentityAction({ action: 'skip_case_variant', v4Id })).toEqual({
      kind: 'left_out',
    });
  });

  it('fails a rejected row with that same bad field action.', () => {
    const rejected = ['bad_email', 'bad_name', 'bad_password', 'bad_verified'] as const;

    for (const action of rejected) {
      expect(classifyIdentityAction({ action, v4Id })).toEqual({
        kind: 'failed',
        className: action,
      });
    }
  });

  it('fails an id that already belongs to another account as id_taken.', () => {
    expect(classifyIdentityAction({ action: 'skip_id_taken', v4Id })).toEqual({
      kind: 'failed',
      className: 'id_taken',
    });
  });

  it('fails an address owned by a different account as email_taken.', () => {
    expect(classifyIdentityAction({ action: 'skip_existing_email', v4Id })).toEqual({
      kind: 'failed',
      className: 'email_taken',
    });
  });

  it('fails a copied library, an existing grant, and a conflict with that same action.', () => {
    const blocked = ['skip_library_copied', 'skip_has_grants', 'conflict'] as const;

    for (const action of blocked) {
      expect(classifyIdentityAction({ action, v4Id })).toEqual({
        kind: 'failed',
        className: action,
      });
    }
  });

  it('fails a dry-run action as unexpected:dry_run.', () => {
    const dryRun = ['would_create', 'would_repair', 'would_replace'] as const;

    for (const action of dryRun) {
      expect(classifyIdentityAction({ action, v4Id })).toEqual({
        kind: 'failed',
        className: 'unexpected:dry_run',
      });
    }
  });

  it('fails a help result as unexpected:help.', () => {
    expect(classifyIdentityAction({ action: 'help' })).toEqual({
      kind: 'failed',
      className: 'unexpected:help',
    });
  });
});
