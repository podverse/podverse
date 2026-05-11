export type AuthContext =
  | { mode: 'none' }
  | { mode: 'cookie'; cookieName: string; token: string }
  | { mode: 'bearer'; token: string; headerName?: string }
  | { mode: 'headers'; headers: Record<string, string> };

export const toAuthHeaders = (authContext?: AuthContext): Record<string, string> => {
  if (!authContext || authContext.mode === 'none') {
    return {};
  }

  if (authContext.mode === 'cookie') {
    return {
      Cookie: `${authContext.cookieName}=${authContext.token}`,
    };
  }

  if (authContext.mode === 'bearer') {
    return {
      [authContext.headerName ?? 'Authorization']: `Bearer ${authContext.token}`,
    };
  }

  return authContext.headers;
};
