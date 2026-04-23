const DEFAULT_INTEGRATION_TEST_EMAIL = 'stats-track-test@example.com';

export type AuthIntegrationAccountGetResult = {
  id: number;
  account_credentials: { email: string };
  account_membership_status: { membership_expires_at: Date };
};

/**
 * Factory for a mock `AccountService#get` used in API integration tests: user `1` with active membership, others `null`.
 */
export function createDefaultAccountGet(
  email: string = DEFAULT_INTEGRATION_TEST_EMAIL
): (
  id: number,
  _options?: { relations?: string[] }
) => Promise<AuthIntegrationAccountGetResult | null> {
  return async (id: number): Promise<AuthIntegrationAccountGetResult | null> => {
    if (id !== 1) {
      return null;
    }
    return {
      id: 1,
      account_credentials: { email },
      account_membership_status: {
        membership_expires_at: new Date(Date.now() + 86400000 * 365),
      },
    };
  };
}

/** Shared mock implementation matching {@link createDefaultAccountGet} defaults. */
export const defaultAccountGet = createDefaultAccountGet();
