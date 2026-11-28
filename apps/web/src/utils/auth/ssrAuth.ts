import { cookies } from 'next/headers';

import type { AuthSessionEndedNotice, DTOAccount } from '@podverse/helpers';
import { AuthCookieName } from '@podverse/helpers';
import { parseAuthSessionEndedError } from '@podverse/helpers-requests';

import { getConfigResolved } from '../../config/loadPublicClientConfig.server';
import { getSSRApiRequestService } from '../../factories/apiRequestService';
import { isTermsAcceptanceRequired } from '../../lib/termsAcceptanceRequired';

export async function getSSRJwtFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(AuthCookieName)?.value;
  return jwt;
}

export type SSRAuthState = {
  account: DTOAccount | null;
  /** Set when `/auth/me` answered 401 because the session was ended elsewhere. */
  sessionEndedNotice: AuthSessionEndedNotice | null;
};

export async function getSSRAuthState(): Promise<SSRAuthState> {
  const jwt = await getSSRJwtFromCookies();
  if (!jwt) {
    return { account: null, sessionEndedNotice: null };
  }

  const ssrApiRequestService = getSSRApiRequestService(jwt);

  try {
    const account = await ssrApiRequestService.reqAuthMe();
    return { account, sessionEndedNotice: null };
  } catch (error: unknown) {
    return { account: null, sessionEndedNotice: parseAuthSessionEndedError(error) };
  }
}

export async function getSSRLoggedInAccount(): Promise<DTOAccount | null> {
  const { account } = await getSSRAuthState();
  return account;
}

export async function getSSRAuthService(): Promise<{
  isValidAuthSession: boolean;
  termsAcceptanceRequired: boolean;
  ssrApiRequestService: ReturnType<typeof getSSRApiRequestService>;
}> {
  const jwt = await getSSRJwtFromCookies();
  const ssrApiRequestService = getSSRApiRequestService(jwt);
  if (!jwt) {
    return {
      isValidAuthSession: false,
      termsAcceptanceRequired: false,
      ssrApiRequestService,
    };
  }

  try {
    await ssrApiRequestService.reqAuthCheckSession();
  } catch {
    return {
      isValidAuthSession: false,
      termsAcceptanceRequired: false,
      ssrApiRequestService,
    };
  }

  const configuredTermsVersion = (await getConfigResolved()).public.legal.terms.version;
  let termsAcceptanceRequired: boolean;
  try {
    const account = await ssrApiRequestService.reqAuthMe();
    termsAcceptanceRequired = isTermsAcceptanceRequired(account, configuredTermsVersion);
  } catch {
    termsAcceptanceRequired = false;
  }

  return {
    isValidAuthSession: true,
    termsAcceptanceRequired,
    ssrApiRequestService,
  };
}
