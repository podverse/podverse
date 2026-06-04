export function normalizeApiRequestPath(path: string): string {
  const withoutQuery = path.split('?')[0] ?? path;
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
}

export function isAccountByIdTextApiPath(path: string): boolean {
  const normalized = normalizeApiRequestPath(path);
  return /^\/account\/[^/]+$/.test(normalized);
}
