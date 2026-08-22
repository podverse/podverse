import { useCallback } from 'react';

import { showToast } from '../components/Toast/Toast';
import { useMembershipGate } from './useMembershipGate';

/**
 * Shared handler for the member-gated "Add to Queue" (Next/Last/Between) row/header actions
 * (Track 19.4 — web parity with mobile queue-add gating).
 *
 * These endpoints are `skipMembershipStatus: false`, so a logged-in expired/insufficient member gets a
 * `membership.*` 403. Each call site previously used `showToastPromise(...)`, which showed the generic
 * `queue.add_error` toast even for a membership denial. `runQueueAdd` awaits the add, routes membership
 * 403s to the shared membership modal (via `useMembershipGate`), and otherwise preserves the prior
 * success/error toast. Callers keep their existing logged-out `login_to_add_to_queue` guard *before*
 * calling this — it only handles logged-in denials in `catch`.
 *
 * `success`/`error` must be pre-translated strings (same values passed to `showToastPromise` today).
 */
export function useQueueAddWithGate(): {
  runQueueAdd: (
    action: () => Promise<unknown>,
    messages: { success: string; error: string }
  ) => Promise<void>;
} {
  const { tryHandleMembershipGateError } = useMembershipGate();

  const runQueueAdd = useCallback(
    async (
      action: () => Promise<unknown>,
      messages: { success: string; error: string }
    ): Promise<void> => {
      try {
        await action();
        showToast(messages.success, 'success');
      } catch (error) {
        if (!tryHandleMembershipGateError(error)) {
          showToast(messages.error, 'error');
        }
      }
    },
    [tryHandleMembershipGateError]
  );

  return { runQueueAdd };
}
