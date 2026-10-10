import { cookies } from 'next/headers';

import type { DTOAccount } from '@podverse/helpers';
import { AuthCookieName } from '@podverse/helpers';

import { getConfig } from '../../config';
import { getSSRApiRequestService } from '../../factories/apiRequestService';
import { isTermsAcceptanceRequired } from '../../lib/termsAcceptanceRequired';

export async function getSSRJwtFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const jwt = cookieStore.get(AuthCookieName)?.value;
  return jwt;
}

export async function getSSRLoggedInAccount(): Promise<DTOAccount | null> {
  const jwt = await getSSRJwtFromCookies();
  if (!jwt) {
    return null;
  }

  const ssrApiRequestService = getSSRApiRequestService(jwt);

  try {
    return await ssrApiRequestService.reqAuthMe();
  } catch {
    return null;
  }
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

  const configuredTermsVersion = getConfig().public.legal.terms.version;
  let termsAcceptanceRequired = false;
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
