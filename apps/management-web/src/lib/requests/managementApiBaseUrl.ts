import { getConfig } from '../../config';

/** Absolute base URL for management API JSON routes (client runtime). */
export function getManagementApiClientBaseUrl(): string {
  const config = getConfig();
  const { prefix, version } = config.public.api;
  const { protocol, host, port } = config.public.api.client;
  const portPart = port ? `:${port}` : '';
  const basePrefix = `${prefix?.replace(/\/$/, '') || ''}${version || ''}`;
  return `${protocol}://${host}${portPart}${basePrefix}`;
}
